import { Logger } from '@nestjs/common';
import { z } from 'zod';

import { DocReader } from '../../../core/doc';
import { AccessController } from '../../../core/permission';
import { Models } from '../../../models';
import {
  filterDatabaseRows,
  formatCellValue,
  parseDatabaseFromDoc,
  sortDatabaseRows,
} from './database-utils';
import {
  documentSyncPendingError,
  workspaceSyncRequiredError,
} from './doc-sync';
import { type ToolError, toolError } from './error';
import { defineTool } from './tool';
import type { CopilotChatOptions } from './types';

const logger = new Logger('DatabaseQueryTool');

const isToolError = (result: ToolError | object): result is ToolError =>
  'type' in result && result.type === 'error';

export const buildDatabaseQueryHandler = (
  ac: AccessController,
  docReader: DocReader,
  models: Models
) => {
  return async (
    options: CopilotChatOptions,
    docId: string,
    databaseBlockId: string | undefined,
    filters: Array<{
      property: string;
      operator: string;
      value?: unknown;
    }>,
    sort:
      | {
          property: string;
          direction: 'asc' | 'desc';
        }
      | undefined,
    limit: number,
    offset: number
  ) => {
    if (!options?.user || !options?.workspace || !docId) {
      return toolError(
        'Database Query Failed',
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
        'Database Query Failed',
        `You do not have permission to read document ${docId}.`
      );
    }

    const docMeta = await models.doc.getAuthors(options.workspace, docId);
    if (!docMeta) {
      return documentSyncPendingError(docId);
    }

    const doc = await docReader.getDoc(options.workspace, docId);
    if (!doc?.bin) {
      return documentSyncPendingError(docId);
    }

    const database = await parseDatabaseFromDoc(doc.bin, databaseBlockId);

    if (!database) {
      return toolError(
        'Database Not Found',
        databaseBlockId
          ? `Database block ${databaseBlockId} not found in document ${docId}.`
          : `No database found in document ${docId}.`
      );
    }

    // Build property mapping for lookups by name
    const propertyByName = new Map(
      database.columns.map(col => [col.name.toLowerCase(), col])
    );
    const propertyById = new Map(database.columns.map(col => [col.id, col]));

    // Normalize filters to use column IDs
    const normalizedFilters = filters
      .map(filter => {
        const property =
          propertyById.get(filter.property) ??
          propertyByName.get(filter.property.toLowerCase());

        if (!property) {
          logger.warn(
            `Filter property "${filter.property}" not found in database ${database.blockId}`
          );
          return null;
        }

        return {
          property: property.id,
          operator: filter.operator,
          value: filter.value,
        };
      })
      .filter(Boolean) as Array<{
      property: string;
      operator: string;
      value?: unknown;
    }>;

    // Apply filters
    let filteredRows =
      normalizedFilters.length > 0
        ? filterDatabaseRows(database.rows, database.columns, normalizedFilters)
        : [...database.rows];

    // Apply sorting
    if (sort) {
      const sortColumn =
        propertyById.get(sort.property) ??
        propertyByName.get(sort.property.toLowerCase());

      if (sortColumn) {
        filteredRows = sortDatabaseRows(filteredRows, database.columns, {
          property: sortColumn.id,
          direction: sort.direction,
        });
      }
    }

    const totalCount = filteredRows.length;

    // Apply pagination
    const paginatedRows = filteredRows.slice(offset, offset + limit);

    // Format result rows
    const formattedRows = paginatedRows.map(row => {
      const cells: Record<string, DatabaseCell> = {};

      for (const column of database.columns) {
        const cell = row.cells[column.id];
        if (cell) {
          cells[column.id] = {
            value: cell.value,
            formatted: formatCellValue(cell.value, column.type, column.data),
          };

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

    return {
      database_id: database.blockId,
      doc_id: docId,
      title: database.title,
      total_rows: database.rows.length,
      matched_rows: totalCount,
      returned_rows: formattedRows.length,
      offset,
      limit,
      has_more: offset + formattedRows.length < totalCount,
      properties: database.columns.map(col => ({
        id: col.id,
        name: col.name,
        type: col.type,
        options:
          col.data && (col.type === 'select' || col.type === 'multiSelect')
            ? (
                col.data.options as Array<{
                  id: string;
                  value: string;
                  color?: string;
                }>
              )?.map(opt => ({
                id: opt.id,
                value: opt.value,
              }))
            : undefined,
      })),
      rows: formattedRows,
    };
  };
};

interface DatabaseCell {
  value: unknown;
  formatted: string;
  displayValue?: string;
}

export const createDatabaseQueryTool = (
  queryDatabase: (
    docId: string,
    databaseBlockId: string | undefined,
    filters: Array<{ property: string; operator: string; value?: unknown }>,
    sort: { property: string; direction: 'asc' | 'desc' } | undefined,
    limit: number,
    offset: number
  ) => Promise<ToolError | object>
) => {
  return defineTool({
    description: `
Query a database with filters, sorting, and pagination. Use this tool when you need to:
- Find specific rows matching criteria
- Sort data by a column
- Filter data (e.g., status="done", priority="high")
- Get paginated results from large databases

Available filter operators:
- equals: Exact match (for text, number, date, select)
- contains: Text contains substring (for text, richText)
- greater_than: Numeric/date comparison
- less_than: Numeric/date comparison
- is_empty: Check if cell is empty
- is_not_empty: Check if cell has a value

Example filters:
- {"property": "status", "operator": "equals", "value": "done"}
- {"property": "priority", "operator": "equals", "value": "high"}
- {"property": "title", "operator": "contains", "value": "meeting"}
- {"property": "due_date", "operator": "less_than", "value": "2024-12-31"}
- {"property": "assignee", "operator": "is_not_empty"}

The property name can be either the column name or the column ID.
`,
    inputSchema: z.object({
      doc_id: z.string().describe('The document ID containing the database'),
      database_block_id: z
        .string()
        .optional()
        .describe(
          'The database block ID (required if document has multiple databases)'
        ),
      filters: z
        .array(
          z.object({
            property: z.string().describe('The column name or ID to filter on'),
            operator: z.enum([
              'equals',
              'contains',
              'greater_than',
              'less_than',
              'is_empty',
              'is_not_empty',
            ]),
            value: z.any().optional().describe('The value to compare against'),
          })
        )
        .optional()
        .default([])
        .describe('Array of filter conditions'),
      sort: z
        .object({
          property: z.string().describe('The column name or ID to sort by'),
          direction: z.enum(['asc', 'desc']).default('asc'),
        })
        .optional()
        .describe('Sort configuration'),
      limit: z
        .number()
        .default(100)
        .describe('Maximum number of rows to return (default: 100, max: 1000)'),
      offset: z
        .number()
        .default(0)
        .describe('Number of rows to skip (for pagination)'),
    }),
    execute: async ({
      doc_id,
      database_block_id,
      filters,
      sort,
      limit,
      offset,
    }) => {
      try {
        const clampedLimit = Math.min(limit || 100, 1000);
        const result = await queryDatabase(
          doc_id,
          database_block_id,
          filters || [],
          sort,
          clampedLimit,
          offset
        );
        return isToolError(result) ? result : { ...result };
      } catch (err: any) {
        logger.error(`Failed to query database`, err);
        return toolError('Database Query Failed', err.message ?? String(err));
      }
    },
  });
};
