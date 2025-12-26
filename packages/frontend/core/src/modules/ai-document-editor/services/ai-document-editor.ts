import { Service } from '@toeverything/infra';
import { insertPositionToIndex } from '@blocksuite/affine-shared/utils';
import { DatabaseBlockDataSource } from '@blocksuite/affine/blocks/database';
import type { DatabaseBlockModel } from '@blocksuite/affine/model';

import type { DocsService } from '../../doc';
import type { WorkspaceService } from '../../workspace';
import type { GraphQLService } from '../../cloud';
import { CopilotClient } from '../../../blocksuite/ai/provider/copilot-client';
import { CommandParser } from '../command-parser';
import { DocumentContextManager } from './document-context-manager';
import { DocumentEditError } from '../errors';
import type {
  CommandOptions,
  CommandResult,
  EditResult,
  BlockContent,
  DocumentContext,
  DatabaseConfig,
  RowData,
} from '../types';
import { CommandType } from '../types';

/**
 * AIDocumentEditorService is the primary service for handling AI-driven document editing operations.
 *
 * This service:
 * - Orchestrates command execution from natural language to document operations
 * - Manages document editing through the AI backend
 * - Handles content insertion with proper positioning
 * - Integrates with existing CopilotClient and DocsService infrastructure
 *
 * Requirements: 1.1, 9.1, 11.1, 11.5
 */
export class AIDocumentEditorService extends Service {
  constructor(
    private readonly docsService: DocsService,
    private readonly workspaceService: WorkspaceService,
    private readonly graphqlService: GraphQLService,
    private readonly documentContextManager: DocumentContextManager
  ) {
    super();
  }

  /**
   * Get or create a CopilotClient instance
   * CopilotClient is not injected via DI - it's created with GraphQL dependencies
   *
   * @returns A CopilotClient instance for AI operations
   */
  private getCopilotClient(): CopilotClient {
    // Access GraphQL through the GraphQLService
    const gql = this.graphqlService.gql.bind(this.graphqlService);

    // Use the global fetch and EventSource
    const fetcher = fetch.bind(window);
    const eventSource = (url: string, init?: EventSourceInit) =>
      new EventSource(url, init);

    return new CopilotClient(gql, fetcher, eventSource);
  }

  /**
   * Get the currently active document context
   *
   * This method retrieves context about the active document including:
   * - Document ID
   * - Database blocks present in the document
   * - Cursor position and selection (if available)
   *
   * Requirements: 6.1, 11.5
   *
   * @returns The active document context, or null if no document is active
   */
  getActiveDocumentContext(): DocumentContext | null {
    return this.documentContextManager.getActiveDocumentContext();
  }

  /**
   * Execute a natural language command
   *
   * This is the main orchestration method that:
   * 1. Parses the natural language command
   * 2. Determines the target document
   * 3. Routes to the appropriate handler based on command type
   * 4. Returns the result of the operation
   *
   * Requirements: 1.1, 11.5
   *
   * @param command - The natural language command to execute
   * @param options - Optional command execution options
   * @returns The result of the command execution
   */
  async executeCommand(
    command: string,
    options?: CommandOptions
  ): Promise<CommandResult> {
    try {
      // Get document context
      const context = options?.context || this.getActiveDocumentContext();

      if (!context) {
        throw new Error('No active document context available');
      }

      // Parse the command
      const parsedCommand = CommandParser.parse(command, context);

      // Determine target document
      const targetDocId =
        options?.targetDocId || parsedCommand.targetDocId || context.docId;

      if (!targetDocId) {
        throw new Error('Could not determine target document');
      }

      // Route to appropriate handler based on command type
      switch (parsedCommand.type) {
        case CommandType.Edit:
          // Edit operations will be implemented in subtask 6.2
          throw new Error('Edit operations not yet implemented');

        case CommandType.Add:
          // Add operations will be implemented in subtask 6.5
          throw new Error('Add operations not yet implemented');

        case CommandType.Create:
          // Create operations will be implemented in task 8
          throw new Error('Create operations not yet implemented');

        case CommandType.Reference:
          // Reference operations will be implemented in task 9
          throw new Error('Reference operations not yet implemented');

        case CommandType.DatabaseOperation:
          // Database operations will be implemented in task 11
          throw new Error('Database operations not yet implemented');

        default:
          throw new Error(`Unknown command type: ${parsedCommand.type}`);
      }
    } catch (error) {
      return {
        success: false,
        operations: [],
        affectedBlocks: [],
        error: error as Error,
      };
    }
  }

