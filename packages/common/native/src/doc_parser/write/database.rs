//! Database manipulation for Yjs documents
//!
//! Provides functions to:
//! - Add rows to existing databases
//! - Update cell values
//! - Create new database blocks

use y_octo::{Any, Doc, DocOptions, Map, Value};

use crate::doc_parser::{
  schema::{SYS_CHILDREN, SYS_FLAVOUR, SYS_VERSION},
  value::value_to_string,
};

use super::{
  ParseError,
  builder::{insert_block_map, insert_children, insert_sys_fields},
};

const DATABASE_FLAVOUR: &str = "affine:database";
const DATABASE_VERSION: i32 = 3;
const PARAGRAPH_FLAVOUR: &str = "affine:paragraph";
const PROP_TITLE: &str = "prop:title";
const PROP_COLUMNS: &str = "prop:columns";
const PROP_CELLS: &str = "prop:cells";
const PROP_VIEWS: &str = "prop:views";

/// Cell value for a database
#[derive(Debug, Clone)]
pub struct DatabaseCellValue {
  pub column_id: String,
  pub value: Any,
}

/// Row data for database insertion
#[derive(Debug, Clone)]
pub struct DatabaseRowData {
  pub cells: Vec<DatabaseCellValue>,
}

/// Column definition for new databases
#[derive(Debug, Clone)]
pub struct DatabaseColumnDef {
  pub id: String,
  pub name: String,
  pub column_type: String,
  pub options: Option<Vec<DatabaseColumnOption>>,
}

/// Option for select/multi-select columns
#[derive(Debug, Clone)]
pub struct DatabaseColumnOption {
  pub id: String,
  pub value: String,
  pub color: Option<String>,
}

/// View definition for databases
#[derive(Debug, Clone)]
pub struct DatabaseViewDef {
  pub id: String,
  pub name: String,
  pub view_type: String, // "table" or "kanban"
}

/// Information about a created/updated database
#[derive(Debug)]
pub struct DatabaseUpdateResult {
  pub doc_binary: Vec<u8>,
  pub database_block_id: String,
  pub rows_added: Vec<String>, // row IDs
}

