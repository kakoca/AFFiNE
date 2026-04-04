import { Logger } from '@nestjs/common';
import { z } from 'zod';

import { DocReader } from '../../../core/doc';
import { AccessController } from '../../../core/permission';
import { Models } from '../../../models';
import {
  findAllDatabases,
  formatCellValue,
  parseDatabaseFromDoc,
} from './database-utils';
import {
  documentSyncPendingError,
  workspaceSyncRequiredError,
} from './doc-sync';
import { type ToolError, toolError } from './error';
import { defineTool } from './tool';
import type { CopilotChatOptions } from './types';

const logger = new Logger('DatabaseReadTool');

const isToolError = (result: ToolError | object): result is ToolError =>
  'type' in result && result.type === 'error';

export const buildDatabaseGetter = (
  ac: AccessController,
  docReader: DocReader,
  models: Models
) => {
  const getDatabase = async (
    options: CopilotChatOptions,
    docId: string,
    databaseBlockId?: string,
    includeData = true,
    limit = 100
  ) => {
    if (!options?.user || !options?.workspace || !docId) {
      return toolError(
        'Database Read Failed',
        'Missing workspace, user, or document id for database_read.'
      );
    }

    const workspace = await models.workspace.get(options.workspace);
    if (!workspace) {
      return workspaceSyncRequiredError();
    }

    const canAccess = await ac
      .user(options.user)
      .workspace(options.workspace)
      .doc(docId)
      .can('Doc.Read');

    if (!canAccess) {
      logger.warn(
        `User ${options.user} does not have access to doc ${docId} in workspace ${options.workspace}`
      );
      return toolError(
        'Database Read Failed',
        `You do not have permission to read document ${docId} in this workspace.`
      );
    }

    const docMeta = await models.doc.getAuthors(options.workspace, docId);
    if (!docMeta) {
      return documentSyncPendingError(docId);
    }

    // Get document binary
    const doc = await docReader.getDoc(options.workspace, docId);
    if (!doc?.bin) {
      return documentSyncPendingError(docId);
    }

    // Parse database from doc
    const database = await parseDatabaseFromDoc(doc.bin, databaseBlockId);

    if (!database) {
      if (databaseBlockId) {
        return toolError(
          'Database Not Found',
          `Database block ${databaseBlockId} not found in document ${docId}.`
        );
      }

      // Check if there are any databases in the doc
      const allDatabases = await findAllDatabases(doc.bin);
      if (allDatabases.length === 0) {
        return toolError(
          'Database Not Found',
          `No database found in document ${docId}.`
        );
      }

      // Return available databases
      return toolError(
        'Multiple Databases Found',
        `Document ${docId} contains ${allDatabases.length} databases. Please specify which database (database_block_id): ${allDatabases.map(d => `${d.blockId} (${d.title})`).join(', ')}`
      );
    }

    // Build the response
    const response: DatabaseReadResult = {
      database_id: database.blockId,
      doc_id: docId,
      title: database.title,
      properties: database.columns.map(col => {
        const prop: DatabaseProperty = {
          id: col.id,
          name: col.name,
          type: col.type,
        };

        // Add options for select/multi-select types
        if (col.data && (col.type === 'select' || col.type === 'multiSelect')) {
          const options = col.data.options as Array<{
            id: string;
            value: string;
            color?: string;
          }>;
          if (options) {
            prop.options = options.map(opt => ({
              id: opt.id,
              value: opt.value,
              color: opt.color,
            }));
          }
        }

        // Add any type-specific config
        if (col.data) {
          prop.data = col.data;
        }

        return prop;
      }),
      row_count: database.rows.length,
      views: database.views.map(view => ({
        id: view.id,
        name: view.name,
        mode: view.mode,
      })),
    };

    if (includeData) {
      // Include rows (limited)
      const rowsToInclude = database.rows.slice(0, limit);
      response.rows = rowsToInclude.map(row => {
        const cells: Record<string, DatabaseCell> = {};
        for (const column of database.columns) {
          const cell = row.cells[column.id];
          if (cell) {
            cells[column.id] = {
              value: cell.value,
              formatted: formatCellValue(cell.value, column.type, column.data),
            };

            // For select types, also include display value
            if (column.type === 'select' || column.type === 'multiSelect') {
              cells[column.id].displayValue = formatCellValue(
                cell.value,
                column.type,
                column.data
              );
            }
          }
        }

        return {
          row_id: row.id,
          title: row.title,
          cells,
        };
      });

      if (database.rows.length > limit) {
        response.note = `Showing ${limit} of ${database.rows.length} rows. Use database_query tool with filters/sorting for specific data.`;
      }
    }

    return response;
  };

  return getDatabase;
};

