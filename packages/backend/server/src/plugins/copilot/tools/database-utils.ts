import { Logger } from '@nestjs/common';

import { readAllBlocksFromDocSnapshot } from '../../../core/utils/blocksuite';

const logger = new Logger('DatabaseUtils');

export interface DatabaseColumn {
  id: string;
  name: string;
  type: string;
  data?: Record<string, unknown>;
}

export interface DatabaseCell {
  value: unknown;
  columnId: string;
}

export interface DatabaseRow {
  id: string;
  cells: Record<string, DatabaseCell>;
  title?: string;
}

export interface DatabaseInfo {
  blockId: string;
  title: string;
  columns: DatabaseColumn[];
  rows: DatabaseRow[];
  views: DatabaseView[];
}

export interface DatabaseView {
  id: string;
  name: string;
  mode: 'table' | 'kanban';
}

export interface ParsedBlock {
  blockId: string;
  flavour: string;
  content?: string[];
  parentBlockId?: string;
  parentFlavour?: string;
  additional?: Record<string, unknown>;
}

export interface ParsedDoc {
  blocks: ParsedBlock[];
  title: string;
  summary: string;
}

/**
 * Parse database columns from block data
 * The columns are stored in prop:columns as an array of objects
 */
function parseDatabaseColumns(
  additional?: Record<string, unknown> | null
): DatabaseColumn[] {
  if (!additional?.columns) {
    return [];
  }

  const columns = additional.columns as Array<{
    id: string;
    name: string;
    type: string;
    data?: Record<string, unknown>;
  }>;

  return columns.map(col => ({
    id: col.id,
    name: col.name,
    type: col.type,
    data: col.data,
  }));
}

/**
 * Parse database cells from block data
 * Cells are stored in prop:cells as a nested map: rowId -> columnId -> cell data
 */
function parseDatabaseCells(
  additional?: Record<string, unknown> | null
): Record<string, Record<string, DatabaseCell>> {
  const result: Record<string, Record<string, DatabaseCell>> = {};

  if (!additional?.cells) {
    return result;
  }

  const cells = additional.cells as Record<
    string,
    Record<string, { value: unknown; columnId: string }>
  >;

  for (const [rowId, rowCells] of Object.entries(cells)) {
    result[rowId] = {};
    for (const [columnId, cell] of Object.entries(rowCells)) {
      result[rowId][columnId] = {
        value: cell.value,
        columnId: cell.columnId,
      };
    }
  }

  return result;
}

/**
 * Parse database views from block data
 */
function parseDatabaseViews(
  additional?: Record<string, unknown> | null
): DatabaseView[] {
  if (!additional?.views) {
    return [];
  }

  const views = additional.views as Array<{
    id: string;
    name: string;
    mode: 'table' | 'kanban';
  }>;

  return views.map(view => ({
    id: view.id,
    name: view.name,
    mode: view.mode,
  }));
}

/**
 * Parse a Yjs document binary and extract database information
 * Returns the first database found, or a specific one if databaseBlockId is provided
 */
export async function parseDatabaseFromDoc(
  docBinary: Uint8Array,
  databaseBlockId?: string
): Promise<DatabaseInfo | null> {
  try {
    const parsed = (await readAllBlocksFromDocSnapshot(
      'temp-doc',
      docBinary
    )) as unknown as ParsedDoc;

    if (!parsed.blocks || parsed.blocks.length === 0) {
      return null;
    }

    // Find database blocks
    const databaseBlocks = parsed.blocks.filter(
      block => block.flavour === 'affine:database'
    );

    if (databaseBlocks.length === 0) {
      return null;
    }

    // Select the specific database or the first one
    let databaseBlock: ParsedBlock;
    if (databaseBlockId) {
      databaseBlock = databaseBlocks.find(
        block => block.blockId === databaseBlockId
      ) as ParsedBlock;
      if (!databaseBlock) {
        return null;
      }
    } else {
      databaseBlock = databaseBlocks[0];
    }

    // Extract database metadata
    const additional = databaseBlock.additional;
    const title = (additional?.title as string) || 'Untitled Database';

    // Parse columns
    const columns = parseDatabaseColumns(additional);

    // Parse cells
    const allCells = parseDatabaseCells(additional);

    // Parse views
    const views = parseDatabaseViews(additional);

    // Find rows (child blocks of the database)
    const rowBlocks = parsed.blocks.filter(
      block =>
        block.parentBlockId === databaseBlock.blockId &&
        block.flavour === 'affine:paragraph'
    );

    // Build rows with cells
    const rows: DatabaseRow[] = rowBlocks.map(rowBlock => {
      const rowId = rowBlock.blockId;
      const rowCells: Record<string, DatabaseCell> = {};

      // Get cells for this row
      const cellsForRow = allCells[rowId] || {};

      // Map cells to columns
      for (const column of columns) {
        const cell = cellsForRow[column.id];
        if (cell) {
          rowCells[column.id] = cell;
        }
      }

      // Extract title from paragraph content
      const titleText = rowBlock.content?.join('\n') || '';

      return {
        id: rowId,
        cells: rowCells,
        title: titleText,
      };
    });

    return {
      blockId: databaseBlock.blockId,
      title,
      columns,
      rows,
      views,
    };
  } catch (error) {
    logger.error('Failed to parse database from doc', error);
    return null;
  }
}

