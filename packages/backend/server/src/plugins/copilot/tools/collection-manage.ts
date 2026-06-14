import { Logger } from '@nestjs/common';
import { nanoid } from 'nanoid';
import * as Y from 'yjs';
import { z } from 'zod';

import { DocReader, DocWriter } from '../../../core/doc';
import { AccessController } from '../../../core/permission';
import { toolError } from './error';
import { defineTool } from './tool';
import type { CopilotChatOptions } from './types';

const logger = new Logger('CollectionManageTool');

interface CollectionInfo {
  id: string;
  name: string;
  rules: { filters: FilterParams[] };
  allowList: string[];
}

interface FilterParams {
  type: string;
  key: string;
  method: string;
  value?: string;
}

// ============================================================================
// Yjs helpers
// ============================================================================

function loadRootDoc(binary: Uint8Array | null): Y.Doc {
  const doc = new Y.Doc();
  if (binary && binary.length > 0) {
    Y.applyUpdate(doc, binary);
  }
  return doc;
}

function getCollectionsArray(doc: Y.Doc): Y.Array<CollectionInfo> {
  const settingMap = doc.getMap('setting');
  let arr = settingMap.get('collections') as
    | Y.Array<CollectionInfo>
    | undefined;
  if (!arr) {
    arr = new Y.Array<CollectionInfo>();
    settingMap.set('collections', arr);
  }
  return arr;
}

function readAllCollections(doc: Y.Doc): CollectionInfo[] {
  const settingMap = doc.getMap('setting');
  const arr = settingMap.get('collections') as
    | Y.Array<CollectionInfo>
    | undefined;
  if (!arr) return [];
  return arr.toArray();
}

async function getRootDocBinary(
  docReader: DocReader,
  workspaceId: string
): Promise<Uint8Array | null> {
  const doc = await docReader.getDoc(workspaceId, workspaceId);
  return doc?.bin ? new Uint8Array(doc.bin) : null;
}

async function saveRootDoc(
  docWriter: DocWriter,
  workspaceId: string,
  doc: Y.Doc,
  editorId?: string
) {
  const update = Y.encodeStateAsUpdate(doc);
  await docWriter.pushRawUpdate(workspaceId, workspaceId, update, editorId);
}

// ============================================================================
// Collection List
// ============================================================================

export const buildCollectionListHandler = (
  ac: AccessController,
  docReader: DocReader
) => {
  return async (options: CopilotChatOptions) => {
    if (!options?.user || !options?.workspace) {
      return toolError(
        'Collection List Failed',
        'Missing user or workspace context'
      );
    }

    const canAccess = await ac
      .user(options.user)
      .workspace(options.workspace)
      .doc(options.workspace)
      .can('Doc.Read');

    if (!canAccess) {
      return toolError(
        'Collection List Failed',
        'You do not have permission to view collections in this workspace.'
      );
    }

    try {
      const binary = await getRootDocBinary(docReader, options.workspace);
      if (!binary) {
        return { collections: [], count: 0 };
      }

      const doc = loadRootDoc(binary);
      const collections = readAllCollections(doc);
      doc.destroy();

      return {
        collections: collections.map(c => ({
          id: c.id,
          name: c.name,
          filter_count: c.rules?.filters?.length || 0,
          doc_count: c.allowList?.length || 0,
        })),
        count: collections.length,
      };
    } catch (err: any) {
      logger.error('Failed to list collections', err);
      return toolError('Collection List Failed', err.message);
    }
  };
};

export const createCollectionListTool = (
  listCollections: () => Promise<object>
) => {
  return defineTool({
    description: `
List all collections in the workspace.

Collections are saved views that group documents by filter rules or explicit selection.

Returns:
- collections: Array of collection summaries (id, name, filter_count, doc_count)
- count: Total number of collections
`,
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const result = await listCollections();
        if ('type' in result && result.type === 'error') {
          return result;
        }
        return result;
      } catch (err: any) {
        logger.error('Failed to list collections', err);
        return toolError('Collection List Failed', err.message);
      }
    },
  });
};

// ============================================================================
// Collection Create
// ============================================================================

