//! Collection management for Yjs documents
//!
//! Collections are stored in the workspace root doc at `setting.collections` as a YArray.
//! Each collection is a plain object: { id, name, rules: { filters }, allowList }

use y_octo::{Any, Array, Doc, DocOptions, Map, Value};

use super::ParseError;

/// Helper: build Any::Object from key-value pairs
/// (avoids naming ahash::HashMap directly)
fn any_object(pairs: Vec<(&str, Any)>) -> Any {
  if let Any::Object(mut map) = Any::Object(Default::default()) {
    for (k, v) in pairs {
      map.insert(k.to_string(), v);
    }
    Any::Object(map)
  } else {
    unreachable!()
  }
}

/// Collection record
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CollectionInfo {
  pub id: String,
  pub name: String,
  pub rules: CollectionRules,
  #[serde(rename = "allowList")]
  pub allow_list: Vec<String>,
}

/// Collection filter rules
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CollectionRules {
  pub filters: Vec<FilterParams>,
}

/// Filter parameter
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FilterParams {
  #[serde(rename = "type")]
  pub filter_type: String,
  pub key: String,
  pub method: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub value: Option<String>,
}

/// List all collections from the workspace root doc
pub fn collection_list(root_doc_binary: &[u8]) -> Result<Vec<CollectionInfo>, ParseError> {
  let doc = load_root_doc(root_doc_binary)?;
  let collections_array = get_collections_array(&doc)?;

  let mut result = Vec::new();
  for item in collections_array.iter() {
    if let Some(collection) = parse_collection_from_value(&item) {
      result.push(collection);
    }
  }

  Ok(result)
}

/// Create a new collection in the workspace root doc
pub fn collection_create(
  root_doc_binary: &[u8],
  collection_id: Option<&str>,
  name: &str,
  filters: &[FilterParams],
  allow_list: &[String],
) -> Result<(Vec<u8>, String), ParseError> {
  if name.is_empty() {
    return Err(ParseError::ParserError("Collection name cannot be empty".into()));
  }

  let id = collection_id
    .map(|s| s.to_string())
    .unwrap_or_else(|| nanoid::nanoid!());

  let doc = load_root_doc(root_doc_binary)?;
  let mut collections_array = get_or_create_collections_array(&doc)?;

  // Check for duplicate name
  for item in collections_array.iter() {
    if let Some(existing) = parse_collection_from_value(&item) {
      if existing.name.eq_ignore_ascii_case(name) {
        return Err(ParseError::ParserError(format!("Collection '{}' already exists", name)));
      }
    }
  }

  // Build the collection as a nested Any structure
  let collection_any = build_collection_any(&id, name, filters, allow_list);
  collections_array
    .push(Value::Any(collection_any))
    .map_err(|e| ParseError::ParserError(format!("Failed to push collection: {}", e)))?;

  let binary = doc
    .encode_update_v1()
    .map_err(|e| ParseError::ParserError(format!("Failed to encode update: {}", e)))?;

  Ok((binary, id))
}

/// Update an existing collection
pub fn collection_update(
  root_doc_binary: &[u8],
  collection_id: &str,
  name: Option<&str>,
  filters: Option<&[FilterParams]>,
  allow_list: Option<&[String]>,
) -> Result<Vec<u8>, ParseError> {
  let doc = load_root_doc(root_doc_binary)?;
  let mut collections_array = get_or_create_collections_array(&doc)?;

  // Find the collection
  let mut found_idx: Option<usize> = None;
  let mut existing_collection: Option<CollectionInfo> = None;

  for (idx, item) in collections_array.iter().enumerate() {
    if let Some(collection) = parse_collection_from_value(&item) {
      if collection.id == collection_id {
        found_idx = Some(idx);
        existing_collection = Some(collection);
        break;
      }
    }
  }

  let idx = found_idx.ok_or_else(|| ParseError::ParserError(format!("Collection {} not found", collection_id)))?;
  let existing = existing_collection.unwrap();

  // Check duplicate name if renaming
  if let Some(new_name) = name {
    if !new_name.eq_ignore_ascii_case(&existing.name) {
      for item in collections_array.iter() {
        if let Some(c) = parse_collection_from_value(&item) {
          if c.id != collection_id && c.name.eq_ignore_ascii_case(new_name) {
            return Err(ParseError::ParserError(format!(
              "Collection '{}' already exists",
              new_name
            )));
          }
        }
      }
    }
  }

  // Build updated collection
  let updated_name = name.unwrap_or(&existing.name);
  let updated_filters = filters.unwrap_or(&existing.rules.filters);
  let updated_allow_list = allow_list.map(|a| a.to_vec()).unwrap_or(existing.allow_list);

  // YArray update: delete at index, insert new at same index
  collections_array
    .remove(idx as u64, 1)
    .map_err(|e| ParseError::ParserError(format!("Failed to remove old collection: {}", e)))?;

  let collection_any = build_collection_any(collection_id, updated_name, updated_filters, &updated_allow_list);
  collections_array
    .insert(idx as u64, Value::Any(collection_any))
    .map_err(|e| ParseError::ParserError(format!("Failed to insert updated collection: {}", e)))?;

  doc
    .encode_update_v1()
    .map_err(|e| ParseError::ParserError(format!("Failed to encode update: {}", e)))
}