/**
 * Find all databases in a document
 */
export async function findAllDatabases(
  docBinary: Uint8Array
): Promise<Array<{ blockId: string; title: string }>> {
  try {
    const parsed = (await readAllBlocksFromDocSnapshot(
      'temp-doc',
      docBinary
    )) as unknown as ParsedDoc;

    if (!parsed.blocks) {
      return [];
    }

    return parsed.blocks
      .filter(block => block.flavour === 'affine:database')
      .map(block => ({
        blockId: block.blockId,
        title: (block.additional?.title as string) || 'Untitled Database',
      }));
  } catch (error) {
    logger.error('Failed to find databases in doc', error);
    return [];
  }
}

/**
 * Format cell value for display based on column type
 */
export function formatCellValue(
  value: unknown,
  columnType: string,
  columnData?: Record<string, unknown>
): string {
  if (value === null || value === undefined) {
    return '';
  }

  switch (columnType) {
    case 'text':
    case 'richText':
      return String(value);

    case 'number':
      return String(value);

    case 'checkbox':
      return value ? '☑' : '☐';

    case 'date': {
      if (typeof value === 'number') {
        return new Date(value).toISOString().split('T')[0];
      }
      return String(value);
    }

    case 'select': {
      // Value is the option ID, need to look up the display value
      if (columnData?.options) {
        const options = columnData.options as Array<{
          id: string;
          value: string;
          color?: string;
        }>;
        const option = options.find(opt => opt.id === value);
        return option?.value || String(value);
      }
      return String(value);
    }

    case 'multiSelect': {
      // Value is array of option IDs
      if (Array.isArray(value) && columnData?.options) {
        const options = columnData.options as Array<{
          id: string;
          value: string;
          color?: string;
        }>;
        const selectedValues = value
          .map(id => {
            const option = options.find(opt => opt.id === id);
            return option?.value || String(id);
          })
          .filter(Boolean);
        return selectedValues.join(', ');
      }
      return String(value);
    }

    case 'progress':
      return `${value}%`;

    case 'title':
      return String(value);

    case 'created-time':
      return typeof value === 'number'
        ? new Date(value).toISOString()
        : String(value);

    default:
      return String(value);
  }
}

/**
 * Normalize cell value to the correct type for the database
 */
export function normalizeCellValue(
  value: unknown,
  columnType: string,
  columnData?: Record<string, unknown>
): unknown {
  switch (columnType) {
    case 'checkbox':
      return Boolean(value);

    case 'number':
    case 'progress':
      return Number(value);

    case 'date': {
      if (typeof value === 'string') {
        return new Date(value).getTime();
      }
      return value;
    }

    case 'multiSelect': {
      if (typeof value === 'string') {
        // Check if it's a comma-separated list
        return value.split(',').map(v => v.trim());
      }
      if (Array.isArray(value)) {
        return value;
      }
      return [];
    }

    case 'select': {
      // For select, validate that the value exists in options
      if (columnData?.options) {
        const options = columnData.options as Array<{
          id: string;
          value: string;
        }>;
        // If value is a string that matches an option name, use the option ID
        const matchingOption = options.find(
          opt => opt.value === value || opt.id === value
        );
        if (matchingOption) {
          return matchingOption.id;
        }
      }
      return value;
    }

    default:
      return String(value);
  }
}