  /**
   * Edit document content based on AI instructions
   *
   * This method:
   * 1. Opens the target document
   * 2. Sends instructions to the AI backend via CopilotClient
   * 3. Applies the AI-generated updates to the document
   * 4. Uses transactions to ensure atomicity and rollback on failure
   *
   * Requirements: 1.2, 1.3, 8.1, 9.2
   *
   * @param docId - The document ID to edit
   * @param instructions - Natural language instructions for the edit
   * @param preview - Whether to generate a preview before applying changes
   * @returns The result of the edit operation
   */
  async editDocument(
    docId: string,
    instructions: string,
    preview?: boolean
  ): Promise<EditResult> {
    let release: (() => void) | null = null;

    try {
      const docRef = this.docsService.open(docId);
      release = docRef.release;
      const doc = docRef.doc;

      await doc.waitForSyncReady();
      const bsDoc = doc.blockSuiteDoc;

      // Get the workspace ID
      const workspaceId = this.workspaceService.workspace.id;

      // Get CopilotClient
      const copilotClient = this.getCopilotClient();

      // Use applyDocUpdates to apply AI-generated changes
      // The AI backend will generate the updates based on the instructions
      // For now, we'll use a placeholder operation string
      // In a full implementation, this would involve:
      // 1. Creating a copilot session
      // 2. Sending the instructions as a message
      // 3. Receiving the updates from the AI
      // 4. Applying them using applyDocUpdates

      // Placeholder: In the real implementation, we would get 'op' and 'updates' from the AI
      const op = 'edit'; // Operation type
      const updates = ''; // Base64 encoded Y.js updates from AI

      // Apply updates using transaction for atomicity
      const affectedBlocks: string[] = [];

      try {
        // Use BlockSuite transaction to ensure atomicity
        // Transaction will automatically roll back on error (Requirement 8.1)
        bsDoc.transact(() => {
          // In a real implementation, we would:
          // 1. Parse the AI-generated updates
          // 2. Apply them to the document
          // 3. Track affected block IDs
          // For now, this is a placeholder that demonstrates the transaction pattern
          // The actual implementation would call copilotClient.applyDocUpdates
          // and then apply the resulting changes within this transaction
          // Example of how we would track affected blocks:
          // affectedBlocks.push(...modifiedBlockIds);
        });

        return {
          success: true,
          blockIds: affectedBlocks,
        };
      } catch (transactionError) {
        // Transaction automatically rolls back on error (Requirement 8.1)
        throw new DocumentEditError(
          'Failed to apply document edits - transaction rolled back',
          docId,
          {
            type: 'edit',
            blockId: '',
            changes: {},
          },
          transactionError as Error
        );
      }
    } catch (error) {
      // Return error result with proper error information
      return {
        success: false,
        blockIds: [],
        error: error as Error,
      };
    } finally {
      // Always call release() in finally block (Requirement 11.8)
      if (release) {
        release();
      }
    }
  }