/// Add rows to an existing database in a document
///
/// # Arguments
/// * `existing_binary` - The current document binary
/// * `database_block_id` - The ID of the database block to add rows to
/// * `rows` - The row data to add
///
/// # Returns
/// Updated document binary
pub fn database_add_rows(
  existing_binary: &[u8],
  database_block_id: &str,
  rows: &[DatabaseRowData],
) -> Result<DatabaseUpdateResult, ParseError> {
  // Load existing document
  let mut doc = DocOptions::new().build();
  doc
    .apply_update_from_binary_v1(existing_binary)
    .map_err(|e| ParseError::ParserError(format!("Failed to load doc: {}", e)))?;

  let mut blocks_map = doc
    .get_map("blocks")
    .map_err(|e| ParseError::ParserError(format!("No blocks map: {}", e)))?;

  // Find the database block
  let mut database_block = find_database_block(&blocks_map, database_block_id)?;

  // Get existing columns for validation
  let existing_columns = get_database_columns(&database_block)?;
  let column_ids: std::collections::HashSet<String> = existing_columns.iter().map(|c| c.id.clone()).collect();

  // Get the database block's sys:children array to register new rows
  let mut db_children = database_block
    .get(SYS_CHILDREN)
    .and_then(|v| v.to_array())
    .ok_or_else(|| ParseError::ParserError("Database block has no sys:children".into()))?;

  // Get cells map from database block
  let mut cells_map = get_or_create_cells_map(&doc, &mut database_block)
    .map_err(|e| ParseError::ParserError(format!("Failed to get cells map: {}", e)))?;

  let mut added_row_ids = Vec::new();

  // Add each row
  for row_data in rows {
    // Create paragraph block for the row
    let row_block_id = nanoid::nanoid!();
    let mut row_block = insert_block_map(&doc, &mut blocks_map, &row_block_id)
      .map_err(|e| ParseError::ParserError(format!("Failed to insert block: {}", e)))?;

    insert_sys_fields(&mut row_block, &row_block_id, PARAGRAPH_FLAVOUR)
      .map_err(|e| ParseError::ParserError(format!("Failed to insert sys fields: {}", e)))?;
    insert_children(&doc, &mut row_block, &[])
      .map_err(|e| ParseError::ParserError(format!("Failed to insert children: {}", e)))?;

    // Register row in database's sys:children
    db_children
      .push(row_block_id.clone())
      .map_err(|e| ParseError::ParserError(format!("Failed to push to children: {}", e)))?;

    // For title column, set prop:text on paragraph (not prop:title)
    if let Some(title_cell) = row_data.cells.iter().find(|c| {
      existing_columns
        .iter()
        .any(|col| col.id == c.column_id && col.column_type == "title")
    }) {
      if let Any::String(text) = &title_cell.value {
        let mut text_obj = doc
          .create_text()
          .map_err(|e| ParseError::ParserError(format!("Failed to create text: {}", e)))?;
        text_obj
          .apply_delta(&[y_octo::TextDeltaOp::Insert {
            insert: y_octo::TextInsert::Text(text.clone()),
            format: None,
          }])
          .map_err(|e| ParseError::ParserError(format!("Failed to apply delta: {}", e)))?;
        row_block
          .insert("prop:text".to_string(), Value::Text(text_obj))
          .map_err(|e| ParseError::ParserError(format!("Failed to insert text: {}", e)))?;
      }
    }

    // Insert cells data
    let mut row_cells_map = doc
      .create_map()
      .map_err(|e| ParseError::ParserError(format!("Failed to create row cells map: {}", e)))?;
    for cell in &row_data.cells {
      // Validate column exists
      if !column_ids.contains(&cell.column_id) {
        return Err(ParseError::ParserError(format!(
          "Column {} does not exist in database",
          cell.column_id
        )));
      }

      let mut cell_map = doc
        .create_map()
        .map_err(|e| ParseError::ParserError(format!("Failed to create cell map: {}", e)))?;
      cell_map
        .insert("columnId".to_string(), Any::String(cell.column_id.clone()))
        .map_err(|e| ParseError::ParserError(format!("Failed to insert columnId: {}", e)))?;
      cell_map
        .insert("value".to_string(), cell.value.clone())
        .map_err(|e| ParseError::ParserError(format!("Failed to insert value: {}", e)))?;
      row_cells_map
        .insert(cell.column_id.clone(), Value::Map(cell_map))
        .map_err(|e| ParseError::ParserError(format!("Failed to insert cell: {}", e)))?;
    }

    cells_map
      .insert(row_block_id.clone(), Value::Map(row_cells_map))
      .map_err(|e| ParseError::ParserError(format!("Failed to insert row cells: {}", e)))?;

    added_row_ids.push(row_block_id);
  }

  // Encode result
  let result = DatabaseUpdateResult {
    doc_binary: doc
      .encode_update_v1()
      .map_err(|e| ParseError::ParserError(format!("Failed to encode update: {}", e)))?,
    database_block_id: database_block_id.to_string(),
    rows_added: added_row_ids,
  };

  Ok(result)
}