/// Delete a collection by ID
pub fn collection_delete(root_doc_binary: &[u8], collection_id: &str) -> Result<Vec<u8>, ParseError> {
  let doc = load_root_doc(root_doc_binary)?;
  let mut collections_array = get_or_create_collections_array(&doc)?;

  let mut found_idx: Option<usize> = None;
  for (idx, item) in collections_array.iter().enumerate() {
    if let Some(collection) = parse_collection_from_value(&item) {
      if collection.id == collection_id {
        found_idx = Some(idx);
        break;
      }
    }
  }

  let idx = found_idx.ok_or_else(|| ParseError::ParserError(format!("Collection {} not found", collection_id)))?;

  collections_array
    .remove(idx as u64, 1)
    .map_err(|e| ParseError::ParserError(format!("Failed to remove collection: {}", e)))?;

  doc
    .encode_update_v1()
    .map_err(|e| ParseError::ParserError(format!("Failed to encode update: {}", e)))
}

/// Add document IDs to a collection's allowList
pub fn collection_add_docs(
  root_doc_binary: &[u8],
  collection_id: &str,
  doc_ids: &[String],
) -> Result<Vec<u8>, ParseError> {
  let doc = load_root_doc(root_doc_binary)?;
  let mut collections_array = get_or_create_collections_array(&doc)?;

  let mut found_idx: Option<usize> = None;
  let mut existing_collection: Option<CollectionInfo> = None;

  for (idx, item) in collections_array.iter().enumerate() {
    if let Some(collection) = parse_collection_from_value(&item) {
      if collection.id == collection_id {
        found_idx = Some(idx);
        existing_collection = Some(collection);
        break;
      }
    }
  }

  let idx = found_idx.ok_or_else(|| ParseError::ParserError(format!("Collection {} not found", collection_id)))?;
  let existing = existing_collection.unwrap();

  // Merge allow lists (deduplicate)
  let mut updated_allow_list = existing.allow_list;
  for doc_id in doc_ids {
    if !updated_allow_list.contains(doc_id) {
      updated_allow_list.push(doc_id.clone());
    }
  }

  // Replace in array
  collections_array
    .remove(idx as u64, 1)
    .map_err(|e| ParseError::ParserError(format!("Failed to remove old collection: {}", e)))?;

  let collection_any = build_collection_any(
    collection_id,
    &existing.name,
    &existing.rules.filters,
    &updated_allow_list,
  );
  collections_array
    .insert(idx as u64, Value::Any(collection_any))
    .map_err(|e| ParseError::ParserError(format!("Failed to insert updated collection: {}", e)))?;

  doc
    .encode_update_v1()
    .map_err(|e| ParseError::ParserError(format!("Failed to encode update: {}", e)))
}

/// Remove document IDs from a collection's allowList
pub fn collection_remove_docs(
  root_doc_binary: &[u8],
  collection_id: &str,
  doc_ids: &[String],
) -> Result<Vec<u8>, ParseError> {
  let doc = load_root_doc(root_doc_binary)?;
  let mut collections_array = get_or_create_collections_array(&doc)?;

  let mut found_idx: Option<usize> = None;
  let mut existing_collection: Option<CollectionInfo> = None;

  for (idx, item) in collections_array.iter().enumerate() {
    if let Some(collection) = parse_collection_from_value(&item) {
      if collection.id == collection_id {
        found_idx = Some(idx);
        existing_collection = Some(collection);
        break;
      }
    }
  }

  let idx = found_idx.ok_or_else(|| ParseError::ParserError(format!("Collection {} not found", collection_id)))?;
  let existing = existing_collection.unwrap();

  let updated_allow_list: Vec<String> = existing
    .allow_list
    .into_iter()
    .filter(|id| !doc_ids.contains(id))
    .collect();

  collections_array
    .remove(idx as u64, 1)
    .map_err(|e| ParseError::ParserError(format!("Failed to remove old collection: {}", e)))?;

  let collection_any = build_collection_any(
    collection_id,
    &existing.name,
    &existing.rules.filters,
    &updated_allow_list,
  );
  collections_array
    .insert(idx as u64, Value::Any(collection_any))
    .map_err(|e| ParseError::ParserError(format!("Failed to insert updated collection: {}", e)))?;

  doc
    .encode_update_v1()
    .map_err(|e| ParseError::ParserError(format!("Failed to encode update: {}", e)))
}

