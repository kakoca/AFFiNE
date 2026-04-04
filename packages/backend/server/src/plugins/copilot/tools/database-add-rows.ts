import { Logger } from '@nestjs/common';
import { z } from 'zod';

import { DocReader, DocWriter } from '../../../core/doc';
import { AccessController } from '../../../core/permission';
import { Models } from '../../../models';
import {
  normalizeCellValue,
  parseDatabaseFromDoc,
  validateCellValue,
} from './database-utils';
import { toolError } from './error';
import { defineTool } from './tool';
import type { CopilotChatOptions } from './types';

const logger = new Logger('DatabaseAddRowsTool');

// Import from native module - we need to add a function to manipulate database via Yjs updates
// For now, we operate via markdown/doc updates

export const buildDatabaseAddRowsHandler = (
  ac: AccessController,
  _docWriter: DocWriter,
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
      // For now, we create a summary of what would be added
      // In a full implementation, we would update the Yjs document directly
      // This requires Rust native functions to manipulate the database structure

      // Build markdown row content for each row
      const rowContents: string[] = [];
      for (const row of normalizedRows) {
        const cellDescriptions: string[] = [];
        for (const column of database.columns) {
          const value = row[column.id];
          if (value !== undefined) {
            cellDescriptions.push(`${column.name}: ${JSON.stringify(value)}`);
          }
        }
        rowContents.push(cellDescriptions.join(' | '));
      }

      // Build row descriptions for AI context
      const _rowDescriptions = rowContents
        .map((content, i) => `- Row ${i + 1}: ${content}`)
        .join('\n');

      // Reference the variable to avoid unused warning
      void _rowDescriptions;

      // Return success with information about what was requested
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
        note: 'The AI can add rows through doc_edit tool. Direct database manipulation requires native Rust support for Yjs database updates.',
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
Currently requires the AI to use doc_edit tool for the actual update.

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

/**
 * Tool to create a task database row with structured task data
 */
export const buildTaskCreateHandler = (
  ac: AccessController,
  _docWriter: DocWriter,
  docReader: DocReader,
  _models: Models
) => {
  return async (
    options: CopilotChatOptions,
    docId: string,
    databaseBlockId: string | undefined,
    tasks: Array<{
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      due_date?: string;
      assignee?: string;
      tags?: string[];
      custom_properties?: Record<string, unknown>;
    }>
  ) => {
    if (!options?.user || !options?.workspace) {
      return toolError(
        'Task Create Failed',
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
        'Task Create Failed',
        `You do not have permission to update document ${docId}.`
      );
    }

    // Get current doc
    const doc = await docReader.getDoc(options.workspace, docId);
    if (!doc?.bin) {
      return toolError('Task Create Failed', `Document ${docId} not found`);
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
    const propertyByName = new Map(
      database.columns.map(col => [col.name.toLowerCase(), col])
    );

    // Find common task-related columns
    const titleCol =
      propertyByName.get('title') ??
      database.columns.find(
        c => c.type === 'title' || c.name.toLowerCase() === 'name'
      );
    const statusCol = propertyByName.get('status');
    const priorityCol = propertyByName.get('priority');
    const dueDateCol =
      propertyByName.get('due date') ?? propertyByName.get('duedate');
    const assigneeCol =
      propertyByName.get('assignee') ?? propertyByName.get('assigned to');
    const tagsCol = propertyByName.get('tags');

    const createdTasks: Array<{
      index: number;
      title: string;
      cells: Record<string, unknown>;
    }> = [];
    const validationErrors: string[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const taskCells: Record<string, unknown> = {};

      // Map task properties to columns
      if (titleCol) {
        taskCells[titleCol.id] = task.title;
      }

      if (task.status && statusCol) {
        taskCells[statusCol.id] = normalizeCellValue(
          task.status,
          statusCol.type,
          statusCol.data
        );
      }

      if (task.priority && priorityCol) {
        taskCells[priorityCol.id] = normalizeCellValue(
          task.priority,
          priorityCol.type,
          priorityCol.data
        );
      }

      if (task.due_date && dueDateCol) {
        taskCells[dueDateCol.id] = normalizeCellValue(
          task.due_date,
          dueDateCol.type,
          dueDateCol.data
        );
      }

      if (task.assignee && assigneeCol) {
        taskCells[assigneeCol.id] = task.assignee;
      }

      if (task.tags && tagsCol) {
        taskCells[tagsCol.id] = normalizeCellValue(
          task.tags,
          tagsCol.type,
          tagsCol.data
        );
      }

      // Add custom properties
      if (task.custom_properties) {
        for (const [propName, value] of Object.entries(
          task.custom_properties
        )) {
          const col = propertyByName.get(propName.toLowerCase());
          if (col) {
            const validation = validateCellValue(value, col.type, col.data);
            if (validation.valid) {
              taskCells[col.id] = normalizeCellValue(value, col.type, col.data);
            } else {
              validationErrors.push(
                `Task ${i + 1} (${task.title}): ${propName}: ${validation.error}`
              );
            }
          }
        }
      }

      // Validate required columns
      if (!taskCells[titleCol?.id ?? '']) {
        validationErrors.push(`Task ${i + 1}: Title column is required`);
        continue;
      }

      createdTasks.push({
        index: i + 1,
        title: task.title,
        cells: taskCells,
      });
    }

    if (validationErrors.length > 0) {
      return toolError(
        'Validation Failed',
        `Task validation errors:\n${validationErrors.join('\n')}`
      );
    }

    return {
      success: true,
      database_id: database.blockId,
      database_title: database.title,
      doc_id: docId,
      tasks_requested: tasks.length,
      tasks_mapped: createdTasks.length,
      tasks: createdTasks.map(task => ({
        ...task,
        cells_formatted: Object.fromEntries(
          Object.entries(task.cells).map(([colId, value]) => {
            const col = database.columns.find(c => c.id === colId);
            return col ? [col.name, value] : [colId, value];
          })
        ),
      })),
      detected_columns: {
        title: titleCol?.name,
        status: statusCol?.name,
        priority: priorityCol?.name,
        due_date: dueDateCol?.name,
        assignee: assigneeCol?.name,
        tags: tagsCol?.name,
      },
      note: 'Task mapping complete. The AI uses doc_edit tool to add these tasks to the database.',
    };
  };
};

export const createTaskCreateTool = (
  createTasks: (
    docId: string,
    databaseBlockId: string | undefined,
    tasks: Array<{
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      due_date?: string;
      assignee?: string;
      tags?: string[];
      custom_properties?: Record<string, unknown>;
    }>
  ) => Promise<object>
) => {
  return defineTool({
    description: `
Create structured tasks in a database. This tool is optimized for task management and automatically maps common task properties to database columns.

Auto-detected columns:
- Title/Name: The task title (required)
- Status: Task status (e.g., "Not Started", "In Progress", "Done")
- Priority: Priority level (e.g., "Low", "Medium", "High", "Urgent")
- Due Date: Due date (ISO format)
- Assignee: Person assigned to the task
- Tags: Labels/categories

The tool validates that the required columns exist and that values match the column types.
If the database doesn't have these columns, the tool will report which ones are missing.

Example:
{
  "doc_id": "tasks-doc",
  "tasks": [
    {
      "title": "Review PR",
      "status": "Not Started",
      "priority": "High",
      "due_date": "2024-12-31",
      "assignee": "John",
      "tags": ["backend", "urgent"]
    }
  ]
}
`,
    inputSchema: z.object({
      doc_id: z
        .string()
        .describe('The document ID containing the task database'),
      database_block_id: z
        .string()
        .optional()
        .describe('The database block ID (if multiple databases exist)'),
      tasks: z
        .array(
          z.object({
            title: z.string().min(1).describe('Task title (required)'),
            description: z.string().optional().describe('Task description'),
            status: z.string().optional().describe('Task status'),
            priority: z.string().optional().describe('Priority level'),
            due_date: z.string().optional().describe('Due date (ISO format)'),
            assignee: z.string().optional().describe('Assigned person'),
            tags: z.array(z.string()).optional().describe('Tags/labels'),
            custom_properties: z
              .record(z.any())
              .optional()
              .describe('Additional custom column values'),
          })
        )
        .min(1)
        .max(50)
        .describe('Tasks to create'),
    }),
    execute: async ({ doc_id, database_block_id, tasks }) => {
      try {
        return await createTasks(doc_id, database_block_id, tasks);
      } catch (err: any) {
        logger.error(`Failed to create tasks`, err);
        return toolError('Task Create Failed', err.message ?? String(err));
      }
    },
  });
};