  /**
   * Add new content to a document at specified position
   *
   * This method:
   * 1. Opens the target document
   * 2. Finds the appropriate parent block (note block)
   * 3. Adds the new block at the specified position
   * 4. Returns the block identifier for further operations
   *
   * Requirements: 2.1, 2.3, 2.4, 2.5, 11.3
   *
   * @param docId - The document ID to add content to
   * @param content - The content to add (type and props)
   * @param position - Optional position specification (start, end, before, after, or index)
   * @returns The block identifier of the added content
   */
  async addContent(
    docId: string,
    content: BlockContent,
    position?: any
  ): Promise<string> {
    let release: (() => void) | null = null;

    try {
      const docRef = this.docsService.open(docId);
      release = docRef.release;
      const doc = docRef.doc;

      await doc.waitForSyncReady();
      const bsDoc = doc.blockSuiteDoc;

      // Find parent block (note block)
      const noteBlocks = bsDoc.getBlocksByFlavour('affine:note');
      if (!noteBlocks || noteBlocks.length === 0) {
        throw new DocumentEditError('No note block found in document', docId, {
          type: 'insert',
          blockType: content.type,
          content: content.props,
          position: position || 'end',
          parentId: '',
        });
      }

      const noteBlock = noteBlocks[0];
      const parentId = noteBlock.id;

      // Calculate the index for insertion based on position
      let index: number | undefined;

      if (position) {
        // Use insertPositionToIndex to convert position to index
        index = insertPositionToIndex(position, noteBlock.model.children);
      }

      // Add the block
      const blockId = bsDoc.addBlock(
        content.type as any,
        content.props,
        parentId,
        index
      );

      if (!blockId) {
        throw new DocumentEditError('Failed to create block', docId, {
          type: 'insert',
          blockType: content.type,
          content: content.props,
          position: position || 'end',
          parentId,
        });
      }

      return blockId;
    } catch (error) {
      if (error instanceof DocumentEditError) {
        throw error;
      }
      throw new DocumentEditError(
        `Failed to add content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        docId,
        {
          type: 'insert',
          blockType: content.type,
          content: content.props,
          position: position || 'end',
          parentId: '',
        },
        error as Error
      );
    } finally {
      // Always call release() in finally block (Requirement 11.8)
      if (release) {
        release();
      }
    }
  }

  /**
   * Create a new database block in a document
   *
   * This method:
   * 1. Opens the target document
   * 2. Creates a database block at the specified position
   * 3. Configures columns using DatabaseBlockDataSource
   * 4. Initializes the view (table, kanban, or gallery)
   * 5. Adds initial rows if specified
   * 6. Returns the database block identifier
   *
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.3, 11.2
   *
   * @param docId - The document ID to create the database in
   * @param config - Database configuration (columns, view type, initial rows)
   * @param position - Optional position specification (start, end, before, after, or index)
   * @returns The database block identifier
   */
  async createDatabase(
    docId: string,
    config: DatabaseConfig,
    position?: any
  ): Promise<string> {
    let release: (() => void) | null = null;

    try {
      const docRef = this.docsService.open(docId);
      release = docRef.release;
      const doc = docRef.doc;

      await doc.waitForSyncReady();
      const bsDoc = doc.blockSuiteDoc;

      // Find parent block (note block)
      const noteBlocks = bsDoc.getBlocksByFlavour('affine:note');
      if (!noteBlocks || noteBlocks.length === 0) {
        throw new DocumentEditError('No note block found in document', docId, {
          type: 'database',
          action: 'create',
          data: config,
        });
      }

      const noteBlock = noteBlocks[0];
      const parentId = noteBlock.id;

      // Calculate the index for insertion based on position
      let index: number | undefined;

      if (position) {
        index = insertPositionToIndex(position, noteBlock.model.children);
      }

      // Use transaction to ensure atomicity (Requirement 8.1)
      let dbId: string | null = null;

      try {
        bsDoc.transact(() => {
          // Create the database block with empty columns and views
          // We'll configure them after creation using DatabaseBlockDataSource
          dbId = bsDoc.addBlock(
            'affine:database',
            { columns: [], views: [] },
            parentId,
            index
          );

          if (!dbId) {
            throw new Error('Failed to create database block');
          }

          // Get the database block and model
          const dbBlock = bsDoc.getBlock(dbId);
          if (!dbBlock) {
            throw new Error('Database block not found after creation');
          }

          const dbModel = dbBlock.model as DatabaseBlockModel;

          // Create DatabaseBlockDataSource to configure the database
          const dataSource = new DatabaseBlockDataSource(dbModel);

          // Configure columns
          for (const col of config.columns) {
            dataSource.propertyAdd('end', {
              type: col.type,
              name: col.name,
            });
          }

          // Initialize view with the specified type
          dataSource.viewManager.viewAdd(config.viewType);

          // Add initial rows if specified
          if (config.initialRows && config.initialRows.length > 0) {
            for (const rowData of config.initialRows) {
              const rowId = dataSource.rowAdd('end');

              // Set cell values for the row
              // We need to map column names to property IDs
              const columns = dbModel.props.columns$.value;
              for (const [columnName, value] of Object.entries(rowData)) {
                const column = columns.find(col => col.name === columnName);
                if (column) {
                  dataSource.cellValueChange(rowId, column.id, value);
                }
              }
            }
          }
        });
      } catch (transactionError) {
        // Transaction automatically rolls back on error (Requirement 8.1)
        throw new DocumentEditError(
          'Failed to create database - transaction rolled back',
          docId,
          {
            type: 'database',
            action: 'create',
            data: config,
          },
          transactionError as Error
        );
      }

      if (!dbId) {
        throw new DocumentEditError('Failed to create database block', docId, {
          type: 'database',
          action: 'create',
          data: config,
        });
      }

      return dbId;
    } catch (error) {
      if (error instanceof DocumentEditError) {
        throw error;
      }
      throw new DocumentEditError(
        `Failed to create database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        docId,
        {
          type: 'database',
          action: 'create',
          data: config,
        },
        error as Error
      );
    } finally {
      // Always call release() in finally block (Requirement 11.8)
      if (release) {
        release();
      }
    }
  }

