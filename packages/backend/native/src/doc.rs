use affine_common::{
  doc_parser::{self, BlockInfo, CrawlResult, MarkdownResult, PageDocContent, WorkspaceDocContent},
  napi_utils::map_napi_err,
};
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi(object)]
pub struct NativeMarkdownResult {
  pub title: String,
  pub markdown: String,
  pub known_unsupported_blocks: Vec<String>,
  pub unknown_blocks: Vec<String>,
}

impl From<MarkdownResult> for NativeMarkdownResult {
  fn from(result: MarkdownResult) -> Self {
    Self {
      title: result.title,
      markdown: result.markdown,
      known_unsupported_blocks: result.known_unsupported_blocks,
      unknown_blocks: result.unknown_blocks,
    }
  }
}

#[napi(object)]
pub struct NativePageDocContent {
  pub title: String,
  pub summary: String,
}

impl From<PageDocContent> for NativePageDocContent {
  fn from(result: PageDocContent) -> Self {
    Self {
      title: result.title,
      summary: result.summary,
    }
  }
}

#[napi(object)]
pub struct NativeWorkspaceDocContent {
  pub name: String,
  pub avatar_key: String,
}

impl From<WorkspaceDocContent> for NativeWorkspaceDocContent {
  fn from(result: WorkspaceDocContent) -> Self {
    Self {
      name: result.name,
      avatar_key: result.avatar_key,
    }
  }
}

#[napi(object)]
pub struct NativeBlockInfo {
  pub block_id: String,
  pub flavour: String,
  pub content: Option<Vec<String>>,
  pub blob: Option<Vec<String>>,
  pub ref_doc_id: Option<Vec<String>>,
  pub ref_info: Option<Vec<String>>,
  pub parent_flavour: Option<String>,
  pub parent_block_id: Option<String>,
  pub additional: Option<String>,
}

impl From<BlockInfo> for NativeBlockInfo {
  fn from(info: BlockInfo) -> Self {
    Self {
      block_id: info.block_id,
      flavour: info.flavour,
      content: info.content,
      blob: info.blob,
      ref_doc_id: info.ref_doc_id,
      ref_info: info.ref_info,
      parent_flavour: info.parent_flavour,
      parent_block_id: info.parent_block_id,
      additional: info.additional,
    }
  }
}

#[napi(object)]
pub struct NativeCrawlResult {
  pub blocks: Vec<NativeBlockInfo>,
  pub title: String,
  pub summary: String,
}

impl From<CrawlResult> for NativeCrawlResult {
  fn from(result: CrawlResult) -> Self {
    Self {
      blocks: result.blocks.into_iter().map(Into::into).collect(),
      title: result.title,
      summary: result.summary,
    }
  }
}

#[napi]
pub fn parse_doc_from_binary(doc_bin: Buffer, doc_id: String) -> Result<NativeCrawlResult> {
  let result = map_napi_err(
    doc_parser::parse_doc_from_binary(doc_bin.into(), doc_id),
    Status::GenericFailure,
  )?;
  Ok(result.into())
}

#[napi]
pub fn parse_page_doc(doc_bin: Buffer, max_summary_length: Option<i32>) -> Result<Option<NativePageDocContent>> {
  let result = map_napi_err(
    doc_parser::parse_page_doc(doc_bin.into(), max_summary_length.map(|v| v as isize)),
    Status::GenericFailure,
  )?;
  Ok(result.map(Into::into))
}

#[napi]
pub fn parse_workspace_doc(doc_bin: Buffer) -> Result<Option<NativeWorkspaceDocContent>> {
  let result = map_napi_err(doc_parser::parse_workspace_doc(doc_bin.into()), Status::GenericFailure)?;
  Ok(result.map(Into::into))
}

#[napi]
pub fn parse_doc_to_markdown(
  doc_bin: Buffer,
  doc_id: String,
  ai_editable: Option<bool>,
  doc_url_prefix: Option<String>,
) -> Result<NativeMarkdownResult> {
  let result = map_napi_err(
    doc_parser::parse_doc_to_markdown(doc_bin.into(), doc_id, ai_editable.unwrap_or(false), doc_url_prefix),
    Status::GenericFailure,
  )?;
  Ok(result.into())
}