/// Update cell values in existing database rows
///
/// # Arguments
/// * `existing_binary` - The current document binary
/// * `database_block_id` - The ID of the database block
/// * `updates` - Vector of (row_id, column_id, new_value) tuples
///
/// # Returns
/// Updated document binary
pub fn database_update_cells(
  existing_binary: &[u8],
  database_block_id: &str,
  updates: &[(String, String, Any)], // (row_id, column_id, new_value)
) -> Result<Vec<u8>, ParseError> {
  // Load existing document
  let mut doc = DocOptions::new().build();
  doc
    .apply_update_from_binary_v1(existing_binary)
    .map_err(|e| ParseError::ParserError(format!("Failed to load doc: {}", e)))?;

  let blocks_map = doc
    .get_map("blocks")
    .map_err(|e| ParseError::ParserError(format!("No blocks map: {}", e)))?;

  // Find the database block
  let mut cells_map = {
    let mut database_block = find_database_block(&blocks_map, database_block_id)?;
    get_or_create_cells_map(&doc, &mut database_block)
      .map_err(|e| ParseError::ParserError(format!("Failed to get cells map: {}", e)))?
  };

  // Update each cell
  for (row_id, column_id, new_value) in updates {
    // Get or create row cells map
    let row_key = row_id.clone();
    let mut row_cells = if let Some(val) = cells_map.get(&row_key) {
      val
        .to_map()
        .ok_or_else(|| ParseError::ParserError(format!("Row {} cells is not a map", row_id)))?
    } else {
      let new_map = doc
        .create_map()
        .map_err(|e| ParseError::ParserError(format!("Failed to create new map: {}", e)))?;
      cells_map
        .insert(row_key.clone(), Value::Map(new_map.clone()))
        .map_err(|e| ParseError::ParserError(format!("Failed to insert row: {}", e)))?;
      new_map
    };

    // Get or create cell
    let mut cell = if let Some(val) = row_cells.get(column_id) {
      val
        .to_map()
        .ok_or_else(|| ParseError::ParserError(format!("Cell {} is not a map", column_id)))?
    } else {
      let new_map = doc
        .create_map()
        .map_err(|e| ParseError::ParserError(format!("Failed to create cell map: {}", e)))?;
      row_cells
        .insert(column_id.clone(), Value::Map(new_map.clone()))
        .map_err(|e| ParseError::ParserError(format!("Failed to insert cell: {}", e)))?;
      new_map
    };

    // Update value
    cell
      .insert("value".to_string(), new_value.clone())
      .map_err(|e| ParseError::ParserError(format!("Failed to insert value: {}", e)))?;
    cell
      .insert("columnId".to_string(), Any::String(column_id.clone()))
      .map_err(|e| ParseError::ParserError(format!("Failed to insert columnId: {}", e)))?;
  }

  // Note: in Yjs/CRDT, the changes are already applied to the document
  // The cells_map is a reference to the document's data, so modifications
  // are automatically reflected in the doc

  doc
    .encode_update_v1()
    .map_err(|e| ParseError::ParserError(format!("Failed to encode update: {}", e)))
}

