import { Logger } from '@nestjs/common';
import { z } from 'zod';

import { DocReader, type DocWriter } from '../../../core/doc';
import { AccessController } from '../../../core/permission';
import { Models } from '../../../models';
import {
  normalizeCellValue,
  parseDatabaseFromDoc,
  validateCellValue,
} from './database-utils';
import {
  documentSyncPendingError,
  workspaceSyncRequiredError,
} from './doc-sync';
import { type ToolError, toolError } from './error';
import { defineTool } from './tool';
import type { CopilotChatOptions } from './types';

const logger = new Logger('DatabaseUpdateCellsTool');

const isToolError = (result: ToolError | object): result is ToolError =>
  'type' in result && result.type === 'error';

export const buildDatabaseUpdateCellsHandler = (
  ac: AccessController,
  _docWriter: DocWriter,
  docReader: DocReader,
  models: Models
) => {
  return async (
    options: CopilotChatOptions,
    docId: string,
    databaseBlockId: string | undefined,
    updates: Array<{
      row_id: string;
      cells: Record<string, unknown>;
    }>
  ) => {
    if (!options?.user || !options?.workspace) {
      return toolError(
        'Update Cells Failed',
        'Missing user or workspace context'
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
      .can('Doc.Update');

    if (!canAccess) {
      return toolError(
        'Update Cells Failed',
        `You do not have permission to update document ${docId}.`
      );
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

    // Build property lookup
    const propertyById = new Map(database.columns.map(col => [col.id, col]));
    const propertyByName = new Map(
      database.columns.map(col => [col.name.toLowerCase(), col])
    );

    // Build row lookup
    const rowById = new Map(database.rows.map(row => [row.id, row]));

    const validationErrors: string[] = [];
    const validUpdates: Array<{
      row_id: string;
      cells: Record<string, unknown>;
    }> = [];

    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      const updateErrors: string[] = [];

      // Find row
      const row = rowById.get(update.row_id);
      if (!row) {
        validationErrors.push(
          `Update ${i + 1}: Row ${update.row_id} not found in database`
        );
        continue;
      }

      const normalizedCells: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(update.cells)) {
        // Find column by ID or name
        const column =
          propertyById.get(key) ?? propertyByName.get(key.toLowerCase());

        if (!column) {
          updateErrors.push(`Column "${key}" not found`);
          continue;
        }

        // Validate value
        const validation = validateCellValue(value, column.type, column.data);
        if (!validation.valid) {
          updateErrors.push(`${key}: ${validation.error}`);
          continue;
        }

        // Normalize value
        normalizedCells[column.id] = normalizeCellValue(
          value,
          column.type,
          column.data
        );
      }

      if (updateErrors.length > 0) {
        validationErrors.push(
          `Update ${i + 1} (${update.row_id}): ${updateErrors.join(', ')}`
        );
      } else if (Object.keys(normalizedCells).length > 0) {
        validUpdates.push({
          row_id: update.row_id,
          cells: normalizedCells,
        });
      }
    }

    if (validationErrors.length > 0) {
      return toolError(
        'Validation Failed',
        `Cell update validation errors:\n${validationErrors.join('\n')}`
      );
    }

    if (validUpdates.length === 0) {
      return toolError('Update Cells Failed', 'No valid cell updates');
    }

    // Format response with what would be updated
    const formattedUpdates = validUpdates.map(update => {
      const row = rowById.get(update.row_id);
      return {
        row_id: update.row_id,
        row_title: row?.title || 'Untitled Row',
        cells: Object.fromEntries(
          Object.entries(update.cells).map(([colId, value]) => {
            const col = propertyById.get(colId);
            return col ? [col.name, value] : [colId, value];
          })
        ),
      };
    });

    return {
      success: true,
      database_id: database.blockId,
      database_title: database.title,
      doc_id: docId,
      updates_requested: updates.length,
      updates_valid: validUpdates.length,
      updates: formattedUpdates,
      note: 'Cell updates validated. The AI uses doc_edit tool to apply these changes to the database.',
    };
  };
};

export const createDatabaseUpdateCellsTool = (
  updateCells: (
    docId: string,
    databaseBlockId: string | undefined,
    updates: Array<{
      row_id: string;
      cells: Record<string, unknown>;
    }>
  ) => Promise<ToolError | object>
) => {
  return defineTool({
    description: `
Update cell values in database rows. Use this when you need to:
- Change the status of tasks
- Update values in existing rows
- Modify multiple cells at once
- Batch edit row data

Each update must specify:
- row_id: The ID of the row to update
- cells: Object with column names/IDs as keys and new values as values

The tool validates each update:
- Row must exist in the database
- Columns must exist
- Values must match column type
- For select/multiSelect, values must be valid options

Example:
{
  "doc_id": "tasks-doc",
  "database_block_id": "db123",
  "updates": [
    {
      "row_id": "row456",
      "cells": {
        "Status": "Done",
        "Priority": "Low",
        "Notes": "Completed ahead of schedule"
      }
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
      updates: z
        .array(
          z.object({
            row_id: z.string().describe('The row ID to update'),
            cells: z
              .record(z.any())
              .describe('Cell values to update, keyed by column name or ID'),
          })
        )
        .min(1)
        .max(100)
        .describe('Array of cell updates'),
    }),
    execute: async ({ doc_id, database_block_id, updates }) => {
      try {
        const result = await updateCells(doc_id, database_block_id, updates);
        return isToolError(result) ? result : { ...result };
      } catch (err: any) {
        logger.error(`Failed to update cells`, err);
        return toolError('Update Cells Failed', err.message ?? String(err));
      }
    },
  });
};
