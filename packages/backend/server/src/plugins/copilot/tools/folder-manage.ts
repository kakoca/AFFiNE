import { Logger } from '@nestjs/common';
import { nanoid } from 'nanoid';
import * as Y from 'yjs';
import { z } from 'zod';

import { DocReader, DocWriter } from '../../../core/doc';
import { AccessController } from '../../../core/permission';
import { toolError } from './error';
import { defineTool } from './tool';
import type { CopilotChatOptions } from './types';

const logger = new Logger('FolderManageTool');

const DELETED_FLAG = '$$DELETED';

// Types for folder operations
interface FolderRecord {
  id: string;
  parent_id: string | null;
  data: string;
  record_type: string;
  index: string;
}

interface FolderNode {
  record: FolderRecord;
  children: FolderNode[];
  docs: FolderRecord[];
}

function buildFoldersDocId(workspaceId: string): string {
  return `db$${workspaceId}$folders`;
}

// ============================================================================
// Yjs helpers
// ============================================================================

function loadYDoc(binary: Uint8Array | null): Y.Doc {
  const doc = new Y.Doc();
  if (binary && binary.length > 0) {
    Y.applyUpdate(doc, binary);
  }
  return doc;
}

function readAllRecords(doc: Y.Doc): FolderRecord[] {
  const records: FolderRecord[] = [];
  for (const value of doc.share.values()) {
    if (!(value instanceof Y.Map)) continue;
    const map = value as Y.Map<unknown>;
    if (map.get(DELETED_FLAG) === true) continue;
    const id = map.get('id') as string | undefined;
    const data = map.get('data') as string | undefined;
    const recordType = map.get('type') as string | undefined;
    if (!id || !data || !recordType) continue;
    const parentId = map.get('parentId') as string | null | undefined;
    const index = (map.get('index') as string) || '';
    records.push({
      id,
      parent_id: parentId === undefined || parentId === null ? null : parentId,
      data,
      record_type: recordType,
      index,
    });
  }
  return records;
}

function generateIndex(): string {
  return Date.now().toString(16).padStart(16, '0');
}

async function getFoldersBinary(
  docReader: DocReader,
  workspaceId: string
): Promise<Uint8Array | null> {
  const foldersDocId = buildFoldersDocId(workspaceId);
  const doc = await docReader.getDoc(workspaceId, foldersDocId);
  return doc?.bin ? new Uint8Array(doc.bin) : null;
}

async function saveFoldersDoc(
  docWriter: DocWriter,
  workspaceId: string,
  doc: Y.Doc,
  editorId?: string
) {
  const foldersDocId = buildFoldersDocId(workspaceId);
  const update = Y.encodeStateAsUpdate(doc);
  await docWriter.pushRawUpdate(workspaceId, foldersDocId, update, editorId);
}

// ============================================================================
// Folder Create Handler
// ============================================================================

export const buildFolderCreateHandler = (
  ac: AccessController,
  docWriter: DocWriter,
  docReader: DocReader
) => {
  return async (
    options: CopilotChatOptions,
    name: string,
    parentId?: string
  ) => {
    if (!options?.user || !options?.workspace) {
      return toolError(
        'Folder Create Failed',
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
        'Folder Create Failed',
        'You do not have permission to create folders in this workspace.'
      );
    }

    try {
      const binary = await getFoldersBinary(docReader, options.workspace);
      const doc = loadYDoc(binary);
      const records = readAllRecords(doc);

      // Check duplicate name in same parent
      const duplicate = records.find(
        r =>
          r.record_type === 'folder' &&
          r.data.toLowerCase() === name.toLowerCase() &&
          r.parent_id === (parentId || null)
      );
      if (duplicate) {
        doc.destroy();
        return toolError(
          'Folder Create Failed',
          `Folder '${name}' already exists in this location`
        );
      }

      const folderId = nanoid();
      const folderMap = doc.getMap(folderId);
      doc.transact(() => {
        folderMap.set('id', folderId);
        folderMap.set('parentId', parentId || null);
        folderMap.set('data', name);
        folderMap.set('type', 'folder');
        folderMap.set('index', generateIndex());
      });

      await saveFoldersDoc(docWriter, options.workspace, doc, options.user);
      doc.destroy();

      return {
        success: true,
        folder_id: folderId,
        name,
        parent_id: parentId || null,
      };
    } catch (err: any) {
      logger.error(`Failed to create folder: ${name}`, err);
      return toolError('Folder Create Failed', err.message);
    }
  };
};