/// Create a new database block in a document
///
/// # Arguments
/// * `existing_binary` - The current document binary (can be empty for new doc)
/// * `doc_id` - The document ID
/// * `title` - Database title
/// * `columns` - Column definitions
/// * `views` - View definitions (at least one required)
/// * `parent_note_id` - ID of the parent note block
///
/// # Returns
/// Updated document binary and the new database block ID
pub fn database_create(
  existing_binary: Option<&[u8]>,
  doc_id: &str,
  title: &str,
  columns: &[DatabaseColumnDef],
  views: &[DatabaseViewDef],
  _parent_note_id: Option<&str>,
) -> Result<(Vec<u8>, String), ParseError> {
  let doc = if let Some(binary) = existing_binary {
    let mut d = DocOptions::new().build();
    d.apply_update_from_binary_v1(binary)
      .map_err(|e| ParseError::ParserError(format!("Failed to load doc: {}", e)))?;
    d
  } else {
    DocOptions::new().with_guid(doc_id.to_string()).build()
  };

  let mut blocks_map = doc
    .get_or_create_map("blocks")
    .map_err(|e| ParseError::ParserError(format!("Failed to create blocks map: {}", e)))?;

  // Create the database block
  let database_block_id = nanoid::nanoid!();
  let mut database_block = insert_block_map(&doc, &mut blocks_map, &database_block_id)
    .map_err(|e| ParseError::ParserError(format!("Failed to insert database block: {}", e)))?;

  // Insert system fields
  insert_sys_fields(&mut database_block, &database_block_id, DATABASE_FLAVOUR)
    .map_err(|e| ParseError::ParserError(format!("Failed to insert sys fields: {}", e)))?;
  database_block
    .insert(SYS_VERSION.to_string(), Any::Integer(DATABASE_VERSION))
    .map_err(|e| ParseError::ParserError(format!("Failed to insert version: {}", e)))?;
  insert_children(&doc, &mut database_block, &[])
    .map_err(|e| ParseError::ParserError(format!("Failed to insert children: {}", e)))?;

  // Set title
  if !title.is_empty() {
    let mut text_obj = doc
      .create_text()
      .map_err(|e| ParseError::ParserError(format!("Failed to create text: {}", e)))?;
    text_obj
      .apply_delta(&[y_octo::TextDeltaOp::Insert {
        insert: y_octo::TextInsert::Text(title.to_string()),
        format: None,
      }])
      .map_err(|e| ParseError::ParserError(format!("Failed to apply delta: {}", e)))?;
    database_block
      .insert(PROP_TITLE.to_string(), Value::Text(text_obj))
      .map_err(|e| ParseError::ParserError(format!("Failed to insert title: {}", e)))?;
  }

  // Set columns
  let mut columns_array = doc
    .create_array()
    .map_err(|e| ParseError::ParserError(format!("Failed to create columns array: {}", e)))?;
  for col in columns {
    let mut col_map = doc
      .create_map()
      .map_err(|e| ParseError::ParserError(format!("Failed to create column map: {}", e)))?;
    col_map
      .insert("id".to_string(), Any::String(col.id.clone()))
      .map_err(|e| ParseError::ParserError(format!("Failed to insert id: {}", e)))?;
    col_map
      .insert("name".to_string(), Any::String(col.name.clone()))
      .map_err(|e| ParseError::ParserError(format!("Failed to insert name: {}", e)))?;
    col_map
      .insert("type".to_string(), Any::String(col.column_type.clone()))
      .map_err(|e| ParseError::ParserError(format!("Failed to insert type: {}", e)))?;

    // Type-specific data
    let mut data_map = doc
      .create_map()
      .map_err(|e| ParseError::ParserError(format!("Failed to create data map: {}", e)))?;
    if let Some(options) = &col.options {
      let mut options_array = doc
        .create_array()
        .map_err(|e| ParseError::ParserError(format!("Failed to create options array: {}", e)))?;
      for opt in options {
        let mut opt_map = doc
          .create_map()
          .map_err(|e| ParseError::ParserError(format!("Failed to create option map: {}", e)))?;
        opt_map
          .insert("id".to_string(), Any::String(opt.id.clone()))
          .map_err(|e| ParseError::ParserError(format!("Failed to insert option id: {}", e)))?;
        opt_map
          .insert("value".to_string(), Any::String(opt.value.clone()))
          .map_err(|e| ParseError::ParserError(format!("Failed to insert option value: {}", e)))?;
        if let Some(color) = &opt.color {
          opt_map
            .insert("color".to_string(), Any::String(color.clone()))
            .map_err(|e| ParseError::ParserError(format!("Failed to insert option color: {}", e)))?;
        }
        options_array
          .push(Value::Map(opt_map))
          .map_err(|e| ParseError::ParserError(format!("Failed to push option: {}", e)))?;
      }
      data_map
        .insert("options".to_string(), Value::Array(options_array))
        .map_err(|e| ParseError::ParserError(format!("Failed to insert options: {}", e)))?;
    }

    // Add empty name for compatibility
    let mut name_text = doc
      .create_text()
      .map_err(|e| ParseError::ParserError(format!("Failed to create name text: {}", e)))?;
    name_text
      .apply_delta(&[y_octo::TextDeltaOp::Insert {
        insert: y_octo::TextInsert::Text(col.name.clone()),
        format: None,
      }])
      .map_err(|e| ParseError::ParserError(format!("Failed to apply name delta: {}", e)))?;
    data_map
      .insert("name".to_string(), Value::Text(name_text))
      .map_err(|e| ParseError::ParserError(format!("Failed to insert name: {}", e)))?;

    col_map
      .insert("data".to_string(), Value::Map(data_map))
      .map_err(|e| ParseError::ParserError(format!("Failed to insert data: {}", e)))?;
    columns_array
      .push(Value::Map(col_map))
      .map_err(|e| ParseError::ParserError(format!("Failed to push column: {}", e)))?;
  }
  database_block
    .insert(PROP_COLUMNS.to_string(), Value::Array(columns_array))
    .map_err(|e| ParseError::ParserError(format!("Failed to insert columns: {}", e)))?;

  // Set empty cells
  let cells_map = doc
    .create_map()
    .map_err(|e| ParseError::ParserError(format!("Failed to create cells map: {}", e)))?;
  database_block
    .insert(PROP_CELLS.to_string(), Value::Map(cells_map))
    .map_err(|e| ParseError::ParserError(format!("Failed to insert cells: {}", e)))?;

  // Set views
  let mut views_array = doc
    .create_array()
    .map_err(|e| ParseError::ParserError(format!("Failed to create views array: {}", e)))?;
  for view in views {
    let mut view_map = doc
      .create_map()
      .map_err(|e| ParseError::ParserError(format!("Failed to create view map: {}", e)))?;
    view_map
      .insert("id".to_string(), Any::String(view.id.clone()))
      .map_err(|e| ParseError::ParserError(format!("Failed to insert view id: {}", e)))?;
    view_map
      .insert("name".to_string(), Any::String(view.name.clone()))
      .map_err(|e| ParseError::ParserError(format!("Failed to insert view name: {}", e)))?;

    // View data
    let mut data_map = doc
      .create_map()
      .map_err(|e| ParseError::ParserError(format!("Failed to create view data map: {}", e)))?;
    let mode = match view.view_type.as_str() {
      "kanban" => "kanban",
      _ => "table",
    };
    data_map
      .insert("mode".to_string(), Any::String(mode.to_string()))
      .map_err(|e| ParseError::ParserError(format!("Failed to insert mode: {}", e)))?;

    // Add name text
    let mut name_text = doc
      .create_text()
      .map_err(|e| ParseError::ParserError(format!("Failed to create view name text: {}", e)))?;
    name_text
      .apply_delta(&[y_octo::TextDeltaOp::Insert {
        insert: y_octo::TextInsert::Text(view.name.clone()),
        format: None,
      }])
      .map_err(|e| ParseError::ParserError(format!("Failed to apply view name delta: {}", e)))?;
    data_map
      .insert("name".to_string(), Value::Text(name_text))
      .map_err(|e| ParseError::ParserError(format!("Failed to insert view name: {}", e)))?;

    view_map
      .insert("data".to_string(), Value::Map(data_map))
      .map_err(|e| ParseError::ParserError(format!("Failed to insert view data: {}", e)))?;
    views_array
      .push(Value::Map(view_map))
      .map_err(|e| ParseError::ParserError(format!("Failed to push view: {}", e)))?;
  }
  database_block
    .insert(PROP_VIEWS.to_string(), Value::Array(views_array))
    .map_err(|e| ParseError::ParserError(format!("Failed to insert views: {}", e)))?;

  // Note: The changes are already applied to the document through the Map references
  // We just need to encode the update

  let binary = doc
    .encode_update_v1()
    .map_err(|e| ParseError::ParserError(format!("Failed to encode update: {}", e)))?;

  Ok((binary, database_block_id))
}