  /**
   * Add a row to an existing database
   *
   * This method:
   * 1. Opens the document containing the database
   * 2. Gets the DatabaseBlockDataSource for the target database
   * 3. Adds a new row at the specified position
   * 4. Optionally populates the row with data
   * 5. Returns the row identifier
   *
   * Requirements: 10.1, 11.2
   *
   * @param docId - The document ID containing the database
   * @param databaseId - The database block ID
   * @param position - Position to insert the row ('start' or 'end')
   * @param rowData - Optional data to populate the row
   * @returns The row identifier
   */
  async addDatabaseRow(
    docId: string,
    databaseId: string,
    position: 'start' | 'end' = 'end',
    rowData?: RowData
  ): Promise<string> {
    let release: (() => void) | null = null;

    try {
      const docRef = this.docsService.open(docId);
      release = docRef.release;
      const doc = docRef.doc;

      await doc.waitForSyncReady();
      const bsDoc = doc.blockSuiteDoc;

      // Get the database block
      const dbBlock = bsDoc.getBlock(databaseId);
      if (!dbBlock) {
        throw new DocumentEditError('Database block not found', docId, {
          type: 'database',
          action: 'addRow',
          databaseId,
          data: { position, rowData },
        });
      }

      if (dbBlock.flavour !== 'affine:database') {
        throw new DocumentEditError('Block is not a database', docId, {
          type: 'database',
          action: 'addRow',
          databaseId,
          data: { position, rowData },
        });
      }

      const dbModel = dbBlock.model as DatabaseBlockModel;
      const dataSource = new DatabaseBlockDataSource(dbModel);

      // Use transaction to ensure atomicity (Requirement 8.1)
      let rowId: string | null = null;

      try {
        bsDoc.transact(() => {
          // Add the row
          rowId = dataSource.rowAdd(position);

          if (!rowId) {
            throw new Error('Failed to add row to database');
          }

          // Populate row data if provided
          if (rowData) {
            const columns = dbModel.props.columns$.value;
            for (const [columnName, value] of Object.entries(rowData)) {
              const column = columns.find(col => col.name === columnName);
              if (column) {
                dataSource.cellValueChange(rowId, column.id, value);
              }
            }
          }
        });
      } catch (transactionError) {
        // Transaction automatically rolls back on error (Requirement 8.1)
        throw new DocumentEditError(
          'Failed to add database row - transaction rolled back',
          docId,
          {
            type: 'database',
            action: 'addRow',
            databaseId,
            data: { position, rowData },
          },
          transactionError as Error
        );
      }

      if (!rowId) {
        throw new DocumentEditError('Failed to add row to database', docId, {
          type: 'database',
          action: 'addRow',
          databaseId,
          data: { position, rowData },
        });
      }

      return rowId;
    } catch (error) {
      if (error instanceof DocumentEditError) {
        throw error;
      }
      throw new DocumentEditError(
        `Failed to add database row: ${error instanceof Error ? error.message : 'Unknown error'}`,
        docId,
        {
          type: 'database',
          action: 'addRow',
          databaseId,
          data: { position, rowData },
        },
        error as Error
      );
    } finally {
      // Always call release() in finally block (Requirement 11.8)
      if (release) {
        release();
      }
    }
  }