export const buildCollectionCreateHandler = (
  ac: AccessController,
  docWriter: DocWriter,
  docReader: DocReader
) => {
  return async (
    options: CopilotChatOptions,
    name: string,
    filters?: FilterParams[],
    allowList?: string[]
  ) => {
    if (!options?.user || !options?.workspace) {
      return toolError(
        'Collection Create Failed',
        'Missing user or workspace context'
      );
    }

    const canAccess = await ac
      .user(options.user)
      .workspace(options.workspace)
      .doc(options.workspace)
      .can('Doc.Update');

    if (!canAccess) {
      return toolError(
        'Collection Create Failed',
        'You do not have permission to create collections in this workspace.'
      );
    }

    try {
      const binary = await getRootDocBinary(docReader, options.workspace);
      const doc = loadRootDoc(binary);
      const existing = readAllCollections(doc);

      if (existing.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        doc.destroy();
        return toolError(
          'Collection Create Failed',
          `Collection '${name}' already exists`
        );
      }

      const collectionId = nanoid();
      const arr = getCollectionsArray(doc);

      doc.transact(() => {
        arr.push([
          {
            id: collectionId,
            name,
            rules: { filters: filters || [] },
            allowList: allowList || [],
          },
        ]);
      });

      await saveRootDoc(docWriter, options.workspace, doc, options.user);
      doc.destroy();

      return {
        success: true,
        collection_id: collectionId,
        name,
      };
    } catch (err: any) {
      logger.error(`Failed to create collection: ${name}`, err);
      return toolError('Collection Create Failed', err.message);
    }
  };
};

export const createCollectionCreateTool = (
  createCollection: (
    name: string,
    filters?: FilterParams[],
    allowList?: string[]
  ) => Promise<object>
) => {
  return defineTool({
    description: `
Create a new collection in the workspace.

Collections group documents either by filter rules (smart collection) or by explicit document selection.

Filter types:
- { type: "system", key: "tags", method: "include-any-of", value: "tag1,tag2" }
- { type: "system", key: "createdAt", method: "after", value: "2024-01-01" }

Returns:
- success: Whether the operation succeeded
- collection_id: The unique ID of the created collection
- name: The collection name
`,
    inputSchema: z.object({
      name: z
        .string()
        .min(1)
        .max(100)
        .describe('The name for the new collection'),
      filters: z
        .array(
          z.object({
            type: z.string().describe('Filter type (e.g. "system")'),
            key: z.string().describe('Filter key (e.g. "tags", "createdAt")'),
            method: z
              .string()
              .describe('Filter method (e.g. "include-any-of", "after")'),
            value: z.string().optional().describe('Filter value'),
          })
        )
        .optional()
        .describe('Optional filter rules for a smart collection'),
      allow_list: z
        .array(z.string())
        .optional()
        .describe('Optional list of document IDs to include explicitly'),
    }),
    execute: async ({ name, filters, allow_list }) => {
      try {
        const result = await createCollection(name, filters, allow_list);
        if ('type' in result && result.type === 'error') {
          return result;
        }
        return result;
      } catch (err: any) {
        logger.error('Failed to create collection', err);
        return toolError('Collection Create Failed', err.message);
      }
    },
  });
};

// ============================================================================
// Collection Update
// ============================================================================

export const buildCollectionUpdateHandler = (
  ac: AccessController,
  docWriter: DocWriter,
  docReader: DocReader
) => {
  return async (
    options: CopilotChatOptions,
    collectionId: string,
    name?: string,
    filters?: FilterParams[],
    allowList?: string[]
  ) => {
    if (!options?.user || !options?.workspace) {
      return toolError(
        'Collection Update Failed',
        'Missing user or workspace context'
      );
    }

    const canAccess = await ac
      .user(options.user)
      .workspace(options.workspace)
      .doc(options.workspace)
      .can('Doc.Update');

    if (!canAccess) {
      return toolError(
        'Collection Update Failed',
        'You do not have permission to update collections in this workspace.'
      );
    }

    try {
      const binary = await getRootDocBinary(docReader, options.workspace);
      if (!binary) {
        return toolError(
          'Collection Update Failed',
          'No collections exist in this workspace'
        );
      }

      const doc = loadRootDoc(binary);
      const arr = getCollectionsArray(doc);
      const collections = arr.toArray();
      const idx = collections.findIndex(c => c.id === collectionId);

      if (idx === -1) {
        doc.destroy();
        return toolError(
          'Collection Update Failed',
          `Collection ${collectionId} not found`
        );
      }

      const existing = collections[idx];
      const updated: CollectionInfo = {
        id: collectionId,
        name: name ?? existing.name,
        rules: filters ? { filters } : existing.rules,
        allowList: allowList ?? existing.allowList,
      };

      doc.transact(() => {
        arr.delete(idx, 1);
        arr.insert(idx, [updated]);
      });

      await saveRootDoc(docWriter, options.workspace, doc, options.user);
      doc.destroy();

      return {
        success: true,
        collection_id: collectionId,
        updated_fields: [
          ...(name ? ['name'] : []),
          ...(filters ? ['filters'] : []),
          ...(allowList ? ['allowList'] : []),
        ],
      };
    } catch (err: any) {
      logger.error(`Failed to update collection: ${collectionId}`, err);
      return toolError('Collection Update Failed', err.message);
    }
  };
};

