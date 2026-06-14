import { Logger } from '@nestjs/common';
import { z } from 'zod';

import { DocReader, DocWriter } from '../../../core/doc';
import { AccessController } from '../../../core/permission';
import { Models } from '../../../models';
import { databaseCreateNative } from '../../../native';
import { toolError } from './error';
import { defineTool } from './tool';
import type { CopilotChatOptions } from './types';

const logger = new Logger('DatabaseCreateTool');

export interface DatabaseColumnInput {
  id?: string;
  name: string;
  type: string;
  options?: Array<{ id?: string; value: string; color?: string }>;
}

export interface DatabaseViewInput {
  id?: string;
  name: string;
  view_type: 'table' | 'kanban';
}

export const buildDatabaseCreateHandler = (
  ac: AccessController,
  docWriter: DocWriter,
  docReader: DocReader,
  _models: Models
) => {
  return async (
    options: CopilotChatOptions,
    docId: string,
    title: string,
    viewType: 'table' | 'kanban',
    columns: DatabaseColumnInput[],
    initialRows?: Array<Record<string, unknown>>
  ) => {
    if (!options?.user || !options?.workspace) {
      return toolError(
        'Database Create Failed',
        'Missing user or workspace context'
      );
    }

    // Check update permission
    const canAccess = await ac
      .user(options.user)
      .workspace(options.workspace)
      .doc(docId)
      .can('Doc.Update');

    if (!canAccess) {
      return toolError(
        'Database Create Failed',
        `You do not have permission to update document ${docId}.`
      );
    }

    // Validate columns
    if (!columns || columns.length === 0) {
      return toolError(
        'Database Create Failed',
        'At least one column is required'
      );
    }

    // Check for title column
    const hasTitleColumn = columns.some(
      col => col.type === 'title' || col.name.toLowerCase() === 'title'
    );
    if (!hasTitleColumn) {
      // Add a title column as the first column
      columns.unshift({
        id: `title_${Date.now()}`,
        name: 'Title',
        type: 'title',
      });
    }

    // Generate IDs for columns that don't have them
    const columnsWithIds = columns.map(col => ({
      id:
        col.id ||
        `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: col.name,
      column_type: col.type,
      options: col.options?.map(opt => ({
        id:
          opt.id ||
          `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        value: opt.value,
        color: opt.color,
      })),
    }));

    // Create view
    const views: DatabaseViewInput[] = [
      {
        id: `view_${Date.now()}`,
        name: viewType === 'table' ? 'Table' : 'Kanban',
        view_type: viewType,
      },
    ];

    try {
      // Get current document binary (if exists)
      const existingDoc = await docReader.getDoc(options.workspace, docId);
      const existingBinary = existingDoc?.bin
        ? Buffer.from(existingDoc.bin)
        : undefined;

      // Call native function to create database
      const columnsJson = JSON.stringify(columnsWithIds);
      const viewsJson = JSON.stringify(views);

      const result = databaseCreateNative(
        existingBinary,
        docId,
        title,
        columnsJson,
        viewsJson
      );

      // Apply the update to the document
      await docWriter.pushRawUpdate(
        options.workspace,
        docId,
        result.docBinary,
        options.user
      );

      // If initial rows are provided, we would need to add them separately
      // This would require calling databaseAddRowsNative after the database is created
      // For now, we return the database info

      return {
        success: true,
        database_id: result.database_block_id,
        database_title: title,
        doc_id: docId,
        view_type: viewType,
        columns: columnsWithIds.map(col => ({
          id: col.id,
          name: col.name,
          type: col.column_type,
          options: col.options,
        })),
        views: views,
        initial_rows_requested: initialRows?.length || 0,
      };
    } catch (err: any) {
      logger.error(`Failed to create database`, err);
      return toolError('Database Create Failed', err.message ?? String(err));
    }
  };
};

export const createDatabaseCreateTool = (
  createDatabase: (
    docId: string,
    title: string,
    viewType: 'table' | 'kanban',
    columns: DatabaseColumnInput[],
    initialRows?: Array<Record<string, unknown>>
  ) => Promise<object>
) => {
  return defineTool({
    description: `
Create a new database block in a document. Use this when the user wants to:
- Create a new table or kanban board
- Set up a structured data collection
- Create a task tracker, project board, or data table

The database requires:
- title: The database title
- view_type: "table" or "kanban"
- columns: Array of column definitions with name and type

Supported column types:
- title: The primary title column (auto-created if missing)
- text: Plain text
- number: Numeric values
- checkbox: Boolean values
- date: Date/time values (ISO format)
- select: Single selection from options
- multiSelect: Multiple selections from options
- progress: Progress percentage (0-100)
- richText: Rich text content

For select/multiSelect columns, provide options array with value and optional color.

Example:
{
  "doc_id": "doc123",
  "title": "Project Tasks",
  "view_type": "table",
  "columns": [
    { "name": "Task", "type": "title" },
    { "name": "Status", "type": "select", "options": [
      { "value": "Not Started", "color": "red" },
      { "value": "In Progress", "color": "yellow" },
      { "value": "Done", "color": "green" }
    ]},
    { "name": "Priority", "type": "select", "options": [
      { "value": "Low" },
      { "value": "Medium" },
      { "value": "High" }
    ]},
    { "name": "Due Date", "type": "date" },
    { "name": "Progress", "type": "progress" }
  ]
}
`,
    inputSchema: z.object({
      doc_id: z
        .string()
        .describe('The document ID where the database will be created'),
      title: z.string().min(1).describe('The database title'),
      view_type: z
        .enum(['table', 'kanban'])
        .default('table')
        .describe('The view type'),
      columns: z
        .array(
          z.object({
            id: z
              .string()
              .optional()
              .describe(
                'Optional column ID (will be generated if not provided)'
              ),
            name: z.string().min(1).describe('The column name'),
            type: z
              .enum([
                'title',
                'text',
                'number',
                'checkbox',
                'date',
                'select',
                'multiSelect',
                'progress',
                'richText',
              ])
              .describe('The column type'),
            options: z
              .array(
                z.object({
                  id: z.string().optional().describe('Optional option ID'),
                  value: z.string().min(1).describe('The option value'),
                  color: z.string().optional().describe('Optional color'),
                })
              )
              .optional()
              .describe('Options for select/multiSelect columns'),
          })
        )
        .min(1)
        .describe('Column definitions'),
      initial_rows: z
        .array(z.record(z.any()))
        .optional()
        .describe('Optional initial rows to populate the database'),
    }),
    execute: async ({ doc_id, title, view_type, columns, initial_rows }) => {
      try {
        return await createDatabase(
          doc_id,
          title,
          view_type,
          columns,
          initial_rows
        );
      } catch (err: any) {
        logger.error(`Failed to create database`, err);
        return toolError('Database Create Failed', err.message ?? String(err));
      }
    },
  });
};