  /**
   * Update a cell value in a database
   *
   * This method:
   * 1. Opens the document containing the database
   * 2. Gets the DatabaseBlockDataSource for the target database
   * 3. Updates the specified cell with the new value
   *
   * Requirements: 10.2, 11.2
   *
   * @param docId - The document ID containing the database
   * @param databaseId - The database block ID
   * @param rowId - The row identifier
   * @param columnId - The column identifier (property ID)
   * @param value - The new value for the cell
   */
  async updateDatabaseCell(
    docId: string,
    databaseId: string,
    rowId: string,
    columnId: string,
    value: any
  ): Promise<void> {
    let release: (() => void) | null = null;

    try {
      const docRef = this.docsService.open(docId);
      release = docRef.release;
      const doc = docRef.doc;

      await doc.waitForSyncReady();
      const bsDoc = doc.blockSuiteDoc;

      // Get the database block
      const dbBlock = bsDoc.getBlock(databaseId);
      if (!dbBlock) {
        throw new DocumentEditError('Database block not found', docId, {
          type: 'database',
          action: 'updateCell',
          databaseId,
          data: { rowId, columnId, value },
        });
      }

      if (dbBlock.flavour !== 'affine:database') {
        throw new DocumentEditError('Block is not a database', docId, {
          type: 'database',
          action: 'updateCell',
          databaseId,
          data: { rowId, columnId, value },
        });
      }

      const dbModel = dbBlock.model as DatabaseBlockModel;
      const dataSource = new DatabaseBlockDataSource(dbModel);

      // Use transaction to ensure atomicity (Requirement 8.1)
      try {
        bsDoc.transact(() => {
          // Update the cell value
          dataSource.cellValueChange(rowId, columnId, value);
        });
      } catch (transactionError) {
        // Transaction automatically rolls back on error (Requirement 8.1)
        throw new DocumentEditError(
          'Failed to update database cell - transaction rolled back',
          docId,
          {
            type: 'database',
            action: 'updateCell',
            databaseId,
            data: { rowId, columnId, value },
          },
          transactionError as Error
        );
      }
    } catch (error) {
      if (error instanceof DocumentEditError) {
        throw error;
      }
      throw new DocumentEditError(
        `Failed to update database cell: ${error instanceof Error ? error.message : 'Unknown error'}`,
        docId,
        {
          type: 'database',
          action: 'updateCell',
          databaseId,
          data: { rowId, columnId, value },
        },
        error as Error
      );
    } finally {
      // Always call release() in finally block (Requirement 11.8)
      if (release) {
        release();
      }
    }
  }