export const createFolderCreateTool = (
  createFolder: (name: string, parentId?: string) => Promise<object>
) => {
  return defineTool({
    description: `
Create a new folder in the workspace to organize documents.

Use this when the user wants to:
- Create a new folder to organize documents
- Set up a folder structure for projects or categories

The folder will be created with the specified name and optionally placed inside another folder.
If no parent_id is provided, the folder is created at the root level.

Returns:
- success: Whether the operation succeeded
- folder_id: The unique ID of the created folder
- name: The folder name
- parent_id: The parent folder ID (null if at root)
`,
    inputSchema: z.object({
      name: z.string().min(1).max(100).describe('The name for the new folder'),
      parent_id: z
        .string()
        .optional()
        .describe(
          'Optional parent folder ID. If not provided, creates at root level.'
        ),
    }),
    execute: async ({ name, parent_id }) => {
      try {
        const result = await createFolder(name, parent_id);
        if ('type' in result && result.type === 'error') {
          return result;
        }
        return result;
      } catch (err: any) {
        logger.error(`Failed to create folder`, err);
        return toolError('Folder Create Failed', err.message);
      }
    },
  });
};

// ============================================================================
// Folder Move Handler
// ============================================================================

export const buildFolderMoveHandler = (
  ac: AccessController,
  docWriter: DocWriter,
  docReader: DocReader
) => {
  return async (
    options: CopilotChatOptions,
    folderId: string,
    newParentId?: string
  ) => {
    if (!options?.user || !options?.workspace) {
      return toolError(
        'Folder Move Failed',
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
        'Folder Move Failed',
        'You do not have permission to move folders in this workspace.'
      );
    }

    try {
      const binary = await getFoldersBinary(docReader, options.workspace);
      if (!binary) {
        return toolError(
          'Folder Move Failed',
          'No folders exist in this workspace'
        );
      }

      const doc = loadYDoc(binary);
      const records = readAllRecords(doc);

      // Check cycle
      if (newParentId) {
        let current: string | null = newParentId;
        while (current) {
          if (current === folderId) {
            doc.destroy();
            return toolError(
              'Folder Move Failed',
              'Cannot move folder into itself or its descendants'
            );
          }
          const parent = records.find(r => r.id === current);
          current = parent?.parent_id || null;
        }
      }

      const folderMap = doc.getMap(folderId);
      if (!folderMap.get('id')) {
        doc.destroy();
        return toolError('Folder Move Failed', `Folder ${folderId} not found`);
      }

      doc.transact(() => {
        folderMap.set('parentId', newParentId || null);
      });

      await saveFoldersDoc(docWriter, options.workspace, doc, options.user);
      doc.destroy();

      return {
        success: true,
        folder_id: folderId,
        new_parent_id: newParentId || null,
      };
    } catch (err: any) {
      logger.error(`Failed to move folder: ${folderId}`, err);
      return toolError('Folder Move Failed', err.message);
    }
  };
};

export const createFolderMoveTool = (
  moveFolder: (folderId: string, newParentId?: string) => Promise<object>
) => {
  return defineTool({
    description: `
Move a folder to a different location in the folder hierarchy.

Use this when the user wants to:
- Reorganize the folder structure
- Move a folder inside another folder
- Move a folder to the root level

Note: Cannot move a folder into itself or its descendants (cycle prevention).

Returns:
- success: Whether the operation succeeded
- folder_id: The ID of the moved folder
- new_parent_id: The new parent folder ID (null if moved to root)
`,
    inputSchema: z.object({
      folder_id: z.string().describe('The ID of the folder to move'),
      new_parent_id: z
        .string()
        .optional()
        .describe(
          'The new parent folder ID. If not provided, moves to root level.'
        ),
    }),
    execute: async ({ folder_id, new_parent_id }) => {
      try {
        const result = await moveFolder(folder_id, new_parent_id);
        if ('type' in result && result.type === 'error') {
          return result;
        }
        return result;
      } catch (err: any) {
        logger.error(`Failed to move folder`, err);
        return toolError('Folder Move Failed', err.message);
      }
    },
  });
};

// ============================================================================
// Doc Move To Folder Handler
// ============================================================================

export const buildDocMoveToFolderHandler = (
  ac: AccessController,
  docWriter: DocWriter,
  docReader: DocReader
) => {
  return async (
    options: CopilotChatOptions,
    docId: string,
    folderId?: string
  ) => {
    if (!options?.user || !options?.workspace) {
      return toolError('Doc Move Failed', 'Missing user or workspace context');
    }

    const canAccess = await ac
      .user(options.user)
      .workspace(options.workspace)
      .doc(options.workspace)
      .can('Doc.Update');

    if (!canAccess) {
      return toolError(
        'Doc Move Failed',
        'You do not have permission to organize documents in this workspace.'
      );
    }

    try {
      const binary = await getFoldersBinary(docReader, options.workspace);
      const doc = loadYDoc(binary);
      const records = readAllRecords(doc);

      // Check if doc already has an entry
      const existing = records.find(
        r => r.record_type === 'doc' && r.data === docId
      );

      doc.transact(() => {
        if (existing) {
          const map = doc.getMap(existing.id);
          map.set('parentId', folderId || null);
          map.set('index', generateIndex());
        } else {
          const recordId = nanoid();
          const map = doc.getMap(recordId);
          map.set('id', recordId);
          map.set('parentId', folderId || null);
          map.set('data', docId);
          map.set('type', 'doc');
          map.set('index', generateIndex());
        }
      });

      await saveFoldersDoc(docWriter, options.workspace, doc, options.user);
      doc.destroy();

      return {
        success: true,
        doc_id: docId,
        folder_id: folderId || null,
      };
    } catch (err: any) {
      logger.error(`Failed to move doc to folder: ${docId}`, err);
      return toolError('Doc Move Failed', err.message);
    }
  };
};