// ============================================================================
// Internal helpers
// ============================================================================

fn load_root_doc(binary: &[u8]) -> Result<Doc, ParseError> {
  let mut doc = DocOptions::new().build();
  if !binary.is_empty() {
    doc
      .apply_update_from_binary_v1(binary)
      .map_err(|e| ParseError::ParserError(format!("Failed to load root doc: {}", e)))?;
  }
  Ok(doc)
}

fn get_collections_array(doc: &Doc) -> Result<Array, ParseError> {
  let setting_map = doc
    .get_map("setting")
    .map_err(|_| ParseError::ParserError("No setting map in root doc".into()))?;

  let collections_val = setting_map
    .get("collections")
    .ok_or_else(|| ParseError::ParserError("No collections in setting".into()))?;

  collections_val
    .to_array()
    .ok_or_else(|| ParseError::ParserError("collections is not an array".into()))
}

fn get_or_create_collections_array(doc: &Doc) -> Result<Array, ParseError> {
  let mut setting_map = doc
    .get_or_create_map("setting")
    .map_err(|e| ParseError::ParserError(format!("Failed to get/create setting map: {}", e)))?;

  if let Some(collections_val) = setting_map.get("collections") {
    if let Some(array) = collections_val.to_array() {
      return Ok(array);
    }
  }

  // Create new array
  let array = doc
    .create_array()
    .map_err(|e| ParseError::ParserError(format!("Failed to create collections array: {}", e)))?;
  setting_map
    .insert("collections".to_string(), Value::Array(array.clone()))
    .map_err(|e| ParseError::ParserError(format!("Failed to insert collections array: {}", e)))?;

  Ok(array)
}

fn parse_collection_from_value(value: &Value) -> Option<CollectionInfo> {
  // Collections are stored as plain Any objects in the YArray
  match value {
    Value::Any(any) => parse_collection_from_any(any),
    Value::Map(map) => parse_collection_from_map(map),
    _ => None,
  }
}

fn parse_collection_from_any(any: &Any) -> Option<CollectionInfo> {
  match any {
    Any::Object(map) => {
      let id = match map.get("id")? {
        Any::String(s) => s.clone(),
        _ => return None,
      };
      let name = match map.get("name")? {
        Any::String(s) => s.clone(),
        _ => return None,
      };

      let rules = if let Some(Any::Object(rules_map)) = map.get("rules") {
        let filters = if let Some(Any::Array(filters_arr)) = rules_map.get("filters") {
          filters_arr.iter().filter_map(|f| parse_filter_from_any(f)).collect()
        } else {
          Vec::new()
        };
        CollectionRules { filters }
      } else {
        CollectionRules { filters: Vec::new() }
      };

      let allow_list = if let Some(Any::Array(arr)) = map.get("allowList") {
        arr
          .iter()
          .filter_map(|v| match v {
            Any::String(s) => Some(s.clone()),
            _ => None,
          })
          .collect()
      } else {
        Vec::new()
      };

      Some(CollectionInfo {
        id,
        name,
        rules,
        allow_list,
      })
    }
    _ => None,
  }
}

fn parse_collection_from_map(map: &Map) -> Option<CollectionInfo> {
  let id = map.get("id").and_then(|v| match v {
    Value::Any(Any::String(s)) => Some(s),
    _ => None,
  })?;
  let name = map.get("name").and_then(|v| match v {
    Value::Any(Any::String(s)) => Some(s),
    _ => None,
  })?;

  // Simplified parsing for YMap-based collections
  Some(CollectionInfo {
    id,
    name,
    rules: CollectionRules { filters: Vec::new() },
    allow_list: Vec::new(),
  })
}

fn parse_filter_from_any(any: &Any) -> Option<FilterParams> {
  match any {
    Any::Object(map) => {
      let filter_type = match map.get("type")? {
        Any::String(s) => s.clone(),
        _ => return None,
      };
      let key = match map.get("key")? {
        Any::String(s) => s.clone(),
        _ => return None,
      };
      let method = match map.get("method")? {
        Any::String(s) => s.clone(),
        _ => return None,
      };
      let value = map.get("value").and_then(|v| match v {
        Any::String(s) => Some(s.clone()),
        _ => None,
      });

      Some(FilterParams {
        filter_type,
        key,
        method,
        value,
      })
    }
    _ => None,
  }
}

