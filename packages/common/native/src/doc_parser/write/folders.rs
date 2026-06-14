//! Folder management for Yjs documents
//!
//! Provides functions to:
//! - Create folders
//! - Move documents between folders
//! - List folder structure
//! - Delete folders (with safety checks)
//!
//! Folders are stored in the `db$<workspaceId>$folders` document.
//! Each record is a top-level YMap in the doc, keyed by its nanoid ID.
//! Fields: id, parentId, data, type, index, $$DELETED

use y_octo::{Any, Doc, DocOptions, Map, Value};

use super::ParseError;

const FOLDER_TYPE: &str = "folder";
const DOC_TYPE: &str = "doc";
const TAG_TYPE: &str = "tag";
const COLLECTION_TYPE: &str = "collection";
const DELETED_FLAG: &str = "$$DELETED";

const FOLDERS_DOC_PREFIX: &str = "db$";
const FOLDERS_DOC_SUFFIX: &str = "$folders";

/// Folder record structure
#[derive(Debug, Clone, serde::Serialize)]
pub struct FolderRecord {
  pub id: String,
  pub parent_id: Option<String>,
  pub data: String,
  pub record_type: String,
  pub index: String,
}

/// Tree node for folder hierarchy
#[derive(Debug, Clone, serde::Serialize)]
pub struct FolderNode {
  pub record: FolderRecord,
  pub children: Vec<FolderNode>,
  pub docs: Vec<FolderRecord>,
}

/// Create a new folder
pub fn folder_create(
  existing_binary: &[u8],
  folder_id: Option<&str>,
  name: &str,
  parent_id: Option<&str>,
  index: Option<&str>,
) -> Result<(Vec<u8>, String), ParseError> {
  if name.is_empty() {
    return Err(ParseError::ParserError("Folder name cannot be empty".into()));
  }

  let folder_id = folder_id.map(|s| s.to_string()).unwrap_or_else(|| nanoid::nanoid!());

  let index = index.map(|s| s.to_string()).unwrap_or_else(generate_fractional_index);

  let doc = load_doc(existing_binary)?;

  // Check for duplicate folder name in same parent
  let all_records = read_all_records(&doc);
  for record in &all_records {
    if record.record_type == FOLDER_TYPE
      && record.data.eq_ignore_ascii_case(name)
      && record.parent_id.as_deref() == parent_id
    {
      return Err(ParseError::ParserError(format!(
        "Folder '{}' already exists in this location",
        name
      )));
    }
  }

  // Create folder as top-level YMap keyed by its ID
  let mut record_map = doc
    .get_or_create_map(&folder_id)
    .map_err(|e| ParseError::ParserError(format!("Failed to create folder map: {}", e)))?;

  record_map
    .insert("id".to_string(), Any::String(folder_id.clone()))
    .map_err(|e| ParseError::ParserError(format!("Failed to insert id: {}", e)))?;
  record_map
    .insert(
      "parentId".to_string(),
      match parent_id {
        Some(pid) => Any::String(pid.to_string()),
        None => Any::Null,
      },
    )
    .map_err(|e| ParseError::ParserError(format!("Failed to insert parentId: {}", e)))?;
  record_map
    .insert("data".to_string(), Any::String(name.to_string()))
    .map_err(|e| ParseError::ParserError(format!("Failed to insert data: {}", e)))?;
  record_map
    .insert("type".to_string(), Any::String(FOLDER_TYPE.to_string()))
    .map_err(|e| ParseError::ParserError(format!("Failed to insert type: {}", e)))?;
  record_map
    .insert("index".to_string(), Any::String(index))
    .map_err(|e| ParseError::ParserError(format!("Failed to insert index: {}", e)))?;

  let binary = doc
    .encode_update_v1()
    .map_err(|e| ParseError::ParserError(format!("Failed to encode update: {}", e)))?;

  Ok((binary, folder_id))
}