#[napi]
pub fn read_all_doc_ids_from_root_doc(doc_bin: Buffer, include_trash: Option<bool>) -> Result<Vec<String>> {
  let result = map_napi_err(
    doc_parser::get_doc_ids_from_binary(doc_bin.into(), include_trash.unwrap_or(false)),
    Status::GenericFailure,
  )?;
  Ok(result)
}

/// Converts markdown content to AFFiNE-compatible y-octo document binary.
///
/// # Arguments
/// * `title` - The document title
/// * `markdown` - The markdown content to convert
/// * `doc_id` - The document ID to use for the y-octo doc
///
/// # Returns
/// A Buffer containing the y-octo document update binary
#[napi]
pub fn create_doc_with_markdown(title: String, markdown: String, doc_id: String) -> Result<Buffer> {
  let result = map_napi_err(
    doc_parser::build_full_doc(&title, &markdown, &doc_id),
    Status::GenericFailure,
  )?;
  Ok(Buffer::from(result))
}

/// Updates an existing document with new markdown content.
/// Uses structural diffing to apply block-level replacements for changes.
///
/// # Arguments
/// * `existing_binary` - The current document binary
/// * `new_markdown` - The new markdown content to apply
/// * `doc_id` - The document ID
///
/// # Returns
/// A Buffer containing only the delta (changes) as a y-octo update binary
#[napi]
pub fn update_doc_with_markdown(existing_binary: Buffer, new_markdown: String, doc_id: String) -> Result<Buffer> {
  let result = map_napi_err(
    doc_parser::update_doc(&existing_binary, &new_markdown, &doc_id),
    Status::GenericFailure,
  )?;
  Ok(Buffer::from(result))
}

/// Updates a document's title without touching content blocks.
///
/// # Arguments
/// * `existing_binary` - The current document binary
/// * `title` - The new title
/// * `doc_id` - The document ID
///
/// # Returns
/// A Buffer containing only the delta (changes) as a y-octo update binary
#[napi]
pub fn update_doc_title(existing_binary: Buffer, title: String, doc_id: String) -> Result<Buffer> {
  let result = map_napi_err(
    doc_parser::update_doc_title(&existing_binary, &doc_id, &title),
    Status::GenericFailure,
  )?;
  Ok(Buffer::from(result))
}

/// Updates or creates the docProperties record for a document.
///
/// # Arguments
/// * `existing_binary` - The current docProperties document binary
/// * `properties_doc_id` - The docProperties document ID
///   (db$${workspaceId}$docProperties)
/// * `target_doc_id` - The document ID to update in docProperties
/// * `created_by` - Optional creator user ID
/// * `updated_by` - Optional updater user ID
///
/// # Returns
/// A Buffer containing only the delta (changes) as a y-octo update binary
#[napi]
pub fn update_doc_properties(
  existing_binary: Buffer,
  properties_doc_id: String,
  target_doc_id: String,
  created_by: Option<String>,
  updated_by: Option<String>,
) -> Result<Buffer> {
  let result = map_napi_err(
    doc_parser::update_doc_properties(
      &existing_binary,
      &properties_doc_id,
      &target_doc_id,
      created_by.as_deref(),
      updated_by.as_deref(),
    ),
    Status::GenericFailure,
  )?;
  Ok(Buffer::from(result))
}

/// Adds a document ID to the workspace root doc's meta.pages array.
/// This registers the document in the workspace so it appears in the UI.
///
/// # Arguments
/// * `root_doc_bin` - The current root doc binary (workspaceId doc)
/// * `doc_id` - The document ID to add
/// * `title` - Optional title for the document
///
/// # Returns
/// A Buffer containing the y-octo update binary to apply to the root doc
#[napi]
pub fn add_doc_to_root_doc(root_doc_bin: Buffer, doc_id: String, title: Option<String>) -> Result<Buffer> {
  let result = map_napi_err(
    doc_parser::add_doc_to_root_doc(root_doc_bin.into(), &doc_id, title.as_deref()),
    Status::GenericFailure,
  )?;
  Ok(Buffer::from(result))
}