fn build_collection_any(id: &str, name: &str, filters: &[FilterParams], allow_list: &[String]) -> Any {
  // Build filters
  let filters_any: Vec<Any> = filters
    .iter()
    .map(|f| {
      let mut pairs = vec![
        ("type", Any::String(f.filter_type.clone())),
        ("key", Any::String(f.key.clone())),
        ("method", Any::String(f.method.clone())),
      ];
      if let Some(v) = &f.value {
        pairs.push(("value", Any::String(v.clone())));
      }
      any_object(pairs)
    })
    .collect();

  let rules = any_object(vec![("filters", Any::Array(filters_any))]);

  let allow_any: Vec<Any> = allow_list.iter().map(|s| Any::String(s.clone())).collect();

  any_object(vec![
    ("id", Any::String(id.to_string())),
    ("name", Any::String(name.to_string())),
    ("rules", rules),
    ("allowList", Any::Array(allow_any)),
  ])
}

#[cfg(test)]
mod tests {
  use super::*;

  fn create_empty_root_doc() -> Vec<u8> {
    let doc = DocOptions::new().build();
    doc.encode_update_v1().unwrap()
  }

  #[test]
  fn test_collection_create_and_list() {
    let root_binary = create_empty_root_doc();

    let (updated, id) = collection_create(&root_binary, None, "My Collection", &[], &[]).unwrap();
    assert!(!id.is_empty());

    let collections = collection_list(&updated).unwrap();
    assert_eq!(collections.len(), 1);
    assert_eq!(collections[0].name, "My Collection");
    assert_eq!(collections[0].id, id);
  }

  #[test]
  fn test_collection_create_with_filters() {
    let root_binary = create_empty_root_doc();

    let filters = vec![FilterParams {
      filter_type: "system".to_string(),
      key: "tags".to_string(),
      method: "include-any-of".to_string(),
      value: Some("important".to_string()),
    }];

    let (updated, id) = collection_create(&root_binary, Some("test-id"), "Filtered", &filters, &[]).unwrap();
    assert_eq!(id, "test-id");

    let collections = collection_list(&updated).unwrap();
    assert_eq!(collections[0].rules.filters.len(), 1);
    assert_eq!(collections[0].rules.filters[0].key, "tags");
  }

  #[test]
  fn test_collection_update() {
    let root_binary = create_empty_root_doc();
    let (binary, id) = collection_create(&root_binary, Some("c1"), "Original", &[], &[]).unwrap();

    let updated = collection_update(&binary, "c1", Some("Renamed"), None, None).unwrap();

    let collections = collection_list(&updated).unwrap();
    assert_eq!(collections[0].name, "Renamed");
    assert_eq!(collections[0].id, id);
  }

  #[test]
  fn test_collection_delete() {
    let root_binary = create_empty_root_doc();
    let (binary, _) = collection_create(&root_binary, Some("c1"), "ToDelete", &[], &[]).unwrap();

    let updated = collection_delete(&binary, "c1").unwrap();
    let collections = collection_list(&updated).unwrap();
    assert!(collections.is_empty());
  }

  #[test]
  fn test_collection_add_remove_docs() {
    let root_binary = create_empty_root_doc();
    let (binary, _) = collection_create(&root_binary, Some("c1"), "Docs Collection", &[], &[]).unwrap();

    // Add docs
    let docs = vec!["doc1".to_string(), "doc2".to_string()];
    let updated = collection_add_docs(&binary, "c1", &docs).unwrap();

    let collections = collection_list(&updated).unwrap();
    assert_eq!(collections[0].allow_list.len(), 2);

    // Remove one doc
    let updated2 = collection_remove_docs(&updated, "c1", &["doc1".to_string()]).unwrap();

    let collections2 = collection_list(&updated2).unwrap();
    assert_eq!(collections2[0].allow_list.len(), 1);
    assert_eq!(collections2[0].allow_list[0], "doc2");
  }

  #[test]
  fn test_duplicate_name_rejected() {
    let root_binary = create_empty_root_doc();
    let (binary, _) = collection_create(&root_binary, None, "Unique", &[], &[]).unwrap();

    let result = collection_create(&binary, None, "unique", &[], &[]);
    assert!(result.is_err());
  }
}