/// Move a folder or document to a different parent
pub fn folder_move(
  existing_binary: &[u8],
  record_id: &str,
  new_parent_id: Option<&str>,
  new_index: Option<&str>,
) -> Result<Vec<u8>, ParseError> {
  let doc = load_doc(existing_binary)?;

  // Validate no cycle would be created
  if let Some(new_parent) = new_parent_id {
    let all_records = read_all_records(&doc);
    if would_create_cycle(&all_records, record_id, new_parent) {
      return Err(ParseError::ParserError(
        "Cannot move folder into itself or its descendants".into(),
      ));
    }
  }

  let mut record_map = doc
    .get_map(record_id)
    .map_err(|_| ParseError::ParserError(format!("Record {} not found", record_id)))?;

  if is_deleted(&record_map) {
    return Err(ParseError::ParserError(format!("Record {} not found", record_id)));
  }

  record_map
    .insert(
      "parentId".to_string(),
      match new_parent_id {
        Some(pid) => Any::String(pid.to_string()),
        None => Any::Null,
      },
    )
    .map_err(|e| ParseError::ParserError(format!("Failed to update parentId: {}", e)))?;

  if let Some(idx_str) = new_index {
    record_map
      .insert("index".to_string(), Any::String(idx_str.to_string()))
      .map_err(|e| ParseError::ParserError(format!("Failed to update index: {}", e)))?;
  }

  doc
    .encode_update_v1()
    .map_err(|e| ParseError::ParserError(format!("Failed to encode update: {}", e)))
}

/// Move a document to a folder
pub fn doc_move_to_folder(
  existing_binary: &[u8],
  doc_id: &str,
  folder_id: Option<&str>,
  index: Option<&str>,
) -> Result<Vec<u8>, ParseError> {
  let doc = load_doc(existing_binary)?;

  let index = index.map(|s| s.to_string()).unwrap_or_else(generate_fractional_index);

  // Check if document already exists in folders
  let all_records = read_all_records(&doc);
  let existing = all_records
    .iter()
    .find(|r| r.record_type == DOC_TYPE && r.data == doc_id);

  if let Some(existing_record) = existing {
    // Update existing entry
    let mut record_map = doc
      .get_map(&existing_record.id)
      .map_err(|_| ParseError::ParserError(format!("Record {} not found", existing_record.id)))?;

    record_map
      .insert(
        "parentId".to_string(),
        match folder_id {
          Some(fid) => Any::String(fid.to_string()),
          None => Any::Null,
        },
      )
      .map_err(|e| ParseError::ParserError(format!("Failed to update parentId: {}", e)))?;
    record_map
      .insert("index".to_string(), Any::String(index))
      .map_err(|e| ParseError::ParserError(format!("Failed to update index: {}", e)))?;
  } else {
    // Create new entry
    let record_id = nanoid::nanoid!();
    let mut record_map = doc
      .get_or_create_map(&record_id)
      .map_err(|e| ParseError::ParserError(format!("Failed to create doc map: {}", e)))?;

    record_map
      .insert("id".to_string(), Any::String(record_id))
      .map_err(|e| ParseError::ParserError(format!("Failed to insert id: {}", e)))?;
    record_map
      .insert(
        "parentId".to_string(),
        match folder_id {
          Some(fid) => Any::String(fid.to_string()),
          None => Any::Null,
        },
      )
      .map_err(|e| ParseError::ParserError(format!("Failed to insert parentId: {}", e)))?;
    record_map
      .insert("data".to_string(), Any::String(doc_id.to_string()))
      .map_err(|e| ParseError::ParserError(format!("Failed to insert data: {}", e)))?;
    record_map
      .insert("type".to_string(), Any::String(DOC_TYPE.to_string()))
      .map_err(|e| ParseError::ParserError(format!("Failed to insert type: {}", e)))?;
    record_map
      .insert("index".to_string(), Any::String(index))
      .map_err(|e| ParseError::ParserError(format!("Failed to insert index: {}", e)))?;
  }

  doc
    .encode_update_v1()
    .map_err(|e| ParseError::ParserError(format!("Failed to encode update: {}", e)))
}