export const createDocMoveToFolderTool = (
  moveDoc: (docId: string, folderId?: string) => Promise<object>
) => {
  return defineTool({
    description: `
Move a document into a folder (or remove from folder by moving to root).

Use this when the user wants to:
- Organize a document into a folder
- Move a document out of all folders (to root)

Returns:
- success: Whether the operation succeeded
- doc_id: The ID of the moved document
- folder_id: The folder ID (null if moved to root)
`,
    inputSchema: z.object({
      doc_id: z.string().describe('The ID of the document to move'),
      folder_id: z
        .string()
        .optional()
        .describe(
          'The target folder ID. If not provided, moves the document to root level.'
        ),
    }),
    execute: async ({ doc_id, folder_id }) => {
      try {
        const result = await moveDoc(doc_id, folder_id);
        if ('type' in result && result.type === 'error') {
          return result;
        }
        return result;
      } catch (err: any) {
        logger.error(`Failed to move document to folder`, err);
        return toolError('Doc Move Failed', err.message);
      }
    },
  });
};

// ============================================================================
// Folder Delete Handler
// ============================================================================

export const buildFolderDeleteHandler = (
  ac: AccessController,
  docWriter: DocWriter,
  docReader: DocReader
) => {
  return async (options: CopilotChatOptions, folderId: string) => {
    if (!options?.user || !options?.workspace) {
      return toolError(
        'Folder Delete Failed',
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
        'Folder Delete Failed',
        'You do not have permission to delete folders in this workspace.'
      );
    }

    try {
      const binary = await getFoldersBinary(docReader, options.workspace);
      if (!binary) {
        return toolError(
          'Folder Delete Failed',
          'No folders exist in this workspace'
        );
      }

      const doc = loadYDoc(binary);
      const records = readAllRecords(doc);

      const folder = records.find(
        r => r.id === folderId && r.record_type === 'folder'
      );
      if (!folder) {
        doc.destroy();
        return toolError(
          'Folder Delete Failed',
          `Folder ${folderId} not found`
        );
      }

      const hasChildren = records.some(r => r.parent_id === folderId);
      if (hasChildren) {
        doc.destroy();
        return toolError(
          'Folder Delete Failed',
          'Cannot delete folder that contains items. Move or delete contents first.'
        );
      }

      // Soft delete: clear fields, set $$DELETED
      const folderMap = doc.getMap(folderId);
      doc.transact(() => {
        folderMap.delete('id');
        folderMap.delete('parentId');
        folderMap.delete('data');
        folderMap.delete('type');
        folderMap.delete('index');
        folderMap.set(DELETED_FLAG, true);
      });

      await saveFoldersDoc(docWriter, options.workspace, doc, options.user);
      doc.destroy();

      return {
        success: true,
        folder_id: folderId,
        message: 'Folder deleted successfully',
      };
    } catch (err: any) {
      logger.error(`Failed to delete folder: ${folderId}`, err);
      return toolError('Folder Delete Failed', err.message);
    }
  };
};

export const createFolderDeleteTool = (
  deleteFolder: (folderId: string) => Promise<object>
) => {
  return defineTool({
    description: `
Delete a folder from the workspace.

Use this when the user wants to:
- Remove an empty folder
- Clean up folder structure

Note: Folders can only be deleted if they are empty (no subfolders or documents inside).
Move or delete contents first before deleting the folder.

Returns:
- success: Whether the operation succeeded
- folder_id: The ID of the deleted folder
- message: Success message
`,
    inputSchema: z.object({
      folder_id: z.string().describe('The ID of the folder to delete'),
    }),
    execute: async ({ folder_id }) => {
      try {
        const result = await deleteFolder(folder_id);
        if ('type' in result && result.type === 'error') {
          return result;
        }
        return result;
      } catch (err: any) {
        logger.error(`Failed to delete folder`, err);
        return toolError('Folder Delete Failed', err.message);
      }
    },
  });
};