// Type definitions for the response
interface DatabaseProperty {
  id: string;
  name: string;
  type: string;
  options?: Array<{ id: string; value: string; color?: string }>;
  data?: Record<string, unknown>;
}

interface DatabaseCell {
  value: unknown;
  formatted: string;
  displayValue?: string;
}

interface DatabaseRow {
  row_id: string;
  title?: string;
  cells: Record<string, DatabaseCell>;
}

interface DatabaseView {
  id: string;
  name: string;
  mode: 'table' | 'kanban';
}

interface DatabaseReadResult {
  database_id: string;
  doc_id: string;
  title: string;
  properties: DatabaseProperty[];
  rows?: DatabaseRow[];
  row_count: number;
  views: DatabaseView[];
  note?: string;
}

type DatabaseReadToolResult = Awaited<
  ReturnType<ReturnType<typeof buildDatabaseGetter>>
>;

export const createDatabaseReadTool = (
  getDatabase: (
    docId: string,
    databaseBlockId?: string,
    includeData?: boolean,
    limit?: number
  ) => Promise<DatabaseReadToolResult>
) => {
  return defineTool({
    description: `
Read a database from a document and return its structure and data. Use this when the user needs to:
- View database contents and structure
- Understand what columns/properties exist
- Get data from a specific database
- Check the schema of a database

The tool returns:
- database_id: Unique identifier for the database block
- doc_id: The document ID containing the database
- title: The database title
- properties: Array of columns with their types and configurations
- rows: Data rows with cell values (can be disabled with include_data: false)
- row_count: Total number of rows
- views: Available views (table, kanban)

Property types include: text, number, checkbox, date, select, multiSelect,
progress, richText, title, link, image, created-time.

Tip: If a document has multiple databases and no database_block_id is specified,
the tool will return an error listing all available databases.
`,
    inputSchema: z.object({
      doc_id: z.string().describe('The document ID containing the database'),
      database_block_id: z
        .string()
        .optional()
        .describe(
          'Optional specific database block ID. If the document has multiple databases and this is not provided, the tool will return an error listing available databases.'
        ),
      include_data: z
        .boolean()
        .default(true)
        .describe(
          'Whether to include row data. Set to false if you only need the database schema/columns.'
        ),
      limit: z
        .number()
        .default(100)
        .describe('Maximum number of rows to return (default: 100, max: 1000)'),
    }),
    execute: async ({ doc_id, database_block_id, include_data, limit }) => {
      try {
        const clampedLimit = Math.min(limit || 100, 1000);
        const result = await getDatabase(
          doc_id,
          database_block_id,
          include_data,
          clampedLimit
        );
        return isToolError(result) ? result : { ...result };
      } catch (err: any) {
        logger.error(`Failed to read database in ${doc_id}`, err);
        return toolError('Database Read Failed', err.message ?? String(err));
      }
    },
  });
};

/**
 * Tool to list all databases in a document
 */
export const buildDatabaseListGetter = (
  ac: AccessController,
  docReader: DocReader,
  models: Models
) => {
  return async (options: CopilotChatOptions, docId: string) => {
    if (!options?.user || !options?.workspace || !docId) {
      return toolError(
        'Database List Failed',
        'Missing workspace, user, or document id.'
      );
    }

    const workspace = await models.workspace.get(options.workspace);
    if (!workspace) {
      return workspaceSyncRequiredError();
    }

    const canAccess = await ac
      .user(options.user)
      .workspace(options.workspace)
      .doc(docId)
      .can('Doc.Read');

    if (!canAccess) {
      return toolError(
        'Database List Failed',
        `You do not have permission to read document ${docId}.`
      );
    }

    const doc = await docReader.getDoc(options.workspace, docId);
    if (!doc?.bin) {
      return documentSyncPendingError(docId);
    }

    const databases = await findAllDatabases(doc.bin);

    return {
      doc_id: docId,
      database_count: databases.length,
      databases: databases.map(d => ({
        database_block_id: d.blockId,
        title: d.title,
      })),
    };
  };
};

export const createDatabaseListTool = (
  listDatabases: (docId: string) => Promise<ToolError | object>
) => {
  return defineTool({
    description:
      'List all databases in a document. Returns database IDs and titles. Use this before database_read if you are unsure which database the user is referring to.',
    inputSchema: z.object({
      doc_id: z.string().describe('The document ID to list databases from'),
    }),
    execute: async ({ doc_id }) => {
      try {
        const result = await listDatabases(doc_id);
        return isToolError(result) ? result : { ...result };
      } catch (err: any) {
        logger.error(`Failed to list databases in ${doc_id}`, err);
        return toolError('Database List Failed', err.message ?? String(err));
      }
    },
  });
};