/// Delete a folder (only if empty) — uses $$DELETED soft-delete
pub fn folder_delete(existing_binary: &[u8], folder_id: &str) -> Result<Vec<u8>, ParseError> {
  let doc = load_doc(existing_binary)?;
  let all_records = read_all_records(&doc);

  // Find the folder
  let _folder = all_records
    .iter()
    .find(|r| r.id == folder_id && r.record_type == FOLDER_TYPE)
    .ok_or_else(|| ParseError::ParserError(format!("Folder {} not found", folder_id)))?;

  // Check if folder has children
  let has_children = all_records.iter().any(|r| r.parent_id.as_deref() == Some(folder_id));

  if has_children {
    return Err(ParseError::ParserError(
      "Cannot delete folder that contains items. Move or delete contents first.".into(),
    ));
  }

  // Soft delete: remove all fields, set $$DELETED
  let mut record_map = doc
    .get_map(folder_id)
    .map_err(|_| ParseError::ParserError(format!("Folder {} not found", folder_id)))?;

  record_map.remove("id");
  record_map.remove("parentId");
  record_map.remove("data");
  record_map.remove("type");
  record_map.remove("index");

  record_map
    .insert(DELETED_FLAG.to_string(), Any::True)
    .map_err(|e| ParseError::ParserError(format!("Failed to mark as deleted: {}", e)))?;

  doc
    .encode_update_v1()
    .map_err(|e| ParseError::ParserError(format!("Failed to encode update: {}", e)))
}

/// List folder contents at a given parent
pub fn folder_list(existing_binary: &[u8], parent_id: Option<&str>) -> Result<Vec<FolderRecord>, ParseError> {
  let doc = load_doc(existing_binary)?;
  let all_records = read_all_records(&doc);

  let mut records: Vec<FolderRecord> = all_records
    .into_iter()
    .filter(|r| r.parent_id.as_deref() == parent_id)
    .collect();

  records.sort_by(|a, b| a.index.cmp(&b.index));
  Ok(records)
}

/// Get the full folder hierarchy
pub fn folder_get_hierarchy(existing_binary: &[u8]) -> Result<Vec<FolderNode>, ParseError> {
  let doc = load_doc(existing_binary)?;
  let all_records = read_all_records(&doc);
  let root_nodes = build_hierarchy(&all_records, None);
  Ok(root_nodes)
}

/// Validate that the document ID is a folders document
pub fn is_folders_document(doc_id: &str) -> bool {
  doc_id.starts_with(FOLDERS_DOC_PREFIX) && doc_id.ends_with(FOLDERS_DOC_SUFFIX)
}

/// Build the folders document ID for a workspace
pub fn build_folders_doc_id(workspace_id: &str) -> String {
  format!("{}{}{}", FOLDERS_DOC_PREFIX, workspace_id, FOLDERS_DOC_SUFFIX)
}

/// Debug: dump raw doc structure for diagnostics
pub fn folder_debug(existing_binary: &[u8]) -> Result<String, ParseError> {
  let doc = load_doc(existing_binary)?;
  let keys = doc.keys();

  let mut debug_info = format!(
    "binary_size={}, keys_count={}, keys={:?}\n",
    existing_binary.len(),
    keys.len(),
    &keys[..std::cmp::min(keys.len(), 20)]
  );

  for key in &keys {
    match doc.get_or_create_map(key) {
      Ok(map) => {
        let id = get_string_field(&map, "id").unwrap_or_default();
        let data = get_string_field(&map, "data").unwrap_or_default();
        let record_type = get_string_field(&map, "type").unwrap_or_default();
        let deleted = is_deleted(&map);
        debug_info.push_str(&format!(
          "  key={}, id={}, type={}, data={}, deleted={}\n",
          key, id, record_type, data, deleted
        ));
      }
      Err(e) => {
        debug_info.push_str(&format!("  key={}, error={}\n", key, e));
      }
    }
  }

  Ok(debug_info)
}

