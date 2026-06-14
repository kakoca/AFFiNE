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

const logger = new Logger('TaskCreateTool');

export const buildTaskCreateHandler = (
  ac: AccessController,
  docWriter: DocWriter,
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
      propertyByName.get('due date') ??
      propertyByName.get('duedate') ??
      propertyByName.get('due') ??
      propertyByName.get('end');
    const assigneeCol =
      propertyByName.get('assignee') ??
      propertyByName.get('assigned to') ??
      propertyByName.get('assigned');
    const tagsCol = propertyByName.get('tags') ?? propertyByName.get('tag');
    const descriptionCol =
      propertyByName.get('description') ?? propertyByName.get('desc');

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

      if (task.description && descriptionCol) {
        taskCells[descriptionCol.id] = normalizeCellValue(
          task.description,
          descriptionCol.type,
          descriptionCol.data
        );
      }

      if (task.status && statusCol) {
        const validation = validateCellValue(
          task.status,
          statusCol.type,
          statusCol.data
        );
        if (!validation.valid) {
          validationErrors.push(
            `Task ${i + 1} (${task.title}): status: ${validation.error}`
          );
          continue;
        }
        taskCells[statusCol.id] = normalizeCellValue(
          task.status,
          statusCol.type,
          statusCol.data
        );
      }

      if (task.priority && priorityCol) {
        const validation = validateCellValue(
          task.priority,
          priorityCol.type,
          priorityCol.data
        );
        if (!validation.valid) {
          validationErrors.push(
            `Task ${i + 1} (${task.title}): priority: ${validation.error}`
          );
          continue;
        }
        taskCells[priorityCol.id] = normalizeCellValue(
          task.priority,
          priorityCol.type,
          priorityCol.data
        );
      }

      if (task.due_date && dueDateCol) {
        const validation = validateCellValue(
          task.due_date,
          dueDateCol.type,
          dueDateCol.data
        );
        if (!validation.valid) {
          validationErrors.push(
            `Task ${i + 1} (${task.title}): due_date: ${validation.error}`
          );
          continue;
        }
        taskCells[dueDateCol.id] = normalizeCellValue(
          task.due_date,
          dueDateCol.type,
          dueDateCol.data
        );
      }

      if (task.assignee && assigneeCol) {
        taskCells[assigneeCol.id] = normalizeCellValue(
          task.assignee,
          assigneeCol.type,
          assigneeCol.data
        );
      }

      if (task.tags && tagsCol) {
        const validation = validateCellValue(
          task.tags,
          tagsCol.type,
          tagsCol.data
        );
        if (!validation.valid) {
          validationErrors.push(
            `Task ${i + 1} (${task.title}): tags: ${validation.error}`
          );
          continue;
        }
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

    if (createdTasks.length === 0) {
      return toolError('Task Create Failed', 'No valid tasks to create');
    }

    try {
      // Prepare rows data for native function
      const rowsForNative: Record<string, unknown>[] = [];
      for (const task of createdTasks) {
        rowsForNative.push(task.cells);
      }

      // Call native Rust function to add tasks
      const rowsJson = JSON.stringify(rowsForNative);
      const updatedBinary = databaseAddRowsNative(
        Buffer.from(doc.bin),
        database.blockId,
        rowsJson
      );

      // Apply the update to the document
      await docWriter.updateDoc(
        options.workspace,
        docId,
        Buffer.from(updatedBinary).toString('base64'),
        options.user
      );

      return {
        success: true,
        database_id: database.blockId,
        database_title: database.title,
        doc_id: docId,
        tasks_created: createdTasks.length,
        tasks: createdTasks.map(task => ({
          index: task.index,
          title: task.title,
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
      };
    } catch (err: any) {
      logger.error(`Failed to create tasks in database`, err);
      return toolError('Task Create Failed', err.message ?? String(err));
    }
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
- Description: Task description or notes
- Status: Task status (e.g., "Not Started", "In Progress", "Done" / "Todo", "In Progress", "Completed")
- Priority: Priority level (e.g., "Low", "Medium", "High", "Urgent")
- Due Date: Due date (ISO format: YYYY-MM-DD or full ISO timestamp)
- Assignee: Person assigned to the task (name or user ID)
- Tags: Labels/categories as array of strings

The tool validates values against the database schema and returns errors for invalid data.
Values are automatically normalized (e.g., dates converted to timestamps, select options matched).

Example:
{
  "doc_id": "tasks-doc",
  "tasks": [
    {
      "title": "Review PR",
      "description": "Review the authentication refactoring PR",
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
            description: z
              .string()
              .optional()
              .describe('Task description or notes'),
            status: z
              .string()
              .optional()
              .describe(
                'Task status (e.g., "Not Started", "In Progress", "Done")'
              ),
            priority: z
              .string()
              .optional()
              .describe('Priority level (e.g., "Low", "Medium", "High")'),
            due_date: z
              .string()
              .optional()
              .describe('Due date (ISO 8601 format: YYYY-MM-DD)'),
            assignee: z
              .string()
              .optional()
              .describe('Assigned person name or ID'),
            tags: z
              .array(z.string())
              .optional()
              .describe('Tags/labels as array of strings'),
            custom_properties: z
              .record(z.any())
              .optional()
              .describe('Additional custom column values keyed by column name'),
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