// Helper functions

fn find_database_block(blocks_map: &Map, database_block_id: &str) -> Result<Map, ParseError> {
  let block = blocks_map
    .get(database_block_id)
    .and_then(|v| v.to_map())
    .ok_or_else(|| ParseError::ParserError(format!("Database block {} not found", database_block_id)))?;

  // Verify it's a database block
  let flavour = block
    .get(SYS_FLAVOUR)
    .and_then(|v| value_to_string(&v))
    .ok_or_else(|| ParseError::ParserError("Block has no flavour".into()))?;

  if flavour != DATABASE_FLAVOUR {
    return Err(ParseError::ParserError(format!(
      "Block {} is not a database (flavour: {})",
      database_block_id, flavour
    )));
  }

  Ok(block)
}

fn get_database_columns(database_block: &Map) -> Result<Vec<DatabaseColumnDef>, ParseError> {
  let columns_array = database_block
    .get(PROP_COLUMNS)
    .and_then(|v| v.to_array())
    .ok_or_else(|| ParseError::ParserError("Database has no columns".into()))?;

  let mut columns = Vec::new();
  for col_value in columns_array.iter() {
    if let Some(col_map) = col_value.to_map() {
      let id = col_map
        .get("id")
        .and_then(|v| value_to_string(&v))
        .ok_or_else(|| ParseError::ParserError("Column has no id".into()))?;
      let name = col_map
        .get("name")
        .and_then(|v| value_to_string(&v))
        .unwrap_or_default();
      let column_type = col_map
        .get("type")
        .and_then(|v| value_to_string(&v))
        .unwrap_or_else(|| "text".to_string());

      // Parse options if present
      let options = if let Some(data) = col_map.get("data").and_then(|v| v.to_map()) {
        if let Some(opts_array) = data.get("options").and_then(|v| v.to_array()) {
          let mut opts = Vec::new();
          for opt_val in opts_array.iter() {
            if let Some(opt_map) = opt_val.to_map() {
              if let Some(id) = opt_map.get("id").and_then(|v| value_to_string(&v)) {
                let value = opt_map
                  .get("value")
                  .and_then(|v| value_to_string(&v))
                  .unwrap_or_default();
                let color = opt_map.get("color").and_then(|v| value_to_string(&v));
                opts.push(DatabaseColumnOption { id, value, color });
              }
            }
          }
          Some(opts)
        } else {
          None
        }
      } else {
        None
      };

      columns.push(DatabaseColumnDef {
        id,
        name,
        column_type,
        options,
      });
    }
  }

  Ok(columns)
}