/**
 * Validate cell value against column type and constraints
 */
export function validateCellValue(
  value: unknown,
  columnType: string,
  columnData?: Record<string, unknown>
): { valid: boolean; error?: string } {
  switch (columnType) {
    case 'select': {
      if (columnData?.options) {
        const options = columnData.options as Array<{
          id: string;
          value: string;
        }>;
        const isValid = options.some(
          opt => opt.id === value || opt.value === value
        );
        if (!isValid) {
          const validOptions = options.map(o => o.value).join(', ');
          return {
            valid: false,
            error: `Invalid option "${value}". Valid options: ${validOptions}`,
          };
        }
      }
      return { valid: true };
    }

    case 'multiSelect': {
      const values = Array.isArray(value) ? value : [value];
      if (columnData?.options) {
        const options = columnData.options as Array<{
          id: string;
          value: string;
        }>;
        const validIds = new Set(options.flatMap(o => [o.id, o.value]));
        const invalid = values.filter(v => !validIds.has(String(v)));
        if (invalid.length > 0) {
          const validOptions = options.map(o => o.value).join(', ');
          return {
            valid: false,
            error: `Invalid options: ${invalid.join(', ')}. Valid options: ${validOptions}`,
          };
        }
      }
      return { valid: true };
    }

    case 'number':
    case 'progress': {
      if (typeof value !== 'number' && !Number.isFinite(Number(value))) {
        return { valid: false, error: `Value must be a number` };
      }
      return { valid: true };
    }

    case 'date': {
      if (typeof value === 'string') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return { valid: false, error: 'Invalid date format' };
        }
      }
      return { valid: true };
    }

    default:
      return { valid: true };
  }
}

/**
 * Build cell update data for a row
 * Returns the structure needed to update cells in the database
 */
export function buildCellUpdateData(
  cells: Record<string, unknown>,
  columns: DatabaseColumn[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [columnId, value] of Object.entries(cells)) {
    const column = columns.find(col => col.id === columnId);
    if (column) {
      const normalizedValue = normalizeCellValue(
        value,
        column.type,
        column.data
      );
      result[columnId] = {
        columnId,
        value: normalizedValue,
      };
    }
  }

  return result;
}

/**
 * Apply filters to database rows
 */
export function filterDatabaseRows(
  rows: DatabaseRow[],
  columns: DatabaseColumn[],
  filters: Array<{
    property: string;
    operator: string;
    value?: unknown;
  }>
): DatabaseRow[] {
  return rows.filter(row => {
    return filters.every(filter => {
      const column = columns.find(
        col => col.id === filter.property || col.name === filter.property
      );
      if (!column) return true;

      const cell = row.cells[column.id];
      const cellValue = cell?.value;
      const formattedValue = formatCellValue(
        cellValue,
        column.type,
        column.data
      );

      switch (filter.operator) {
        case 'equals':
          return cellValue === filter.value;

        case 'contains':
          return String(formattedValue)
            .toLowerCase()
            .includes(String(filter.value).toLowerCase());

        case 'greater_than':
          return Number(cellValue) > Number(filter.value);

        case 'less_than':
          return Number(cellValue) < Number(filter.value);

        case 'is_empty':
          return (
            cellValue === null || cellValue === undefined || cellValue === ''
          );

        case 'is_not_empty':
          return (
            cellValue !== null && cellValue !== undefined && cellValue !== ''
          );

        default:
          return true;
      }
    });
  });
}

/**
 * Sort database rows
 */
export function sortDatabaseRows(
  rows: DatabaseRow[],
  columns: DatabaseColumn[],
  sort: { property: string; direction: 'asc' | 'desc' }
): DatabaseRow[] {
  const column = columns.find(
    col => col.id === sort.property || col.name === sort.property
  );

  if (!column) return rows;

  return [...rows].sort((a, b) => {
    const aCell = a.cells[column.id];
    const bCell = b.cells[column.id];
    const aValue = aCell?.value;
    const bValue = bCell?.value;

    let comparison = 0;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else {
      comparison = String(aValue).localeCompare(String(bValue));
    }

    return sort.direction === 'asc' ? comparison : -comparison;
  });
}