export const createCollectionUpdateTool = (
  updateCollection: (
    collectionId: string,
    name?: string,
    filters?: FilterParams[],
    allowList?: string[]
  ) => Promise<object>
) => {
  return defineTool({
    description: `
Update an existing collection's name, filters, or document list.

Returns:
- success: Whether the operation succeeded
- collection_id: The collection ID
- updated_fields: Which fields were updated
`,
    inputSchema: z.object({
      collection_id: z.string().describe('The ID of the collection to update'),
      name: z
        .string()
        .min(1)
        .max(100)
        .optional()
        .describe('New name for the collection'),
      filters: z
        .array(
          z.object({
            type: z.string(),
            key: z.string(),
            method: z.string(),
            value: z.string().optional(),
          })
        )
        .optional()
        .describe('New filter rules (replaces existing)'),
      allow_list: z
        .array(z.string())
        .optional()
        .describe('New document ID list (replaces existing)'),
    }),
    execute: async ({ collection_id, name, filters, allow_list }) => {
      try {
        const result = await updateCollection(
          collection_id,
          name,
          filters,
          allow_list
        );
        if ('type' in result && result.type === 'error') {
          return result;
        }
        return result;
      } catch (err: any) {
        logger.error('Failed to update collection', err);
        return toolError('Collection Update Failed', err.message);
      }
    },
  });
};

// ============================================================================
// Collection Delete
// ============================================================================

export const buildCollectionDeleteHandler = (
  ac: AccessController,
  docWriter: DocWriter,
  docReader: DocReader
) => {
  return async (options: CopilotChatOptions, collectionId: string) => {
    if (!options?.user || !options?.workspace) {
      return toolError(
        'Collection Delete Failed',
        'Missing user or workspace context'
      );
    }

    const canAccess = await ac
      .user(options.user)
      .workspace(options.workspace)
      .doc(options.workspace)
      .can('Doc.Update');

    if (!canAccess) {
      return toolError(
        'Collection Delete Failed',
        'You do not have permission to delete collections in this workspace.'
      );
    }

    try {
      const binary = await getRootDocBinary(docReader, options.workspace);
      if (!binary) {
        return toolError(
          'Collection Delete Failed',
          'No collections exist in this workspace'
        );
      }

      const doc = loadRootDoc(binary);
      const arr = getCollectionsArray(doc);
      const collections = arr.toArray();
      const idx = collections.findIndex(c => c.id === collectionId);

      if (idx === -1) {
        doc.destroy();
        return toolError(
          'Collection Delete Failed',
          `Collection ${collectionId} not found`
        );
      }

      doc.transact(() => {
        arr.delete(idx, 1);
      });

      await saveRootDoc(docWriter, options.workspace, doc, options.user);
      doc.destroy();

      return {
        success: true,
        collection_id: collectionId,
        message: 'Collection deleted successfully',
      };
    } catch (err: any) {
      logger.error(`Failed to delete collection: ${collectionId}`, err);
      return toolError('Collection Delete Failed', err.message);
    }
  };
};

export const createCollectionDeleteTool = (
  deleteCollection: (collectionId: string) => Promise<object>
) => {
  return defineTool({
    description: `
Delete a collection from the workspace.

This removes the collection definition. Documents in the collection are not affected.

Returns:
- success: Whether the operation succeeded
- collection_id: The ID of the deleted collection
`,
    inputSchema: z.object({
      collection_id: z.string().describe('The ID of the collection to delete'),
    }),
    execute: async ({ collection_id }) => {
      try {
        const result = await deleteCollection(collection_id);
        if ('type' in result && result.type === 'error') {
          return result;
        }
        return result;
      } catch (err: any) {
        logger.error('Failed to delete collection', err);
        return toolError('Collection Delete Failed', err.message);
      }
    },
  });
};

// ============================================================================
// Collection Add Docs
// ============================================================================

export const buildCollectionAddDocsHandler = (
  ac: AccessController,
  docWriter: DocWriter,
  docReader: DocReader
) => {
  return async (
    options: CopilotChatOptions,
    collectionId: string,
    docIds: string[]
  ) => {
    if (!options?.user || !options?.workspace) {
      return toolError(
        'Collection Add Docs Failed',
        'Missing user or workspace context'
      );
    }

    const canAccess = await ac
      .user(options.user)
      .workspace(options.workspace)
      .doc(options.workspace)
      .can('Doc.Update');

    if (!canAccess) {
      return toolError(
        'Collection Add Docs Failed',
        'You do not have permission to modify collections in this workspace.'
      );
    }

    try {
      const binary = await getRootDocBinary(docReader, options.workspace);
      if (!binary) {
        return toolError(
          'Collection Add Docs Failed',
          'No collections exist in this workspace'
        );
      }

      const doc = loadRootDoc(binary);
      const arr = getCollectionsArray(doc);
      const collections = arr.toArray();
      const idx = collections.findIndex(c => c.id === collectionId);

      if (idx === -1) {
        doc.destroy();
        return toolError(
          'Collection Add Docs Failed',
          `Collection ${collectionId} not found`
        );
      }

      const existing = collections[idx];
      const currentList = existing.allowList || [];
      const newList = [...currentList];
      for (const docId of docIds) {
        if (!newList.includes(docId)) {
          newList.push(docId);
        }
      }

      const updated: CollectionInfo = {
        ...existing,
        allowList: newList,
      };

      doc.transact(() => {
        arr.delete(idx, 1);
        arr.insert(idx, [updated]);
      });

      await saveRootDoc(docWriter, options.workspace, doc, options.user);
      doc.destroy();

      return {
        success: true,
        collection_id: collectionId,
        docs_added: docIds.length,
      };
    } catch (err: any) {
      logger.error(`Failed to add docs to collection: ${collectionId}`, err);
      return toolError('Collection Add Docs Failed', err.message);
    }
  };
};