/// Updates a document title in the workspace root doc's meta.pages array.
///
/// # Arguments
/// * `root_doc_bin` - The current root doc binary (workspaceId doc)
/// * `doc_id` - The document ID to update
/// * `title` - The new title for the document
///
/// # Returns
/// A Buffer containing the y-octo update binary to apply to the root doc
#[napi]
pub fn update_root_doc_meta_title(root_doc_bin: Buffer, doc_id: String, title: String) -> Result<Buffer> {
  let result = map_napi_err(
    doc_parser::update_root_doc_meta_title(&root_doc_bin, &doc_id, &title),
    Status::GenericFailure,
  )?;
  Ok(Buffer::from(result))
}

// ============================================================================
// Database manipulation functions
// ============================================================================

/// Adds rows to an existing database in a document.
///
/// # Arguments
/// * `existing_binary` - The current document binary
/// * `database_block_id` - The ID of the database block
/// * `rows_json` - JSON array of row data. Each row is an object with column_id -> value mapping.
///   Example: `[{"title": "Task 1", "status": "todo"}, {"title": "Task 2", "status": "done"}]`
///
/// # Returns
/// A Buffer containing the updated document binary
#[napi]
pub fn database_add_rows_native(
  existing_binary: Buffer,
  database_block_id: String,
  rows_json: String,
) -> Result<Buffer> {
  // Parse rows JSON
  let rows_data: serde_json::Value = serde_json::from_str(&rows_json)
    .map_err(|e| napi::Error::new(Status::InvalidArg, format!("Invalid rows JSON: {}", e)))?;

  let rows = parse_rows_from_json(rows_data)?;

  let result = map_napi_err(
    doc_parser::database_add_rows(&existing_binary, &database_block_id, &rows),
    Status::GenericFailure,
  )?;

  Ok(Buffer::from(result.doc_binary))
}

/// Updates cell values in existing database rows.
///
/// # Arguments
/// * `existing_binary` - The current document binary
/// * `database_block_id` - The ID of the database block
/// * `updates_json` - JSON array of updates. Each update is [row_id, column_id, value].
///   Example: `[["row1", "status", "completed"], ["row1", "priority", "high"]]`
///
/// # Returns
/// A Buffer containing the updated document binary
#[napi]
pub fn database_update_cells_native(
  existing_binary: Buffer,
  database_block_id: String,
  updates_json: String,
) -> Result<Buffer> {
  // Parse updates JSON
  let updates_data: serde_json::Value = serde_json::from_str(&updates_json)
    .map_err(|e| napi::Error::new(Status::InvalidArg, format!("Invalid updates JSON: {}", e)))?;

  let updates = parse_updates_from_json(updates_data)?;

  let result = map_napi_err(
    doc_parser::database_update_cells(&existing_binary, &database_block_id, &updates),
    Status::GenericFailure,
  )?;

  Ok(Buffer::from(result))
}

/// Creates a new database block in a document.
///
/// # Arguments
/// * `existing_binary` - Optional current document binary (None for new doc)
/// * `doc_id` - The document ID
/// * `title` - Database title
/// * `columns_json` - JSON array of column definitions.
///   Example: `[{"id": "col1", "name": "Title", "type": "title"}, {"id": "col2", "name": "Status", "type": "select", "options": [{"id": "opt1", "value": "Todo"}]}]`
/// * `views_json` - JSON array of view definitions.
///   Example: `[{"id": "view1", "name": "Table", "view_type": "table"}]`
///
/// # Returns
/// A tuple containing (updated document binary, new database block ID)
#[napi]
pub fn database_create_native(
  existing_binary: Option<Buffer>,
  doc_id: String,
  title: String,
  columns_json: String,
  views_json: String,
) -> Result<DatabaseCreateResult> {
  // Parse columns JSON
  let columns_data: serde_json::Value = serde_json::from_str(&columns_json)
    .map_err(|e| napi::Error::new(Status::InvalidArg, format!("Invalid columns JSON: {}", e)))?;
  let columns = parse_columns_from_json(columns_data)?;

  // Parse views JSON
  let views_data: serde_json::Value = serde_json::from_str(&views_json)
    .map_err(|e| napi::Error::new(Status::InvalidArg, format!("Invalid views JSON: {}", e)))?;
  let views = parse_views_from_json(views_data)?;

  let binary_ref = existing_binary.as_ref().map(|b| b.as_ref());

  let (binary, db_id) = map_napi_err(
    doc_parser::database_create(binary_ref, &doc_id, &title, &columns, &views, None),
    Status::GenericFailure,
  )?;

  Ok(DatabaseCreateResult {
    doc_binary: Buffer::from(binary),
    database_block_id: db_id,
  })
}