fn get_or_create_cells_map(doc: &Doc, database_block: &mut Map) -> Result<Map, ParseError> {
  if let Some(cells_val) = database_block.get(PROP_CELLS) {
    if let Some(cells_map) = cells_val.to_map() {
      return Ok(cells_map);
    }
  }
  // Create new cells map and attach it to the database block
  let new_map = doc
    .create_map()
    .map_err(|e| ParseError::ParserError(format!("Failed to create cells map: {}", e)))?;
  database_block
    .insert(PROP_CELLS.to_string(), Value::Map(new_map.clone()))
    .map_err(|e| ParseError::ParserError(format!("Failed to attach cells map: {}", e)))?;
  Ok(new_map)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_database_create() {
    let columns = vec![
      DatabaseColumnDef {
        id: "col1".to_string(),
        name: "Title".to_string(),
        column_type: "title".to_string(),
        options: None,
      },
      DatabaseColumnDef {
        id: "col2".to_string(),
        name: "Status".to_string(),
        column_type: "select".to_string(),
        options: Some(vec![DatabaseColumnOption {
          id: "opt1".to_string(),
          value: "Todo".to_string(),
          color: Some("red".to_string()),
        }]),
      },
    ];

    let views = vec![DatabaseViewDef {
      id: "view1".to_string(),
      name: "Table View".to_string(),
      view_type: "table".to_string(),
    }];

    let result = database_create(None, "test-doc", "Tasks", &columns, &views, None);
    assert!(result.is_ok(), "Database creation failed: {:?}", result.err());

    let (binary, db_id) = result.unwrap();
    assert!(!binary.is_empty());
    assert!(!db_id.is_empty());
  }

  #[test]
  fn test_database_add_rows() {
    // First create a database
    let columns = vec![DatabaseColumnDef {
      id: "title".to_string(),
      name: "Title".to_string(),
      column_type: "title".to_string(),
      options: None,
    }];

    let views = vec![DatabaseViewDef {
      id: "view1".to_string(),
      name: "Table".to_string(),
      view_type: "table".to_string(),
    }];

    let (binary, db_id) = database_create(None, "test-doc", "Tasks", &columns, &views, None).unwrap();

    // Now add rows
    let rows = vec![DatabaseRowData {
      cells: vec![DatabaseCellValue {
        column_id: "title".to_string(),
        value: Any::String("Test Task".to_string()),
      }],
    }];

    let result = database_add_rows(&binary, &db_id, &rows);
    assert!(result.is_ok(), "Add rows failed: {:?}", result.err());

    let update = result.unwrap();
    assert_eq!(update.rows_added.len(), 1);
  }
}