// ============================================================================
// Internal helpers
// ============================================================================

fn load_doc(binary: &[u8]) -> Result<Doc, ParseError> {
  let mut doc = DocOptions::new().build();
  if !binary.is_empty() {
    doc
      .apply_update_from_binary_v1(binary)
      .map_err(|e| ParseError::ParserError(format!("Failed to load folders doc: {}", e)))?;
  }
  Ok(doc)
}

fn is_deleted(map: &Map) -> bool {
  matches!(map.get(DELETED_FLAG), Some(Value::Any(Any::True)))
}

fn get_string_field(map: &Map, field: &str) -> Option<String> {
  match map.get(field) {
    Some(Value::Any(Any::String(s))) => Some(s),
    _ => None,
  }
}

fn get_nullable_string_field(map: &Map, field: &str) -> Option<String> {
  match map.get(field) {
    Some(Value::Any(Any::String(s))) => Some(s),
    _ => None,
  }
}

fn parse_record_from_map(map: &Map) -> Option<FolderRecord> {
  if is_deleted(map) {
    return None;
  }

  let id = get_string_field(map, "id")?;
  let data = get_string_field(map, "data")?;
  let record_type = get_string_field(map, "type")?;
  let index = get_string_field(map, "index").unwrap_or_default();
  let parent_id = get_nullable_string_field(map, "parentId");

  Some(FolderRecord {
    id,
    parent_id,
    data,
    record_type,
    index,
  })
}

fn read_all_records(doc: &Doc) -> Vec<FolderRecord> {
  let keys = doc.keys();
  let mut records = Vec::new();

  for key in keys {
    if let Ok(map) = doc.get_map(&key) {
      if let Some(record) = parse_record_from_map(&map) {
        records.push(record);
      }
    }
  }

  records
}

fn would_create_cycle(records: &[FolderRecord], source_id: &str, target_parent_id: &str) -> bool {
  let mut current_id = Some(target_parent_id.to_string());

  while let Some(id) = current_id {
    if id == source_id {
      return true;
    }

    current_id = records.iter().find(|r| r.id == id).and_then(|r| r.parent_id.clone());
  }

  false
}

fn build_hierarchy(records: &[FolderRecord], parent_id: Option<&str>) -> Vec<FolderNode> {
  let mut nodes = Vec::new();

  for record in records {
    if record.parent_id.as_deref() == parent_id && record.record_type == FOLDER_TYPE {
      let children = build_hierarchy(records, Some(&record.id));
      let docs: Vec<FolderRecord> = records
        .iter()
        .filter(|r| {
          r.parent_id.as_deref() == Some(&record.id)
            && (r.record_type == DOC_TYPE || r.record_type == TAG_TYPE || r.record_type == COLLECTION_TYPE)
        })
        .cloned()
        .collect();

      nodes.push(FolderNode {
        record: record.clone(),
        children,
        docs,
      });
    }
  }

  nodes
}

fn generate_fractional_index() -> String {
  use std::time::{SystemTime, UNIX_EPOCH};
  let now = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap_or_default()
    .as_millis();
  format!("{:016x}", now)
}

#[cfg(test)]
mod tests {
  use super::*;

  fn empty_doc_binary() -> Vec<u8> {
    DocOptions::new().build().encode_update_v1().unwrap()
  }

  #[test]
  fn test_is_folders_document() {
    assert!(is_folders_document("db$ws123$folders"));
    assert!(!is_folders_document("doc456"));
  }

  #[test]
  fn test_build_folders_doc_id() {
    assert_eq!(build_folders_doc_id("myworkspace"), "db$myworkspace$folders");
  }

  #[test]
  fn test_folder_create_and_list() {
    let binary = empty_doc_binary();
    let (binary, id) = folder_create(&binary, None, "Test Folder", None, None).unwrap();
    assert!(!id.is_empty());

    let records = folder_list(&binary, None).unwrap();
    assert_eq!(records.len(), 1);
    assert_eq!(records[0].data, "Test Folder");
    assert_eq!(records[0].record_type, FOLDER_TYPE);
    assert!(records[0].parent_id.is_none());
  }

