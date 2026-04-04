import { Logger } from '@nestjs/common';
import { z } from 'zod';

import { DocReader } from '../../../core/doc';
import { AccessController } from '../../../core/permission';
import { Models } from '../../../models';
import {
  filterDatabaseRows,
  formatCellValue,
  normalizeCellValue,
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

const logger = new Logger('TaskQueryTool');

const isToolError = (result: ToolError | object): result is ToolError =>
  'type' in result && result.type === 'error';

interface TaskQueryFilters {
  status?: string[];
  due_before?: string;
  due_after?: string;
  assignee?: string;
  priority?: string[];
  tags?: string[];
}

export const buildTaskQueryHandler = (
  ac: AccessController,
  docReader: DocReader,
  models: Models
) => {
  return async (
    options: CopilotChatOptions,
    docId: string,
    databaseBlockId: string | undefined,
    filters: TaskQueryFilters,
    limit: number,
    offset: number
  ) => {
    if (!options?.user || !options?.workspace) {
      return toolError(
        'Task Query Failed',
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
      .can('Doc.Read');

    if (!canAccess) {
      return toolError(
        'Task Query Failed',
        `You do not have permission to read document ${docId}.`
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
    const propertyByName = new Map(
      database.columns.map(col => [col.name.toLowerCase(), col])
    );
    const propertyById = new Map(database.columns.map(col => [col.id, col]));

    // Find task-related columns
    const titleCol =
      propertyByName.get('title') ??
      database.columns.find(c => c.type === 'title');
    const nameCol =
      propertyByName.get('name') ??
      database.columns.find(c => c.name.toLowerCase() === 'name');
    const statusCol = propertyByName.get('status');
    const priorityCol = propertyByName.get('priority');
    const dueDateCol =
      propertyByName.get('due date') ?? propertyByName.get('duedate');
    const assigneeCol =
      propertyByName.get('assignee') ?? propertyByName.get('assigned to');
    const tagsCol = propertyByName.get('tags');

    // Build filters for database
    const dbFilters: Array<{
      property: string;
      operator: string;
      value?: unknown;
    }> = [];

    if (filters.status && statusCol) {
      const statusValues = filters.status.map(s =>
        normalizeCellValue(s, statusCol.type, statusCol.data)
      );
      dbFilters.push(
        ...statusValues.map(s => ({
          property: statusCol.id,
          operator: 'equals',
          value: s,
        }))
      );
    }

    if (filters.priority && priorityCol) {
      const priorityValues = filters.priority.map(p =>
        normalizeCellValue(p, priorityCol.type, priorityCol.data)
      );
      dbFilters.push(
        ...priorityValues.map(p => ({
          property: priorityCol.id,
          operator: 'equals',
          value: p,
        }))
      );
    }

    if (filters.assignee && assigneeCol) {
      const assigneeValues = Array.isArray(filters.assignee)
        ? filters.assignee
        : [filters.assignee];
      dbFilters.push(
        ...assigneeValues.map(a => ({
          property: assigneeCol.id,
          operator: 'contains',
          value: a,
        }))
      );
    }

    if (filters.tags && tagsCol) {
      for (const tag of filters.tags) {
        dbFilters.push({
          property: tagsCol.id,
          operator: 'contains',
          value: normalizeCellValue(tag, tagsCol.type, tagsCol.data),
        });
      }
    }

    // Date filters
    if (dueDateCol) {
      if (filters.due_before) {
        const dueBeforeTime = new Date(filters.due_before).getTime();
        dbFilters.push({
          property: dueDateCol.id,
          operator: 'less_than',
          value: dueBeforeTime,
        });
      }

      if (filters.due_after) {
        const dueAfterTime = new Date(filters.due_after).getTime();
        dbFilters.push({
          property: dueDateCol.id,
          operator: 'greater_than',
          value: dueAfterTime,
        });
      }
    }

    // Apply filters
    let filteredRows =
      dbFilters.length > 0
        ? filterDatabaseRows(database.rows, database.columns, dbFilters)
        : [...database.rows];

    // Sort by due date if available, then by title
    const sortColumns = [dueDateCol?.id, titleCol?.id, nameCol?.id].filter(
      Boolean
    ) as string[];

    if (sortColumns.length > 0) {
      const primaryColumn = sortColumns[0];
      filteredRows = sortDatabaseRows(filteredRows, database.columns, {
        property: primaryColumn,
        direction: 'asc',
      });
    }

    const totalCount = filteredRows.length;
    const paginatedRows = filteredRows.slice(offset, offset + limit);

    // Format tasks
    const tasks = paginatedRows.map(row => {
      const task: Record<string, unknown> = {
        row_id: row.id,
        title: row.title || 'Untitled',
      };

      if (statusCol && row.cells[statusCol.id]) {
        task.status = formatCellValue(
          row.cells[statusCol.id].value,
          statusCol.type,
          statusCol.data
        );
      }

      if (priorityCol && row.cells[priorityCol.id]) {
        task.priority = formatCellValue(
          row.cells[priorityCol.id].value,
          priorityCol.type,
          priorityCol.data
        );
      }

      if (dueDateCol && row.cells[dueDateCol.id]) {
        task.due_date = formatCellValue(
          row.cells[dueDateCol.id].value,
          dueDateCol.type,
          dueDateCol.data
        );
      }

      if (assigneeCol && row.cells[assigneeCol.id]) {
        task.assignee = formatCellValue(
          row.cells[assigneeCol.id].value,
          assigneeCol.type,
          assigneeCol.data
        );
      }

      if (tagsCol && row.cells[tagsCol.id]) {
        task.tags = formatCellValue(
          row.cells[tagsCol.id].value,
          tagsCol.type,
          tagsCol.data
        );
      }

      // Include all cell values
      task.cells = Object.fromEntries(
        Object.entries(row.cells).map(([colId, cell]) => {
          const col = propertyById.get(colId);
          return col ? [col.name, cell.value] : [colId, cell.value];
        })
      );

      return task;
    });

    // Calculate summary statistics
    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};

    for (const row of database.rows) {
      if (statusCol && row.cells[statusCol.id]) {
        const status = formatCellValue(
          row.cells[statusCol.id].value,
          statusCol.type,
          statusCol.data
        );
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }
      if (priorityCol && row.cells[priorityCol.id]) {
        const priority = formatCellValue(
          row.cells[priorityCol.id].value,
          priorityCol.type,
          priorityCol.data
        );
        priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
      }
    }

    return {
      database_id: database.blockId,
      database_title: database.title,
      doc_id: docId,
      total_tasks: database.rows.length,
      matched_tasks: totalCount,
      returned_tasks: tasks.length,
      offset,
      limit,
      has_more: offset + tasks.length < totalCount,
      detected_columns: {
        title: titleCol?.name,
        status: statusCol?.name,
        priority: priorityCol?.name,
        due_date: dueDateCol?.name,
        assignee: assigneeCol?.name,
        tags: tagsCol?.name,
      },
      summary: {
        status_counts: statusCounts,
        priority_counts: priorityCounts,
      },
      filters_applied: {
        status: filters.status,
        priority: filters.priority,
        assignee: filters.assignee,
        due_before: filters.due_before,
        due_after: filters.due_after,
        tags: filters.tags,
      },
      tasks,
    };
  };
};

export const createTaskQueryTool = (
  queryTasks: (
    docId: string,
    databaseBlockId: string | undefined,
    filters: TaskQueryFilters,
    limit: number,
    offset: number
  ) => Promise<ToolError | object>
) => {
  return defineTool({
    description: `
Query tasks from a database with flexible filtering and sorting. This tool is optimized for task management workflows.

Auto-detected columns:
- Title: Task title/name
- Status: Task status (e.g., "Not Started", "In Progress", "Done")
- Priority: Priority level (e.g., "Low", "Medium", "High")
- Due Date: Due date
- Assignee: Assigned person
- Tags: Labels/categories

Filters:
- status: Array of status values to include
- priority: Array of priority values to include
- assignee: Filter by assignee name (partial match)
- due_before: ISO date string - tasks due before this date
- due_after: ISO date string - tasks due after this date
- tags: Array of tag values to include

Aggregation:
The tool returns summary statistics including:
- status_counts: Count of tasks by status
- priority_counts: Count of tasks by priority

Default sort order:
1. Due date (ascending - earliest first)
2. Title (alphabetical)

Example:
{
  "doc_id": "tasks-doc",
  "filters": {
    "status": ["In Progress", "Not Started"],
    "priority": ["High", "Urgent"],
    "due_before": "2024-12-31"
  },
  "limit": 50
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
      filters: z
        .object({
          status: z
            .array(z.string())
            .optional()
            .describe('Filter by status values'),
          due_before: z
            .string()
            .optional()
            .describe('Tasks due before this date (ISO format)'),
          due_after: z
            .string()
            .optional()
            .describe('Tasks due after this date (ISO format)'),
          assignee: z
            .string()
            .optional()
            .describe('Filter by assignee (partial match)'),
          priority: z
            .array(z.string())
            .optional()
            .describe('Filter by priority values'),
          tags: z.array(z.string()).optional().describe('Filter by tag values'),
        })
        .optional()
        .default({})
        .describe('Filter conditions'),
      limit: z
        .number()
        .default(100)
        .describe('Maximum number of tasks to return'),
      offset: z.number().default(0).describe('Number of tasks to skip'),
    }),
    execute: async ({ doc_id, database_block_id, filters, limit, offset }) => {
      try {
        const clampedLimit = Math.min(limit || 100, 1000);
        const result = await queryTasks(
          doc_id,
          database_block_id,
          filters || {},
          clampedLimit,
          offset
        );
        return isToolError(result) ? result : { ...result };
      } catch (err: any) {
        logger.error(`Failed to query tasks`, err);
        return toolError('Task Query Failed', err.message ?? String(err));
      }
    },
  });
};