/// Result of database creation
#[napi(object)]
pub struct DatabaseCreateResult {
  pub doc_binary: Buffer,
  pub database_block_id: String,
}

// Helper functions to parse JSON

fn parse_rows_from_json(rows: serde_json::Value) -> Result<Vec<doc_parser::DatabaseRowData>> {
  let rows_array = rows
    .as_array()
    .ok_or_else(|| napi::Error::new(Status::InvalidArg, "rows must be an array"))?;

  let mut result = Vec::new();
  for row in rows_array {
    let obj = row
      .as_object()
      .ok_or_else(|| napi::Error::new(Status::InvalidArg, "each row must be an object"))?;

    let mut cells = Vec::new();
    for (column_id, value) in obj {
      let any_value = json_to_any(value)?;
      cells.push(doc_parser::DatabaseCellValue {
        column_id: column_id.clone(),
        value: any_value,
      });
    }

    result.push(doc_parser::DatabaseRowData { cells });
  }

  Ok(result)
}

fn parse_updates_from_json(updates: serde_json::Value) -> Result<Vec<(String, String, y_octo::Any)>> {
  let updates_array = updates
    .as_array()
    .ok_or_else(|| napi::Error::new(Status::InvalidArg, "updates must be an array"))?;

  let mut result = Vec::new();
  for update in updates_array {
    let arr = update
      .as_array()
      .ok_or_else(|| napi::Error::new(Status::InvalidArg, "each update must be [row_id, column_id, value]"))?;

    if arr.len() != 3 {
      return Err(napi::Error::new(
        Status::InvalidArg,
        "each update must have exactly 3 elements",
      ));
    }

    let row_id = arr[0]
      .as_str()
      .ok_or_else(|| napi::Error::new(Status::InvalidArg, "row_id must be a string"))?
      .to_string();

    let column_id = arr[1]
      .as_str()
      .ok_or_else(|| napi::Error::new(Status::InvalidArg, "column_id must be a string"))?
      .to_string();

    let value = json_to_any(&arr[2])?;

    result.push((row_id, column_id, value));
  }

  Ok(result)
}

fn parse_columns_from_json(columns: serde_json::Value) -> Result<Vec<doc_parser::DatabaseColumnDef>> {
  let columns_array = columns
    .as_array()
    .ok_or_else(|| napi::Error::new(Status::InvalidArg, "columns must be an array"))?;

  let mut result = Vec::new();
  for col in columns_array {
    let obj = col
      .as_object()
      .ok_or_else(|| napi::Error::new(Status::InvalidArg, "each column must be an object"))?;

    let id = obj
      .get("id")
      .and_then(|v| v.as_str())
      .ok_or_else(|| napi::Error::new(Status::InvalidArg, "column must have id"))?
      .to_string();

    let name = obj.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();

    let column_type = obj.get("type").and_then(|v| v.as_str()).unwrap_or("text").to_string();

    let options = if let Some(options_val) = obj.get("options") {
      Some(parse_options_from_json(options_val.clone())?)
    } else {
      None
    };

    result.push(doc_parser::DatabaseColumnDef {
      id,
      name,
      column_type,
      options,
    });
  }

  Ok(result)
}