// ============================================================================
// Folder List Handler
// ============================================================================

export const buildFolderListHandler = (
  ac: AccessController,
  docReader: DocReader
) => {
  return async (options: CopilotChatOptions, parentId?: string) => {
    if (!options?.user || !options?.workspace) {
      return toolError(
        'Folder List Failed',
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
        'Folder List Failed',
        'You do not have permission to view folders in this workspace.'
      );
    }

    try {
      const binary = await getFoldersBinary(docReader, options.workspace);
      if (!binary) {
        return {
          folders: [],
          parent_id: parentId || null,
          count: 0,
        };
      }

      const doc = loadYDoc(binary);
      const records = readAllRecords(doc);
      doc.destroy();

      const targetParent = parentId || null;
      const filtered = records
        .filter(r => r.parent_id === targetParent)
        .sort((a, b) => a.index.localeCompare(b.index));

      return {
        folders: filtered.map(r => ({
          id: r.id,
          name: r.data,
          type: r.record_type,
          parent_id: r.parent_id,
        })),
        parent_id: targetParent,
        count: filtered.length,
      };
    } catch (err: any) {
      logger.error(`Failed to list folders`, err);
      return toolError('Folder List Failed', err.message);
    }
  };
};

export const createFolderListTool = (
  listFolders: (parentId?: string) => Promise<object>
) => {
  return defineTool({
    description: `
List folders and their contents in a specific location.

Use this when the user wants to:
- See what's inside a folder
- Browse the folder structure
- Find folders or documents

Returns:
- folders: Array of items in the folder (folders, documents, tags, collections)
- parent_id: The parent folder ID (null for root)
- count: Number of items
`,
    inputSchema: z.object({
      parent_id: z
        .string()
        .optional()
        .describe(
          'The parent folder ID to list. If not provided, lists root level items.'
        ),
    }),
    execute: async ({ parent_id }) => {
      try {
        const result = await listFolders(parent_id);
        if ('type' in result && result.type === 'error') {
          return result;
        }
        return result;
      } catch (err: any) {
        logger.error(`Failed to list folders`, err);
        return toolError('Folder List Failed', err.message);
      }
    },
  });
};

// ============================================================================
// Folder Get Hierarchy Handler
// ============================================================================

export const buildFolderGetHierarchyHandler = (
  ac: AccessController,
  docReader: DocReader
) => {
  return async (options: CopilotChatOptions) => {
    if (!options?.user || !options?.workspace) {
      return toolError(
        'Folder Hierarchy Failed',
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
        'Folder Hierarchy Failed',
        'You do not have permission to view folders in this workspace.'
      );
    }

    try {
      const binary = await getFoldersBinary(docReader, options.workspace);
      if (!binary) {
        return {
          hierarchy: [],
          message: 'No folders exist in this workspace',
        };
      }

      const doc = loadYDoc(binary);
      const records = readAllRecords(doc);
      doc.destroy();

      const nodes = buildHierarchy(records, null);

      return {
        hierarchy: nodes,
        root_folders: nodes.length,
        total_items: countTotalItems(nodes),
      };
    } catch (err: any) {
      logger.error(`Failed to get folder hierarchy`, err);
      return toolError('Folder Hierarchy Failed', err.message);
    }
  };
};

function buildHierarchy(
  records: FolderRecord[],
  parentId: string | null
): FolderNode[] {
  return records
    .filter(r => r.parent_id === parentId && r.record_type === 'folder')
    .sort((a, b) => a.index.localeCompare(b.index))
    .map(folder => ({
      record: folder,
      children: buildHierarchy(records, folder.id),
      docs: records
        .filter(
          r =>
            r.parent_id === folder.id &&
            (r.record_type === 'doc' ||
              r.record_type === 'tag' ||
              r.record_type === 'collection')
        )
        .sort((a, b) => a.index.localeCompare(b.index)),
    }));
}

function countTotalItems(nodes: FolderNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count++;
    count += node.docs?.length || 0;
    count += countTotalItems(node.children);
  }
  return count;
}

export const createFolderGetHierarchyTool = (
  getHierarchy: () => Promise<object>
) => {
  return defineTool({
    description: `
Get the complete folder hierarchy/tree structure of the workspace.

Use this when the user wants to:
- See the entire folder structure
- Understand the organization of documents
- Find where documents are located

Returns:
- hierarchy: Complete tree of folders with nested children
- root_folders: Number of top-level folders
- total_items: Total count of all folders and items
`,
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const result = await getHierarchy();
        if ('type' in result && result.type === 'error') {
          return result;
        }
        return result;
      } catch (err: any) {
        logger.error(`Failed to get folder hierarchy`, err);
        return toolError('Folder Hierarchy Failed', err.message);
      }
    },
  });
};