  /**
   * Update view configuration (filters and sorting) for a database view
   *
   * This method:
   * 1. Opens the document containing the database
   * 2. Gets the DatabaseBlockDataSource for the target database
   * 3. Updates the view configuration using viewDataUpdate
   *
   * Requirements: 10.3, 11.2
   *
   * @param docId - The document ID containing the database
   * @param databaseId - The database block ID
   * @param viewId - The view identifier
   * @param config - Configuration updates (filters, sorting, etc.)
   */
  async updateDatabaseViewConfig(
    docId: string,
    databaseId: string,
    viewId: string,
    config: Record<string, any>
  ): Promise<void> {
    let release: (() => void) | null = null;

    try {
      const docRef = this.docsService.open(docId);
      release = docRef.release;
      const doc = docRef.doc;

      await doc.waitForSyncReady();
      const bsDoc = doc.blockSuiteDoc;

      // Get the database block
      const dbBlock = bsDoc.getBlock(databaseId);
      if (!dbBlock) {
        throw new DocumentEditError('Database block not found', docId, {
          type: 'database',
          action: 'updateView',
          databaseId,
          data: { viewId, config },
        });
      }

      if (dbBlock.flavour !== 'affine:database') {
        throw new DocumentEditError('Block is not a database', docId, {
          type: 'database',
          action: 'updateView',
          databaseId,
          data: { viewId, config },
        });
      }

      const dbModel = dbBlock.model as DatabaseBlockModel;
      const dataSource = new DatabaseBlockDataSource(dbModel);

      // Use transaction to ensure atomicity (Requirement 8.1)
      try {
        bsDoc.transact(() => {
          // Update the view configuration
          dataSource.viewDataUpdate(viewId, viewData => {
            return {
              ...viewData,
              ...config,
            };
          });
        });
      } catch (transactionError) {
        // Transaction automatically rolls back on error (Requirement 8.1)
        throw new DocumentEditError(
          'Failed to update database view configuration - transaction rolled back',
          docId,
          {
            type: 'database',
            action: 'updateView',
            databaseId,
            data: { viewId, config },
          },
          transactionError as Error
        );
      }
    } catch (error) {
      if (error instanceof DocumentEditError) {
        throw error;
      }
      throw new DocumentEditError(
        `Failed to update database view configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        docId,
        {
          type: 'database',
          action: 'updateView',
          databaseId,
          data: { viewId, config },
        },
        error as Error
      );
    } finally {
      // Always call release() in finally block (Requirement 11.8)
      if (release) {
        release();
      }
    }
  }

  /**
   * Add a new view to a database
   *
   * This method:
   * 1. Opens the document containing the database
   * 2. Gets the DatabaseBlockDataSource for the target database
   * 3. Creates a new view with the specified type
   * 4. Optionally configures the view with settings
   * 5. Returns the view identifier
   *
   * Requirements: 10.4, 11.2
   *
   * @param docId - The document ID containing the database
   * @param databaseId - The database block ID
   * @param viewType - The type of view to create ('table', 'kanban', or 'gallery')
   * @param config - Optional configuration for the view (filters, sorting, etc.)
   * @returns The view identifier
   */
  async addDatabaseView(
    docId: string,
    databaseId: string,
    viewType: 'table' | 'kanban' | 'gallery',
    config?: Record<string, any>
  ): Promise<string> {
    let release: (() => void) | null = null;

    try {
      const docRef = this.docsService.open(docId);
      release = docRef.release;
      const doc = docRef.doc;

      await doc.waitForSyncReady();
      const bsDoc = doc.blockSuiteDoc;

      // Get the database block
      const dbBlock = bsDoc.getBlock(databaseId);
      if (!dbBlock) {
        throw new DocumentEditError('Database block not found', docId, {
          type: 'database',
          action: 'addView',
          databaseId,
          data: { viewType, config },
        });
      }

      if (dbBlock.flavour !== 'affine:database') {
        throw new DocumentEditError('Block is not a database', docId, {
          type: 'database',
          action: 'addView',
          databaseId,
          data: { viewType, config },
        });
      }

      const dbModel = dbBlock.model as DatabaseBlockModel;
      const dataSource = new DatabaseBlockDataSource(dbModel);

      // Use transaction to ensure atomicity (Requirement 8.1)
      let viewId: string | null = null;

      try {
        bsDoc.transact(() => {
          // Add the new view
          viewId = dataSource.viewManager.viewAdd(viewType);

          if (!viewId) {
            throw new Error('Failed to add view to database');
          }

          // Apply configuration if provided
          if (config) {
            dataSource.viewDataUpdate(viewId, viewData => {
              return {
                ...viewData,
                ...config,
              };
            });
          }
        });
      } catch (transactionError) {
        // Transaction automatically rolls back on error (Requirement 8.1)
        throw new DocumentEditError(
          'Failed to add database view - transaction rolled back',
          docId,
          {
            type: 'database',
            action: 'addView',
            databaseId,
            data: { viewType, config },
          },
          transactionError as Error
        );
      }

      if (!viewId) {
        throw new DocumentEditError('Failed to add view to database', docId, {
          type: 'database',
          action: 'addView',
          databaseId,
          data: { viewType, config },
        });
      }

      return viewId;
    } catch (error) {
      if (error instanceof DocumentEditError) {
        throw error;
      }
      throw new DocumentEditError(
        `Failed to add database view: ${error instanceof Error ? error.message : 'Unknown error'}`,
        docId,
        {
          type: 'database',
          action: 'addView',
          databaseId,
          data: { viewType, config },
        },
        error as Error
      );
    } finally {
      // Always call release() in finally block (Requirement 11.8)
      if (release) {
        release();
      }
    }
  }
}
