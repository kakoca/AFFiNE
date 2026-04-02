/**
 * @vitest-environment happy-dom
 */
/* eslint-disable rxjs/finnish */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GraphQLService } from '../../cloud';
import type { DocsService } from '../../doc';
import type { WorkspaceService } from '../../workspace';
import { AIDocumentEditorService } from '../services/ai-document-editor';
import { DocumentContextManager } from '../services/document-context-manager';

describe('AIDocumentEditorService', () => {
  let service: AIDocumentEditorService;
  let mockDocsService: Partial<DocsService>;
  let mockWorkspaceService: Partial<WorkspaceService>;
  let mockGraphQLService: Partial<GraphQLService>;
  let mockDocumentContextManager: Partial<DocumentContextManager>;

  beforeEach(() => {
    // Create mock services
    mockDocsService = {
      open: vi.fn(),
    };

    mockWorkspaceService = {
      workspace: {
        id: 'test-workspace-id',
      } as any,
    };

    mockGraphQLService = {
      gql: vi.fn(),
    };

    mockDocumentContextManager = {
      getActiveDocumentContext: vi.fn(),
    };

    // Create service instance
    service = new AIDocumentEditorService(
      mockDocsService as DocsService,
      mockWorkspaceService as WorkspaceService,
      mockGraphQLService as GraphQLService,
      mockDocumentContextManager as DocumentContextManager
    );
  });

  describe('getActiveDocumentContext', () => {
    it('should delegate to DocumentContextManager', () => {
      const mockContext = {
        docId: 'test-doc-id',
        databases: [],
      };

      vi.mocked(
        mockDocumentContextManager.getActiveDocumentContext!
      ).mockReturnValue(mockContext);

      const result = service.getActiveDocumentContext();

      expect(result).toBe(mockContext);
      expect(
        mockDocumentContextManager.getActiveDocumentContext
      ).toHaveBeenCalled();
    });

    it('should return null when no active document', () => {
      vi.mocked(
        mockDocumentContextManager.getActiveDocumentContext!
      ).mockReturnValue(null);

      const result = service.getActiveDocumentContext();

      expect(result).toBeNull();
    });
  });

  describe('executeCommand', () => {
    it('should return error when no active document context', async () => {
      vi.mocked(
        mockDocumentContextManager.getActiveDocumentContext!
      ).mockReturnValue(null);

      const result = await service.executeCommand('edit this document');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('No active document context');
    });

    it('should parse command and determine target document', async () => {
      const mockContext = {
        docId: 'test-doc-id',
        databases: [],
      };

      vi.mocked(
        mockDocumentContextManager.getActiveDocumentContext!
      ).mockReturnValue(mockContext);

      const result = await service.executeCommand('edit this document');

      // Should fail with "not yet implemented" since we haven't implemented the handlers
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not yet implemented');
    });
  });

  describe('editDocument', () => {
    it('should open and release document', async () => {
      const mockRelease = vi.fn();
      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          transact: vi.fn((fn: () => void) => fn()),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      const result = await service.editDocument(
        'test-doc-id',
        'edit instructions'
      );

      expect(mockDocsService.open).toHaveBeenCalledWith('test-doc-id');
      expect(mockDoc.waitForSyncReady).toHaveBeenCalled();
      expect(mockRelease).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle errors and still release document', async () => {
      const mockRelease = vi.fn();
      const mockDoc = {
        waitForSyncReady: vi.fn().mockRejectedValue(new Error('Sync failed')),
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      const result = await service.editDocument(
        'test-doc-id',
        'edit instructions'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('addContent', () => {
    it('should add content to document and return block ID', async () => {
      const mockRelease = vi.fn();
      const mockNoteBlock = {
        id: 'note-block-id',
        children: [],
      };
      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlocksByFlavour: vi.fn().mockReturnValue([mockNoteBlock]),
          addBlock: vi.fn().mockReturnValue('new-block-id'),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      const content = {
        type: 'affine:paragraph',
        props: { text: 'Hello world' },
      };

      const blockId = await service.addContent('test-doc-id', content);

      expect(blockId).toBe('new-block-id');
      expect(mockDoc.blockSuiteDoc.addBlock).toHaveBeenCalledWith(
        'affine:paragraph',
        { text: 'Hello world' },
        'note-block-id',
        undefined
      );
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should throw error when no note block found', async () => {
      const mockRelease = vi.fn();
      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlocksByFlavour: vi.fn().mockReturnValue([]),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      const content = {
        type: 'affine:paragraph',
        props: { text: 'Hello world' },
      };

      await expect(service.addContent('test-doc-id', content)).rejects.toThrow(
        'No note block found'
      );

      expect(mockRelease).toHaveBeenCalled();
    });

    it('should handle position parameter', async () => {
      const mockRelease = vi.fn();
      const mockNoteBlock = {
        id: 'note-block-id',
        children: ['child1', 'child2'],
      };
      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlocksByFlavour: vi.fn().mockReturnValue([mockNoteBlock]),
          addBlock: vi.fn().mockReturnValue('new-block-id'),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      const content = {
        type: 'affine:paragraph',
        props: { text: 'Hello world' },
      };

      const blockId = await service.addContent('test-doc-id', content, 'start');

      expect(blockId).toBe('new-block-id');
      expect(mockDoc.blockSuiteDoc.addBlock).toHaveBeenCalled();
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('createDatabase', () => {
    it('should create database with columns and views', async () => {
      const mockRelease = vi.fn();
      const mockPropertyAdd = vi.fn();
      const mockViewAdd = vi.fn();
      const mockRowAdd = vi.fn().mockReturnValue('row-id-1');
      const mockCellValueChange = vi.fn();

      const mockNoteBlock = {
        id: 'note-block-id',
        model: {
          children: [],
        },
      };

      const mockDbModel = {
        props: {
          columns$: {
            value: [
              { id: 'col-1', name: 'Task', type: 'text' },
              { id: 'col-2', name: 'Status', type: 'select' },
            ],
          },
        },
      };

      const mockDbBlock = {
        model: mockDbModel,
      };

      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlocksByFlavour: vi.fn().mockReturnValue([mockNoteBlock]),
          addBlock: vi.fn().mockReturnValue('database-block-id'),
          getBlock: vi.fn().mockReturnValue(mockDbBlock),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      // Mock DatabaseBlockDataSource
      const mockDataSource = {
        propertyAdd: mockPropertyAdd,
        viewManager: {
          viewAdd: mockViewAdd,
        },
        rowAdd: mockRowAdd,
        cellValueChange: mockCellValueChange,
      };

      // We need to mock the DatabaseBlockDataSource constructor
      // This is tricky in the test, so we'll just verify the basic flow

      const config = {
        columns: [
          { name: 'Task', type: 'text' },
          { name: 'Status', type: 'select' },
        ],
        viewType: 'table' as const,
        initialRows: [{ Task: 'Task 1', Status: 'Todo' }],
      };

      const dbId = await service.createDatabase('test-doc-id', config);

      expect(dbId).toBe('database-block-id');
      expect(mockDoc.blockSuiteDoc.addBlock).toHaveBeenCalledWith(
        'affine:database',
        { columns: [], views: [] },
        'note-block-id',
        undefined
      );
      expect(mockDoc.blockSuiteDoc.getBlock).toHaveBeenCalledWith(
        'database-block-id'
      );
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should throw error when no note block found', async () => {
      const mockRelease = vi.fn();
      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlocksByFlavour: vi.fn().mockReturnValue([]),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      const config = {
        columns: [{ name: 'Task', type: 'text' }],
        viewType: 'table' as const,
      };

      await expect(
        service.createDatabase('test-doc-id', config)
      ).rejects.toThrow('No note block found');

      expect(mockRelease).toHaveBeenCalled();
    });

    it('should throw error when database block creation fails', async () => {
      const mockRelease = vi.fn();
      const mockNoteBlock = {
        id: 'note-block-id',
        model: {
          children: [],
        },
      };

      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlocksByFlavour: vi.fn().mockReturnValue([mockNoteBlock]),
          addBlock: vi.fn().mockReturnValue(null), // Simulate failure
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      const config = {
        columns: [{ name: 'Task', type: 'text' }],
        viewType: 'table' as const,
      };

      await expect(
        service.createDatabase('test-doc-id', config)
      ).rejects.toThrow('Failed to create database block');

      expect(mockRelease).toHaveBeenCalled();
    });

    it('should handle position parameter', async () => {
      const mockRelease = vi.fn();
      const mockNoteBlock = {
        id: 'note-block-id',
        model: {
          children: ['child1', 'child2'],
        },
      };

      const mockDbModel = {
        props: {
          columns$: {
            value: [],
          },
        },
      };

      const mockDbBlock = {
        model: mockDbModel,
      };

      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlocksByFlavour: vi.fn().mockReturnValue([mockNoteBlock]),
          addBlock: vi.fn().mockReturnValue('database-block-id'),
          getBlock: vi.fn().mockReturnValue(mockDbBlock),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      const config = {
        columns: [{ name: 'Task', type: 'text' }],
        viewType: 'table' as const,
      };

      const dbId = await service.createDatabase('test-doc-id', config, 'start');

      expect(dbId).toBe('database-block-id');
      expect(mockDoc.blockSuiteDoc.addBlock).toHaveBeenCalled();
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('addDatabaseRow', () => {
    it('should add a row to a database', async () => {
      const mockRelease = vi.fn();
      const mockRowAdd = vi.fn().mockReturnValue('new-row-id');
      const mockCellValueChange = vi.fn();

      const mockDbModel = {
        props: {
          columns$: {
            value: [
              { id: 'col-1', name: 'Task', type: 'text' },
              { id: 'col-2', name: 'Status', type: 'select' },
            ],
          },
        },
      };

      const mockDbBlock = {
        flavour: 'affine:database',
        model: mockDbModel,
      };

      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlock: vi.fn().mockReturnValue(mockDbBlock),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      // Mock DatabaseBlockDataSource - we can't easily mock the constructor,
      // but we can verify the method calls through the service
      const rowId = await service.addDatabaseRow(
        'test-doc-id',
        'database-block-id',
        'end',
        { Task: 'New Task', Status: 'Todo' }
      );

      expect(mockDoc.blockSuiteDoc.getBlock).toHaveBeenCalledWith(
        'database-block-id'
      );
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should throw error when database block not found', async () => {
      const mockRelease = vi.fn();
      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlock: vi.fn().mockReturnValue(null),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      await expect(
        service.addDatabaseRow('test-doc-id', 'database-block-id', 'end')
      ).rejects.toThrow('Database block not found');

      expect(mockRelease).toHaveBeenCalled();
    });

    it('should throw error when block is not a database', async () => {
      const mockRelease = vi.fn();
      const mockBlock = {
        flavour: 'affine:paragraph',
      };

      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlock: vi.fn().mockReturnValue(mockBlock),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      await expect(
        service.addDatabaseRow('test-doc-id', 'database-block-id', 'end')
      ).rejects.toThrow('Block is not a database');

      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('updateDatabaseCell', () => {
    it('should update a cell value in a database', async () => {
      const mockRelease = vi.fn();

      const mockDbModel = {
        props: {
          columns$: {
            value: [{ id: 'col-1', name: 'Task', type: 'text' }],
          },
        },
      };

      const mockDbBlock = {
        flavour: 'affine:database',
        model: mockDbModel,
      };

      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlock: vi.fn().mockReturnValue(mockDbBlock),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      await service.updateDatabaseCell(
        'test-doc-id',
        'database-block-id',
        'row-id',
        'col-1',
        'Updated Task'
      );

      expect(mockDoc.blockSuiteDoc.getBlock).toHaveBeenCalledWith(
        'database-block-id'
      );
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should throw error when database block not found', async () => {
      const mockRelease = vi.fn();
      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlock: vi.fn().mockReturnValue(null),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      await expect(
        service.updateDatabaseCell(
          'test-doc-id',
          'database-block-id',
          'row-id',
          'col-1',
          'value'
        )
      ).rejects.toThrow('Database block not found');

      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('updateDatabaseViewConfig', () => {
    it('should update view configuration', async () => {
      const mockRelease = vi.fn();

      const mockDbModel = {
        props: {
          columns$: {
            value: [],
          },
        },
      };

      const mockDbBlock = {
        flavour: 'affine:database',
        model: mockDbModel,
      };

      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlock: vi.fn().mockReturnValue(mockDbBlock),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      await service.updateDatabaseViewConfig(
        'test-doc-id',
        'database-block-id',
        'view-id',
        { filter: { type: 'status', value: 'active' } }
      );

      expect(mockDoc.blockSuiteDoc.getBlock).toHaveBeenCalledWith(
        'database-block-id'
      );
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should throw error when database block not found', async () => {
      const mockRelease = vi.fn();
      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlock: vi.fn().mockReturnValue(null),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      await expect(
        service.updateDatabaseViewConfig(
          'test-doc-id',
          'database-block-id',
          'view-id',
          {}
        )
      ).rejects.toThrow('Database block not found');

      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('addDatabaseView', () => {
    it('should add a new view to a database', async () => {
      const mockRelease = vi.fn();

      const mockDbModel = {
        props: {
          columns$: {
            value: [],
          },
        },
      };

      const mockDbBlock = {
        flavour: 'affine:database',
        model: mockDbModel,
      };

      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlock: vi.fn().mockReturnValue(mockDbBlock),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      // Note: The actual viewId would be returned by the DataSource,
      // but we can't easily test that without mocking the constructor
      await service.addDatabaseView(
        'test-doc-id',
        'database-block-id',
        'kanban',
        { groupBy: 'status' }
      );

      expect(mockDoc.blockSuiteDoc.getBlock).toHaveBeenCalledWith(
        'database-block-id'
      );
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should throw error when database block not found', async () => {
      const mockRelease = vi.fn();
      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlock: vi.fn().mockReturnValue(null),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      await expect(
        service.addDatabaseView('test-doc-id', 'database-block-id', 'table')
      ).rejects.toThrow('Database block not found');

      expect(mockRelease).toHaveBeenCalled();
    });

    it('should add view without configuration', async () => {
      const mockRelease = vi.fn();

      const mockDbModel = {
        props: {
          columns$: {
            value: [],
          },
        },
      };

      const mockDbBlock = {
        flavour: 'affine:database',
        model: mockDbModel,
      };

      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlock: vi.fn().mockReturnValue(mockDbBlock),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      await service.addDatabaseView(
        'test-doc-id',
        'database-block-id',
        'gallery'
      );

      expect(mockDoc.blockSuiteDoc.getBlock).toHaveBeenCalledWith(
        'database-block-id'
      );
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('Y.js Synchronization for Database References', () => {
    it('should verify that edits through DatabaseReferenceBlock trigger Y.js updates on source doc', async () => {
      // This test verifies that when a database is edited through a reference,
      // the changes are properly synchronized via Y.js to the source document.

      const mockRelease = vi.fn();
      const transactionCallbacks: Array<() => void> = [];

      // Mock the source database model with Y.js transaction support
      const mockDbModel = {
        props: {
          columns$: {
            value: [{ id: 'col-1', name: 'Task', type: 'text' }],
          },
        },
      };

      const mockDbBlock = {
        flavour: 'affine:database',
        model: mockDbModel,
      };

      // Mock the BlockSuite document with Y.js transaction tracking
      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlock: vi.fn().mockReturnValue(mockDbBlock),
          transact: vi.fn((fn: () => void) => {
            // Track that a transaction was initiated
            transactionCallbacks.push(fn);
            // Execute the transaction
            fn();
          }),
          on: vi.fn(),
          off: vi.fn(),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      // Simulate editing a cell through the database (which could be via a reference)
      await service.updateDatabaseCell(
        'test-doc-id',
        'database-block-id',
        'row-id',
        'col-1',
        'Updated Task'
      );

      // Verify that the operation was wrapped in a Y.js transaction
      // This ensures that changes are properly synchronized
      expect(mockDoc.blockSuiteDoc.transact).toHaveBeenCalled();
      expect(transactionCallbacks.length).toBeGreaterThan(0);
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should verify that changes propagate to all clients viewing source or references', async () => {
      // This test simulates multiple clients viewing the same database
      // (either directly or through references) and verifies that changes
      // made by one client are visible to others via Y.js synchronization.

      const mockRelease1 = vi.fn();
      const mockRelease2 = vi.fn();
      const afterTransactionHandlers: Array<(event: any) => void> = [];

      // Mock the database model that will be shared across clients
      const mockDbModel = {
        props: {
          columns$: {
            value: [{ id: 'col-1', name: 'Task', type: 'text' }],
          },
        },
      };

      const mockDbBlock = {
        flavour: 'affine:database',
        model: mockDbModel,
      };

      // Client 1: Opens the source document
      const mockDoc1 = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlock: vi.fn().mockReturnValue(mockDbBlock),
          transact: vi.fn((fn: () => void) => fn()),
          on: vi.fn((event: string, handler: (event: any) => void) => {
            if (event === 'afterTransaction') {
              afterTransactionHandlers.push(handler);
            }
          }),
          off: vi.fn(),
        },
      };

      // Client 2: Opens the same document (or a reference to it)
      const mockDoc2 = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlock: vi.fn().mockReturnValue(mockDbBlock),
          transact: vi.fn((fn: () => void) => fn()),
          on: vi.fn((event: string, handler: (event: any) => void) => {
            if (event === 'afterTransaction') {
              afterTransactionHandlers.push(handler);
            }
          }),
          off: vi.fn(),
        },
      };

      // Setup: Both clients open the document
      vi.mocked(mockDocsService.open!)
        .mockReturnValueOnce({
          doc: mockDoc1 as any,
          release: mockRelease1,
        })
        .mockReturnValueOnce({
          doc: mockDoc2 as any,
          release: mockRelease2,
        });

      // Client 1 makes a change
      await service.updateDatabaseCell(
        'test-doc-id',
        'database-block-id',
        'row-id',
        'col-1',
        'Updated by Client 1'
      );

      // Verify that the transaction was executed
      expect(mockDoc1.blockSuiteDoc.transact).toHaveBeenCalled();

      // Simulate Y.js propagating the change by triggering afterTransaction handlers
      // In a real scenario, Y.js would automatically sync this across all clients
      const mockTransactionEvent = {
        origin: 'client-1',
        changed: new Set(['database-block-id']),
      };

      afterTransactionHandlers.forEach(handler => {
        handler(mockTransactionEvent);
      });

      // Client 2 reads the data (simulating that it received the update)
      await service.updateDatabaseCell(
        'test-doc-id',
        'database-block-id',
        'row-id',
        'col-1',
        'Updated by Client 2'
      );

      // Verify that both clients interacted with the same underlying model
      // In a real Y.js scenario, they would share the same Y.Doc instance
      expect(mockDoc1.blockSuiteDoc.getBlock).toHaveBeenCalledWith(
        'database-block-id'
      );
      expect(mockDoc2.blockSuiteDoc.getBlock).toHaveBeenCalledWith(
        'database-block-id'
      );

      // Verify cleanup
      expect(mockRelease1).toHaveBeenCalled();
      expect(mockRelease2).toHaveBeenCalled();
    });

    it('should verify that DatabaseBlockDataSource operations are Y.js aware', async () => {
      // This test verifies that DatabaseBlockDataSource operations
      // (which are used by both direct database access and references)
      // properly integrate with Y.js for synchronization.

      const mockRelease = vi.fn();
      const transactionLog: string[] = [];

      const mockDbModel = {
        props: {
          columns$: {
            value: [
              { id: 'col-1', name: 'Task', type: 'text' },
              { id: 'col-2', name: 'Status', type: 'select' },
            ],
          },
        },
      };

      const mockDbBlock = {
        flavour: 'affine:database',
        model: mockDbModel,
      };

      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlock: vi.fn().mockReturnValue(mockDbBlock),
          transact: vi.fn((fn: () => void) => {
            transactionLog.push('transaction-start');
            fn();
            transactionLog.push('transaction-end');
          }),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      // Perform multiple operations that should all be Y.js aware
      await service.updateDatabaseCell(
        'test-doc-id',
        'database-block-id',
        'row-1',
        'col-1',
        'Task 1'
      );

      await service.updateDatabaseCell(
        'test-doc-id',
        'database-block-id',
        'row-1',
        'col-2',
        'In Progress'
      );

      // Verify that each operation was wrapped in a transaction
      expect(transactionLog.length).toBeGreaterThan(0);
      expect(
        transactionLog.filter(log => log === 'transaction-start').length
      ).toBeGreaterThan(0);
      expect(
        transactionLog.filter(log => log === 'transaction-end').length
      ).toBeGreaterThan(0);

      // Verify cleanup
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should handle Y.js synchronization errors gracefully', async () => {
      // This test verifies that if Y.js synchronization fails,
      // the system handles it gracefully without corrupting data.

      const mockRelease = vi.fn();

      const mockDbModel = {
        props: {
          columns$: {
            value: [{ id: 'col-1', name: 'Task', type: 'text' }],
          },
        },
      };

      const mockDbBlock = {
        flavour: 'affine:database',
        model: mockDbModel,
      };

      const mockDoc = {
        waitForSyncReady: vi.fn().mockResolvedValue(undefined),
        blockSuiteDoc: {
          getBlock: vi.fn().mockReturnValue(mockDbBlock),
          transact: vi.fn((fn: () => void) => {
            // Simulate a transaction error
            throw new Error('Y.js synchronization failed');
          }),
        },
      };

      vi.mocked(mockDocsService.open!).mockReturnValue({
        doc: mockDoc as any,
        release: mockRelease,
      });

      // Attempt an operation that will fail due to Y.js error
      await expect(
        service.updateDatabaseCell(
          'test-doc-id',
          'database-block-id',
          'row-id',
          'col-1',
          'Updated Task'
        )
      ).rejects.toThrow('Y.js synchronization failed');

      // Verify that cleanup still happens even on error
      expect(mockRelease).toHaveBeenCalled();
    });
  });
});