fn parse_options_from_json(options: serde_json::Value) -> Result<Vec<doc_parser::DatabaseColumnOption>> {
  let options_array = options
    .as_array()
    .ok_or_else(|| napi::Error::new(Status::InvalidArg, "options must be an array"))?;

  let mut result = Vec::new();
  for opt in options_array {
    let obj = opt
      .as_object()
      .ok_or_else(|| napi::Error::new(Status::InvalidArg, "each option must be an object"))?;

    let id = obj
      .get("id")
      .and_then(|v| v.as_str())
      .ok_or_else(|| napi::Error::new(Status::InvalidArg, "option must have id"))?
      .to_string();

    let value = obj
      .get("value")
      .and_then(|v| v.as_str())
      .unwrap_or_default()
      .to_string();

    let color = obj.get("color").and_then(|v| v.as_str()).map(|s| s.to_string());

    result.push(doc_parser::DatabaseColumnOption { id, value, color });
  }

  Ok(result)
}

fn parse_views_from_json(views: serde_json::Value) -> Result<Vec<doc_parser::DatabaseViewDef>> {
  let views_array = views
    .as_array()
    .ok_or_else(|| napi::Error::new(Status::InvalidArg, "views must be an array"))?;

  let mut result = Vec::new();
  for view in views_array {
    let obj = view
      .as_object()
      .ok_or_else(|| napi::Error::new(Status::InvalidArg, "each view must be an object"))?;

    let id = obj
      .get("id")
      .and_then(|v| v.as_str())
      .ok_or_else(|| napi::Error::new(Status::InvalidArg, "view must have id"))?
      .to_string();

    let name = obj.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();

    let view_type = obj
      .get("view_type")
      .and_then(|v| v.as_str())
      .unwrap_or("table")
      .to_string();

    result.push(doc_parser::DatabaseViewDef { id, name, view_type });
  }

  Ok(result)
}

fn json_to_any(value: &serde_json::Value) -> Result<y_octo::Any> {
  match value {
    serde_json::Value::Null => Ok(y_octo::Any::Null),
    serde_json::Value::Bool(b) => Ok(if *b { y_octo::Any::True } else { y_octo::Any::False }),
    serde_json::Value::Number(n) => {
      if let Some(i) = n.as_i64() {
        // y_octo::Any::Integer expects i32
        let i32_val: i32 = i
          .try_into()
          .map_err(|_| napi::Error::new(Status::InvalidArg, "integer too large"))?;
        Ok(y_octo::Any::Integer(i32_val))
      } else if let Some(f) = n.as_f64() {
        Ok(y_octo::Any::Float64(f.into()))
      } else {
        Err(napi::Error::new(Status::InvalidArg, "invalid number"))
      }
    }
    serde_json::Value::String(s) => Ok(y_octo::Any::String(s.clone())),
    serde_json::Value::Array(arr) => {
      let any_arr: Result<Vec<y_octo::Any>> = arr.iter().map(json_to_any).collect();
      Ok(y_octo::Any::Array(any_arr?))
    }
    serde_json::Value::Object(obj) => {
      // y_octo uses ahash::HashMap for Object
      let mut any_obj = ahash::HashMap::<String, y_octo::Any>::default();
      for (k, v) in obj {
        any_obj.insert(k.clone(), json_to_any(v)?);
      }
      Ok(y_octo::Any::Object(any_obj))
    }
  }
}

// ============================================================================
// Folder management functions
// ============================================================================

/// Result of folder creation
#[napi(object)]
pub struct FolderCreateResult {
  pub doc_binary: Buffer,
  pub folder_id: String,
}

/// Result of folder operation (move/delete)
#[napi(object)]
pub struct FolderOperationResult {
  pub doc_binary: Buffer,
}

