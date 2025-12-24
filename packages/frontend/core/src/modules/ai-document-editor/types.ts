import type { InsertToPosition } from '@blocksuite/affine-shared/utils';
import type { BlockSnapshot } from '@blocksuite/store';

/**
 * Types of commands that can be executed by the AI document editor
 */
export enum CommandType {
  Edit = 'edit',
  Add = 'add',
  Create = 'create',
  Reference = 'reference',
  DatabaseOperation = 'database-operation',
}

/**
 * Result of a command execution
 */
export interface CommandResult {
  success: boolean;
  operations: DocumentOperation[];
  affectedBlocks: string[];
  error?: Error;
  preview?: ChangePreview;
}

/**
 * Options for command execution
 */
export interface CommandOptions {
  preview?: boolean;
  targetDocId?: string;
  context?: DocumentContext;
}

/**
 * Parsed command structure
 */
export interface ParsedCommand {
  type: CommandType;
  targetDocId: string | null;
  instructions: string;
  parameters?: Record<string, any>;
}

/**
 * Document operation types
 */
export type DocumentOperation =
  | EditOperation
  | InsertOperation
  | DeleteOperation
  | DatabaseOperation;

export interface EditOperation {
  type: 'edit';
  blockId: string;
  changes: Record<string, any>;
}

export interface InsertOperation {
  type: 'insert';
  blockType: string;
  content: any;
  position: InsertToPosition;
  parentId: string;
}

export interface DeleteOperation {
  type: 'delete';
  blockId: string;
}

export interface DatabaseOperation {
  type: 'database';
  action: 'create' | 'addRow' | 'updateCell' | 'addView' | 'updateView';
  databaseId?: string;
  data: any;
}

/**
 * Result of an edit operation
 */
export interface EditResult {
  success: boolean;
  blockIds: string[];
  error?: Error;
}

/**
 * Content to be inserted into a document
 */
export interface BlockContent {
  type: string;
  props: Record<string, any>;
}

/**
 * Configuration for creating a database
 */
export interface DatabaseConfig {
  name?: string;
  columns: ColumnConfig[];
  viewType: 'table' | 'kanban' | 'gallery';
  initialRows?: RowData[];
}

export interface ColumnConfig {
  name: string;
  type: string;
  data?: Record<string, any>;
}

export interface RowData {
  [columnId: string]: any;
}

/**
 * Reference to a database in another document
 */
export interface DatabaseReference {
  id: string;
  sourceId: string;
  targetDocId: string;
  viewId?: string;
  createdAt: Date;
}

/**
 * Preview of proposed changes
 */
export interface ChangePreview {
  id: string;
  docId: string;
  operations: DocumentOperation[];
  additions: PreviewBlock[];
  modifications: PreviewBlock[];
  deletions: PreviewBlock[];
  createdAt: Date;
}

export interface PreviewBlock {
  blockId: string;
  before?: BlockSnapshot;
  after?: BlockSnapshot;
}

/**
 * Context information about a document
 */
export interface DocumentContext {
  docId: string;
  databases: DatabaseInfo[];
  cursorPosition?: BlockPosition;
  selection?: BlockSelection;
}

export interface DatabaseInfo {
  blockId: string;
  name: string;
  views: ViewInfo[];
}

export interface ViewInfo {
  id: string;
  name: string;
  type: 'table' | 'kanban' | 'gallery';
}

export interface BlockPosition {
  blockId: string;
  index: number;
}

export interface BlockSelection {
  start: BlockPosition;
  end: BlockPosition;
}