  #[test]
  fn test_folder_hierarchy() {
    let binary = empty_doc_binary();
    let (binary, _) = folder_create(&binary, Some("parent"), "Parent", None, None).unwrap();
    let (binary, _) = folder_create(&binary, Some("child"), "Child", Some("parent"), None).unwrap();

    let hierarchy = folder_get_hierarchy(&binary).unwrap();
    assert_eq!(hierarchy.len(), 1);
    assert_eq!(hierarchy[0].record.data, "Parent");
    assert_eq!(hierarchy[0].children.len(), 1);
    assert_eq!(hierarchy[0].children[0].record.data, "Child");
  }

  #[test]
  fn test_folder_delete() {
    let binary = empty_doc_binary();
    let (binary, _) = folder_create(&binary, Some("f1"), "ToDelete", None, None).unwrap();

    let binary = folder_delete(&binary, "f1").unwrap();
    let records = folder_list(&binary, None).unwrap();
    assert!(records.is_empty());
  }

  #[test]
  fn test_folder_delete_non_empty_fails() {
    let binary = empty_doc_binary();
    let (binary, _) = folder_create(&binary, Some("parent"), "Parent", None, None).unwrap();
    let (binary, _) = folder_create(&binary, Some("child"), "Child", Some("parent"), None).unwrap();

    let result = folder_delete(&binary, "parent");
    assert!(result.is_err());
  }

  #[test]
  fn test_yrs_created_doc_keys() {
    // Simulate what the frontend does: create top-level YMaps using yrs
    use yrs::{Doc as YrsDoc, Map as YrsMap, Transact};

    let yrs_doc = YrsDoc::new();
    let txn = yrs_doc.transact_mut();

    // Create a folder record as top-level YMap (like the frontend ORM does)
    let folder_map = txn.get_or_insert_map("test-folder-id");
    folder_map.insert(&txn, "id", "test-folder-id");
    folder_map.insert(&txn, "parentId", yrs::Any::Null);
    folder_map.insert(&txn, "data", "My Folder");
    folder_map.insert(&txn, "type", "folder");
    folder_map.insert(&txn, "index", "a0");

    let doc_map = txn.get_or_insert_map("test-doc-id");
    doc_map.insert(&txn, "id", "test-doc-id");
    doc_map.insert(&txn, "parentId", "test-folder-id");
    doc_map.insert(&txn, "data", "some-doc-id");
    doc_map.insert(&txn, "type", "doc");
    doc_map.insert(&txn, "index", "a1");

    let binary = txn.encode_update_v1();
    drop(txn);

    // Now load with y-octo and check
    let doc = load_doc(&binary).unwrap();
    let keys = doc.keys();
    eprintln!("keys from yrs binary: {:?}", keys);
    assert!(
      keys.len() >= 2,
      "Expected at least 2 keys, got {}: {:?}",
      keys.len(),
      keys
    );

    // Verify we can read the records
    let records = read_all_records(&doc);
    eprintln!("records: {:?}", records);
    assert_eq!(records.len(), 2);
    assert!(records.iter().any(|r| r.data == "My Folder"));
    assert!(records.iter().any(|r| r.data == "some-doc-id"));
  }

  #[test]
  fn test_doc_move_to_folder() {
    let binary = empty_doc_binary();
    let (binary, _) = folder_create(&binary, Some("f1"), "Folder", None, None).unwrap();
    let binary = doc_move_to_folder(&binary, "doc123", Some("f1"), None).unwrap();

    let records = folder_list(&binary, Some("f1")).unwrap();
    assert_eq!(records.len(), 1);
    assert_eq!(records[0].data, "doc123");
    assert_eq!(records[0].record_type, DOC_TYPE);
  }
}
