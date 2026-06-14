import { Logger } from '@nestjs/common';
import { z } from 'zod';

import { DocReader, DocWriter } from '../../../core/doc';
import { AccessController } from '../../../core/permission';
import { Models } from '../../../models';
import { databaseAddRowsNative } from '../../../native';
import {
  normalizeCellValue,
  parseDatabaseFromDoc,
  validateCellValue,
} from './database-utils';
import { toolError } from './error';
import { defineTool } from './tool';
import type { CopilotChatOptions } from './types';

const logger = new Logger('DatabaseAddRowsTool');

export const buildDatabaseAddRowsHandler = (
  ac: AccessController,
  docWriter: DocWriter,
  docReader: DocReader,
  _models: Models
) => {
  return async (
    options: CopilotChatOptions,
    docId: string,
    databaseBlockId: string | undefined,
    rows: Array<Record<string, unknown>>
  ) => {
    if (!options?.user || !options?.workspace) {
      return toolError('Add Rows Failed', 'Missing user or workspace context');
    }

    // Check update permission
    const canAccess = await ac
      .user(options.user)
      .workspace(options.workspace)
      .doc(docId)
      .can('Doc.Update');

    if (!canAccess) {
      return toolError(
        'Add Rows Failed',
        `You do not have permission to update document ${docId}.`
      );
    }

    // Get current doc to validate database exists
    const doc = await docReader.getDoc(options.workspace, docId);
    if (!doc?.bin) {
      return toolError('Add Rows Failed', `Document ${docId} not found`);
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

    // Build property lookup maps
    const propertyByName = new Map(
      database.columns.map(col => [col.name.toLowerCase(), col])
    );
    const propertyById = new Map(database.columns.map(col => [col.id, col]));

    // Validate and normalize each row
    const validationErrors: string[] = [];
    const normalizedRows: Array<Record<string, unknown>> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowErrors: string[] = [];
      const normalizedRow: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(row)) {
        // Find the column by name or ID
        const column =
          propertyById.get(key) ?? propertyByName.get(key.toLowerCase());

        if (!column) {
          rowErrors.push(`Column "${key}" not found`);
          continue;
        }

        // Validate value
        const validation = validateCellValue(value, column.type, column.data);
        if (!validation.valid) {
          rowErrors.push(`${key}: ${validation.error}`);
          continue;
        }

        // Normalize value
        normalizedRow[column.id] = normalizeCellValue(
          value,
          column.type,
          column.data
        );
      }

      if (rowErrors.length > 0) {
        validationErrors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`);
      } else {
        normalizedRows.push(normalizedRow);
      }
    }

    if (validationErrors.length > 0) {
      return toolError(
        'Validation Failed',
        `Row validation errors:\n${validationErrors.join('\n')}`
      );
    }

    if (normalizedRows.length === 0) {
      return toolError('Add Rows Failed', 'No valid rows to add');
    }

    try {
      // Prepare rows data for native function
      // Convert normalized rows to the format expected by the native function
      const rowsForNative: Record<string, unknown>[] = [];
      for (const row of normalizedRows) {
        const rowData: Record<string, unknown> = {};
        for (const [colId, value] of Object.entries(row)) {
          rowData[colId] = value;
        }
        rowsForNative.push(rowData);
      }

      // Call native Rust function to add rows
      const rowsJson = JSON.stringify(rowsForNative);
      const updatedBinary = databaseAddRowsNative(
        Buffer.from(doc.bin),
        database.blockId,
        rowsJson
      );

      // Apply the update to the document
      await docWriter.pushRawUpdate(
        options.workspace,
        docId,
        updatedBinary,
        options.user
      );

      return {
        success: true,
        database_id: database.blockId,
        database_title: database.title,
        doc_id: docId,
        rows_requested: rows.length,
        rows_added: normalizedRows.length,
        rows: normalizedRows.map((row, i) => ({
          index: i + 1,
          cells: Object.fromEntries(
            Object.entries(row).map(([colId, value]) => {
              const col = propertyById.get(colId);
              return col ? [col.name, value] : [colId, value];
            })
          ),
        })),
      };
    } catch (err: any) {
      logger.error(`Failed to add rows to database`, err);
      return toolError('Add Rows Failed', err.message ?? String(err));
    }
  };
};

export const createDatabaseAddRowsTool = (
  addRows: (
    docId: string,
    databaseBlockId: string | undefined,
    rows: Array<Record<string, unknown>>
  ) => Promise<object>
) => {
  return defineTool({
    description: `
Add new rows to a database. Use this when the user wants to:
- Create new entries in a database
- Add tasks, notes, or data to a table
- Batch add multiple rows

Each row should contain cell values keyed by column name or column ID.
Cell values should match the column type:
- text/richText: string
- number: number
- checkbox: boolean
- date: ISO 8601 date string or timestamp
- select: option value or ID
- multiSelect: array of option values or IDs
- progress: number (0-100)

The tool validates cell values before adding and returns errors for invalid data.
Updates are applied directly to the document using native Yjs manipulation.

Example:
{
  "doc_id": "doc123",
  "database_block_id": "db456",
  "rows": [
    {
      "Title": "New Task",
      "Status": "Not Started",
      "Priority": "High",
      "Due Date": "2024-12-31"
    }
  ]
}
`,
    inputSchema: z.object({
      doc_id: z.string().describe('The document ID containing the database'),
      database_block_id: z
        .string()
        .optional()
        .describe(
          'The database block ID (required if document has multiple databases)'
        ),
      rows: z
        .array(z.record(z.any()))
        .min(1)
        .max(100)
        .describe(
          'Array of row data. Each row is an object with column names/IDs as keys and cell values as values'
        ),
    }),
    execute: async ({ doc_id, database_block_id, rows }) => {
      try {
        return await addRows(doc_id, database_block_id, rows);
      } catch (err: any) {
        logger.error(`Failed to add rows`, err);
        return toolError('Add Rows Failed', err.message ?? String(err));
      }
    },
  });
};