export const createCollectionAddDocsTool = (
  addDocs: (collectionId: string, docIds: string[]) => Promise<object>
) => {
  return defineTool({
    description: `
Add documents to a collection's allow list.

Duplicates are automatically ignored.

Returns:
- success: Whether the operation succeeded
- collection_id: The collection ID
- docs_added: Number of documents added
`,
    inputSchema: z.object({
      collection_id: z
        .string()
        .describe('The collection ID to add documents to'),
      doc_ids: z.array(z.string()).min(1).describe('Document IDs to add'),
    }),
    execute: async ({ collection_id, doc_ids }) => {
      try {
        const result = await addDocs(collection_id, doc_ids);
        if ('type' in result && result.type === 'error') {
          return result;
        }
        return result;
      } catch (err: any) {
        logger.error('Failed to add docs to collection', err);
        return toolError('Collection Add Docs Failed', err.message);
      }
    },
  });
};

// ============================================================================
// Collection Remove Docs
// ============================================================================

export const buildCollectionRemoveDocsHandler = (
  ac: AccessController,
  docWriter: DocWriter,
  docReader: DocReader
) => {
  return async (
    options: CopilotChatOptions,
    collectionId: string,
    docIds: string[]
  ) => {
    if (!options?.user || !options?.workspace) {
      return toolError(
        'Collection Remove Docs Failed',
        'Missing user or workspace context'
      );
    }

    const canAccess = await ac
      .user(options.user)
      .workspace(options.workspace)
      .doc(options.workspace)
      .can('Doc.Update');

    if (!canAccess) {
      return toolError(
        'Collection Remove Docs Failed',
        'You do not have permission to modify collections in this workspace.'
      );
    }

    try {
      const binary = await getRootDocBinary(docReader, options.workspace);
      if (!binary) {
        return toolError(
          'Collection Remove Docs Failed',
          'No collections exist in this workspace'
        );
      }

      const doc = loadRootDoc(binary);
      const arr = getCollectionsArray(doc);
      const collections = arr.toArray();
      const idx = collections.findIndex(c => c.id === collectionId);

      if (idx === -1) {
        doc.destroy();
        return toolError(
          'Collection Remove Docs Failed',
          `Collection ${collectionId} not found`
        );
      }

      const existing = collections[idx];
      const updated: CollectionInfo = {
        ...existing,
        allowList: (existing.allowList || []).filter(
          id => !docIds.includes(id)
        ),
      };

      doc.transact(() => {
        arr.delete(idx, 1);
        arr.insert(idx, [updated]);
      });

      await saveRootDoc(docWriter, options.workspace, doc, options.user);
      doc.destroy();

      return {
        success: true,
        collection_id: collectionId,
        docs_removed: docIds.length,
      };
    } catch (err: any) {
      logger.error(
        `Failed to remove docs from collection: ${collectionId}`,
        err
      );
      return toolError('Collection Remove Docs Failed', err.message);
    }
  };
};

export const createCollectionRemoveDocsTool = (
  removeDocs: (collectionId: string, docIds: string[]) => Promise<object>
) => {
  return defineTool({
    description: `
Remove documents from a collection's allow list.

Returns:
- success: Whether the operation succeeded
- collection_id: The collection ID
- docs_removed: Number of documents removed
`,
    inputSchema: z.object({
      collection_id: z
        .string()
        .describe('The collection ID to remove documents from'),
      doc_ids: z.array(z.string()).min(1).describe('Document IDs to remove'),
    }),
    execute: async ({ collection_id, doc_ids }) => {
      try {
        const result = await removeDocs(collection_id, doc_ids);
        if ('type' in result && result.type === 'error') {
          return result;
        }
        return result;
      } catch (err: any) {
        logger.error('Failed to remove docs from collection', err);
        return toolError('Collection Remove Docs Failed', err.message);
      }
    },
  });
};