/// Creates a new folder in the folders document.
///
/// # Arguments
/// * `existing_binary` - The current folders document binary
/// * `workspace_id` - The workspace ID (to validate doc_id)
/// * `folder_id` - Optional specific ID to use (generates if not provided)
/// * `name` - The folder name
/// * `parent_id` - Optional parent folder ID (null for root)
///
/// # Returns
/// A struct containing the updated document binary and new folder ID
#[napi]
pub fn folder_create_native(
  existing_binary: Buffer,
  _workspace_id: String,
  folder_id: Option<String>,
  name: String,
  parent_id: Option<String>,
) -> Result<FolderCreateResult> {
  let (binary, folder_id) = map_napi_err(
    doc_parser::folder_create(
      &existing_binary,
      folder_id.as_deref(),
      &name,
      parent_id.as_deref(),
      None,
    ),
    Status::GenericFailure,
  )?;

  Ok(FolderCreateResult {
    doc_binary: Buffer::from(binary),
    folder_id,
  })
}

/// Moves a folder to a different parent.
///
/// # Arguments
/// * `existing_binary` - The current folders document binary
/// * `workspace_id` - The workspace ID (to validate)
/// * `record_id` - The ID of the folder to move
/// * `new_parent_id` - The new parent folder ID (null for root)
///
/// # Returns
/// A Buffer containing the updated document binary
#[napi]
pub fn folder_move_native(
  existing_binary: Buffer,
  _workspace_id: String,
  record_id: String,
  new_parent_id: Option<String>,
) -> Result<Buffer> {
  let binary = map_napi_err(
    doc_parser::folder_move(&existing_binary, &record_id, new_parent_id.as_deref(), None),
    Status::GenericFailure,
  )?;

  Ok(Buffer::from(binary))
}

/// Moves a document to a folder.
///
/// # Arguments
/// * `existing_binary` - The current folders document binary
/// * `workspace_id` - The workspace ID
/// * `doc_id` - The document ID to move
/// * `folder_id` - The target folder ID (null for root)
///
/// # Returns
/// A Buffer containing the updated document binary
#[napi]
pub fn doc_move_to_folder_native(
  existing_binary: Buffer,
  _workspace_id: String,
  doc_id: String,
  folder_id: Option<String>,
) -> Result<Buffer> {
  let binary = map_napi_err(
    doc_parser::doc_move_to_folder(&existing_binary, &doc_id, folder_id.as_deref(), None),
    Status::GenericFailure,
  )?;

  Ok(Buffer::from(binary))
}

/// Deletes a folder (only if empty).
///
/// # Arguments
/// * `existing_binary` - The current folders document binary
/// * `workspace_id` - The workspace ID
/// * `folder_id` - The folder ID to delete
///
/// # Returns
/// A Buffer containing the updated document binary
#[napi]
pub fn folder_delete_native(existing_binary: Buffer, _workspace_id: String, folder_id: String) -> Result<Buffer> {
  let binary = map_napi_err(
    doc_parser::folder_delete(&existing_binary, &folder_id),
    Status::GenericFailure,
  )?;

  Ok(Buffer::from(binary))
}

/// Lists folders and contents in a folder.
///
/// # Arguments
/// * `existing_binary` - The current folders document binary
/// * `workspace_id` - The workspace ID
/// * `parent_id` - Optional parent folder ID (null for root)
///
/// # Returns
/// JSON array of folder records
#[napi]
pub fn folder_list_native(existing_binary: Buffer, _workspace_id: String, parent_id: Option<String>) -> Result<String> {
  let records = map_napi_err(
    doc_parser::folder_list(&existing_binary, parent_id.as_deref()),
    Status::GenericFailure,
  )?;

  serde_json::to_string(&records)
    .map_err(|e| napi::Error::new(Status::GenericFailure, format!("Failed to serialize: {}", e)))
}

/// Gets the complete folder hierarchy.
///
/// # Arguments
/// * `existing_binary` - The current folders document binary
/// * `workspace_id` - The workspace ID
///
/// # Returns
/// JSON array of folder nodes with children
#[napi]
pub fn folder_get_hierarchy_native(existing_binary: Buffer, _workspace_id: String) -> Result<String> {
  let nodes = map_napi_err(
    doc_parser::folder_get_hierarchy(&existing_binary),
    Status::GenericFailure,
  )?;

  serde_json::to_string(&nodes)
    .map_err(|e| napi::Error::new(Status::GenericFailure, format!("Failed to serialize: {}", e)))
}

/// Builds the folders document ID for a workspace.
///
/// # Arguments
/// * `workspace_id` - The workspace ID
///
/// # Returns
/// The folders document ID (db$<workspaceId>$folders)
#[napi]
pub fn build_folders_doc_id_napi(workspace_id: String) -> String {
  doc_parser::build_folders_doc_id(&workspace_id)
}

/// Validates that the document ID is a folders document.
///
/// # Arguments
/// * `doc_id` - The document ID to validate
///
/// # Returns
/// True if this is a valid folders document ID
#[napi]
pub fn is_folders_document_napi(doc_id: String) -> bool {
  doc_parser::is_folders_document(&doc_id)
}

/// Debug: dump raw folder doc structure
#[napi]
pub fn folder_debug_native(existing_binary: Buffer) -> Result<String> {
  map_napi_err(doc_parser::folder_debug(&existing_binary), Status::GenericFailure)
}

// ============================================================================
// Collection management functions
// ============================================================================

/// Result of collection creation
#[napi(object)]
pub struct CollectionCreateResult {
  pub doc_binary: Buffer,
  pub collection_id: String,
}

/// Lists all collections from the workspace root doc.
///
/// # Arguments
/// * `root_doc_binary` - The workspace root doc binary
///
/// # Returns
/// JSON array of collection objects
#[napi]
pub fn collection_list_native(root_doc_binary: Buffer) -> Result<String> {
  let collections = map_napi_err(doc_parser::collection_list(&root_doc_binary), Status::GenericFailure)?;

  serde_json::to_string(&collections)
    .map_err(|e| napi::Error::new(Status::GenericFailure, format!("Failed to serialize: {}", e)))
}

/// Creates a new collection in the workspace root doc.
///
/// # Arguments
/// * `root_doc_binary` - The workspace root doc binary
/// * `collection_id` - Optional specific ID (generates if not provided)
/// * `name` - Collection name
/// * `filters_json` - JSON array of filter params
/// * `allow_list_json` - JSON array of document IDs
///
/// # Returns
/// Updated doc binary and collection ID
#[napi]
pub fn collection_create_native(
  root_doc_binary: Buffer,
  collection_id: Option<String>,
  name: String,
  filters_json: String,
  allow_list_json: String,
) -> Result<CollectionCreateResult> {
  let filters = parse_filters_json(&filters_json)?;
  let allow_list = parse_string_array_json(&allow_list_json)?;

  let (binary, id) = map_napi_err(
    doc_parser::collection_create(&root_doc_binary, collection_id.as_deref(), &name, &filters, &allow_list),
    Status::GenericFailure,
  )?;

  Ok(CollectionCreateResult {
    doc_binary: Buffer::from(binary),
    collection_id: id,
  })
}

/// Updates an existing collection.
///
/// # Arguments
/// * `root_doc_binary` - The workspace root doc binary
/// * `collection_id` - The collection ID to update
/// * `name` - Optional new name
/// * `filters_json` - Optional JSON array of filter params
/// * `allow_list_json` - Optional JSON array of document IDs
///
/// # Returns
/// Updated doc binary
#[napi]
pub fn collection_update_native(
  root_doc_binary: Buffer,
  collection_id: String,
  name: Option<String>,
  filters_json: Option<String>,
  allow_list_json: Option<String>,
) -> Result<Buffer> {
  let filters = filters_json.as_ref().map(|j| parse_filters_json(j)).transpose()?;
  let allow_list = allow_list_json
    .as_ref()
    .map(|j| parse_string_array_json(j))
    .transpose()?;

  let binary = map_napi_err(
    doc_parser::collection_update(
      &root_doc_binary,
      &collection_id,
      name.as_deref(),
      filters.as_deref(),
      allow_list.as_deref(),
    ),
    Status::GenericFailure,
  )?;

  Ok(Buffer::from(binary))
}

/// Deletes a collection by ID.
///
/// # Arguments
/// * `root_doc_binary` - The workspace root doc binary
/// * `collection_id` - The collection ID to delete
///
/// # Returns
/// Updated doc binary
#[napi]
pub fn collection_delete_native(root_doc_binary: Buffer, collection_id: String) -> Result<Buffer> {
  let binary = map_napi_err(
    doc_parser::collection_delete(&root_doc_binary, &collection_id),
    Status::GenericFailure,
  )?;

  Ok(Buffer::from(binary))
}

/// Adds document IDs to a collection's allowList.
///
/// # Arguments
/// * `root_doc_binary` - The workspace root doc binary
/// * `collection_id` - The collection ID
/// * `doc_ids_json` - JSON array of document IDs to add
///
/// # Returns
/// Updated doc binary
#[napi]
pub fn collection_add_docs_native(
  root_doc_binary: Buffer,
  collection_id: String,
  doc_ids_json: String,
) -> Result<Buffer> {
  let doc_ids = parse_string_array_json(&doc_ids_json)?;

  let binary = map_napi_err(
    doc_parser::collection_add_docs(&root_doc_binary, &collection_id, &doc_ids),
    Status::GenericFailure,
  )?;

  Ok(Buffer::from(binary))
}

/// Removes document IDs from a collection's allowList.
///
/// # Arguments
/// * `root_doc_binary` - The workspace root doc binary
/// * `collection_id` - The collection ID
/// * `doc_ids_json` - JSON array of document IDs to remove
///
/// # Returns
/// Updated doc binary
#[napi]
pub fn collection_remove_docs_native(
  root_doc_binary: Buffer,
  collection_id: String,
  doc_ids_json: String,
) -> Result<Buffer> {
  let doc_ids = parse_string_array_json(&doc_ids_json)?;

  let binary = map_napi_err(
    doc_parser::collection_remove_docs(&root_doc_binary, &collection_id, &doc_ids),
    Status::GenericFailure,
  )?;

  Ok(Buffer::from(binary))
}

// Collection JSON helpers

fn parse_filters_json(json: &str) -> Result<Vec<doc_parser::FilterParams>> {
  let data: serde_json::Value = serde_json::from_str(json)
    .map_err(|e| napi::Error::new(Status::InvalidArg, format!("Invalid filters JSON: {}", e)))?;

  let arr = data
    .as_array()
    .ok_or_else(|| napi::Error::new(Status::InvalidArg, "filters must be an array"))?;

  let mut result = Vec::new();
  for item in arr {
    let obj = item
      .as_object()
      .ok_or_else(|| napi::Error::new(Status::InvalidArg, "each filter must be an object"))?;

    let filter_type = obj
      .get("type")
      .and_then(|v| v.as_str())
      .ok_or_else(|| napi::Error::new(Status::InvalidArg, "filter must have type"))?
      .to_string();

    let key = obj
      .get("key")
      .and_then(|v| v.as_str())
      .ok_or_else(|| napi::Error::new(Status::InvalidArg, "filter must have key"))?
      .to_string();

    let method = obj
      .get("method")
      .and_then(|v| v.as_str())
      .ok_or_else(|| napi::Error::new(Status::InvalidArg, "filter must have method"))?
      .to_string();

    let value = obj.get("value").and_then(|v| v.as_str()).map(|s| s.to_string());

    result.push(doc_parser::FilterParams {
      filter_type,
      key,
      method,
      value,
    });
  }

  Ok(result)
}

fn parse_string_array_json(json: &str) -> Result<Vec<String>> {
  let data: serde_json::Value = serde_json::from_str(json)
    .map_err(|e| napi::Error::new(Status::InvalidArg, format!("Invalid JSON array: {}", e)))?;

  let arr = data
    .as_array()
    .ok_or_else(|| napi::Error::new(Status::InvalidArg, "must be an array"))?;

  arr
    .iter()
    .map(|v| {
      v.as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| napi::Error::new(Status::InvalidArg, "array items must be strings"))
    })
    .collect()
}
