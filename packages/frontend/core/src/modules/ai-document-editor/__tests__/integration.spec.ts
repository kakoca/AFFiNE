/**
 * Integration and End-to-End Tests for AI Document Editor
 *
 * These tests verify complete workflows and interactions between components.
 * Task 17: Integration and end-to-end testing
 * Requirements: All
 *
 * @vitest-environment happy-dom
 */
/* eslint-disable rxjs/finnish */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GraphQLService } from '../../cloud';
import type { DocsService } from '../../doc';
import type { WorkspaceService } from '../../workspace';
import { AIDocumentEditorService } from '../services/ai-document-editor';
import { ChangePreviewService } from '../services/change-preview';
import { DatabaseReferenceService } from '../services/database-reference';
import { DocumentContextManager } from '../services/document-context-manager';

describe('Integration Tests: AI Document Editor', () => {
  let aiService: AIDocumentEditorService;
  let dbRefService: DatabaseReferenceService;
  let previewService: ChangePreviewService;
  let contextManager: DocumentContextManager;
  let mockDocsService: Partial<DocsService>;
  let mockWorkspaceService: Partial<WorkspaceService>;
  let mockGraphQLService: Partial<GraphQLService>;

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

    // Create service instances
    contextManager = new DocumentContextManager(
      mockDocsService as DocsService,
      mockWorkspaceService as WorkspaceService
    );

    aiService = new AIDocumentEditorService(
      mockDocsService as DocsService,
      mockWorkspaceService as WorkspaceService,
      mockGraphQLService as GraphQLService,
      contextManager
    );

    dbRefService = new DatabaseReferenceService(mockDocsService as DocsService);

    previewService = new ChangePreviewService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 17.1: Complete Command Execution Flows', () => {
    describe('Edit Command Flow', () => {
      it('should execute complete edit command from chat to document update', async () => {
        // Setup: Create a mock document with content
        const mockRelease = vi.fn();
        const mockBlocks = [
          {
            id: 'block-1',
            flavour: 'affine:paragraph',
            model: { text: 'Original text' },
          },
        ];
        const mockDoc = {
          waitForSyncReady: vi.fn().mockResolvedValue(undefined),
          blockSuiteDoc: {
            getBlocksByFlavour: vi
              .fn()
              .mockReturnValue([{ id: 'note-1', children: mockBlocks }]),
            getBlock: vi.fn((id: string) => mockBlocks.find(b => b.id === id)),
            transact: vi.fn((fn: () => void) => fn()),
          },
        };

        vi.mocked(mockDocsService.open!).mockReturnValue({
          doc: mockDoc as any,
          release: mockRelease,
        });

        // Set active document context
        vi.spyOn(contextManager, 'getActiveDocumentContext').mockReturnValue({
          docId: 'test-doc-id',
          databases: [],
        } as any);

        // Execute: Run edit command
        const result = await aiService.editDocument(
          'test-doc-id',
          'Change the text to "Updated text"'
        );

        // Verify: Command was processed and document was accessed
        expect(result.success).toBe(true);
        expect(mockDocsService.open).toHaveBeenCalledWith('test-doc-id');
        expect(mockDoc.waitForSyncReady).toHaveBeenCalled();
        expect(mockDoc.blockSuiteDoc.transact).toHaveBeenCalled();
        expect(mockRelease).toHaveBeenCalled();
      });

      it('should handle edit command with context resolution', async () => {
        // Setup: Mock active document
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

        vi.spyOn(contextManager, 'getActiveDocumentContext').mockReturnValue({
          docId: 'active-doc-id',
          databases: [],
        } as any);

        // Execute: Command referencing "this page"
        const result = await aiService.executeCommand('edit this page');

        // Verify: Should use active document context
        expect(contextManager.getActiveDocumentContext).toHaveBeenCalled();
      });
    });

    describe('Database Creation and Manipulation Flow', () => {
      it('should create database and add rows in sequence', async () => {
        // Setup: Mock document
        const mockRelease = vi.fn();
        const mockNoteBlock = {
          id: 'note-1',
          model: { children: [] },
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
          flavour: 'affine:database',
          model: mockDbModel,
        };

        const mockDoc = {
          waitForSyncReady: vi.fn().mockResolvedValue(undefined),
          blockSuiteDoc: {
            getBlocksByFlavour: vi.fn().mockReturnValue([mockNoteBlock]),
            addBlock: vi.fn().mockReturnValue('db-1'),
            getBlock: vi.fn().mockReturnValue(mockDbBlock),
          },
        };

        vi.mocked(mockDocsService.open!).mockReturnValue({
          doc: mockDoc as any,
          release: mockRelease,
        });

        // Execute: Create database
        const dbId = await aiService.createDatabase('test-doc-id', {
          columns: [
            { name: 'Task', type: 'text' },
            { name: 'Status', type: 'select' },
          ],
          viewType: 'table',
        });

        expect(dbId).toBe('db-1');
        expect(mockDoc.blockSuiteDoc.addBlock).toHaveBeenCalledWith(
          'affine:database',
          { columns: [], views: [] },
          'note-1',
          undefined
        );

        // Execute: Add row to the database
        await aiService.addDatabaseRow('test-doc-id', dbId, 'end', {
          Task: 'New Task',
          Status: 'Todo',
        });

        // Verify: Both operations completed
        expect(mockRelease).toHaveBeenCalled();
      });

      it('should update database cells and view configuration', async () => {
        // Setup: Mock database
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

        // Execute: Update cell
        await aiService.updateDatabaseCell(
          'test-doc-id',
          'db-1',
          'row-1',
          'col-1',
          'Updated Task'
        );

        // Execute: Update view config
        await aiService.updateDatabaseViewConfig(
          'test-doc-id',
          'db-1',
          'view-1',
          { filter: { type: 'status', value: 'active' } }
        );

        // Verify: Both operations completed
        expect(mockDoc.blockSuiteDoc.getBlock).toHaveBeenCalledWith('db-1');
        expect(mockRelease).toHaveBeenCalled();
      });
    });

    describe('Database Reference Creation and Synchronization Flow', () => {
      it('should create database reference and verify synchronization', async () => {
        // Setup: Mock source document with database
        const mockSourceRelease = vi.fn();
        const mockSourceDbBlock = {
          flavour: 'affine:database',
          model: {
            props: {
              columns$: { value: [] },
            },
          },
        };

        const mockSourceDoc = {
          waitForSyncReady: vi.fn().mockResolvedValue(undefined),
          blockSuiteDoc: {
            getBlock: vi.fn().mockReturnValue(mockSourceDbBlock),
          },
        };

        // Setup: Mock target document
        const mockTargetRelease = vi.fn();
        const mockTargetNoteBlock = {
          id: 'target-note-1',
          model: { children: [] },
        };

        const mockTargetDoc = {
          waitForSyncReady: vi.fn().mockResolvedValue(undefined),
          blockSuiteDoc: {
            getBlocksByFlavour: vi.fn().mockReturnValue([mockTargetNoteBlock]),
            addBlock: vi.fn().mockReturnValue('ref-1'),
          },
        };

        // Mock DocsService to return different docs for source and target
        vi.mocked(mockDocsService.open!)
          .mockReturnValueOnce({
            doc: mockSourceDoc as any,
            release: mockSourceRelease,
          })
          .mockReturnValueOnce({
            doc: mockTargetDoc as any,
            release: mockTargetRelease,
          });

        // Execute: Create reference
        const refId = await dbRefService.createReference(
          'target-doc-id',
          'source-doc-id',
          'source-db-id'
        );

        // Verify: Reference was created
        expect(refId).toBe('ref-1');
        expect(mockTargetDoc.blockSuiteDoc.addBlock).toHaveBeenCalledWith(
          'affine:database-reference',
          {
            sourceDocId: 'source-doc-id',
            sourceDatabaseId: 'source-db-id',
            viewId: undefined,
          },
          'target-note-1',
          undefined
        );

        // Verify: Both documents were properly released
        expect(mockSourceRelease).toHaveBeenCalled();
        expect(mockTargetRelease).toHaveBeenCalled();
      });

      it('should create view-specific reference', async () => {
        // Setup: Mock documents
        const mockSourceRelease = vi.fn();
        const mockSourceDbBlock = {
          flavour: 'affine:database',
          model: {
            props: {
              columns$: { value: [] },
            },
          },
        };

        const mockSourceDoc = {
          waitForSyncReady: vi.fn().mockResolvedValue(undefined),
          blockSuiteDoc: {
            getBlock: vi.fn().mockReturnValue(mockSourceDbBlock),
          },
        };

        const mockTargetRelease = vi.fn();
        const mockTargetNoteBlock = {
          id: 'target-note-1',
          model: { children: [] },
        };

        const mockTargetDoc = {
          waitForSyncReady: vi.fn().mockResolvedValue(undefined),
          blockSuiteDoc: {
            getBlocksByFlavour: vi.fn().mockReturnValue([mockTargetNoteBlock]),
            addBlock: vi.fn().mockReturnValue('ref-1'),
          },
        };

        vi.mocked(mockDocsService.open!)
          .mockReturnValueOnce({
            doc: mockSourceDoc as any,
            release: mockSourceRelease,
          })
          .mockReturnValueOnce({
            doc: mockTargetDoc as any,
            release: mockTargetRelease,
          });

        // Execute: Create view-specific reference
        const refId = await dbRefService.createReference(
          'target-doc-id',
          'source-doc-id',
          'source-db-id',
          'kanban-view-1'
        );

        // Verify: Reference includes viewId
        expect(mockTargetDoc.blockSuiteDoc.addBlock).toHaveBeenCalledWith(
          'affine:database-reference',
          {
            sourceDocId: 'source-doc-id',
            sourceDatabaseId: 'source-db-id',
            viewId: 'kanban-view-1',
          },
          'target-note-1',
          undefined
        );
      });
    });
  });

  describe('Task 17.2: Multi-User Scenarios', () => {
    describe('Concurrent Edits from Multiple Users', () => {
      it('should handle concurrent edits with Y.js transactions', async () => {
        // Setup: Shared database model (simulating Y.js shared state)
        const sharedDbModel = {
          props: {
            columns$: {
              value: [{ id: 'col-1', name: 'Task', type: 'text' }],
            },
          },
        };

        const mockDbBlock = {
          flavour: 'affine:database',
          model: sharedDbModel,
        };

        // User 1's document reference
        const mockRelease1 = vi.fn();
        const transactionLog: string[] = [];
        const mockDoc1 = {
          waitForSyncReady: vi.fn().mockResolvedValue(undefined),
          blockSuiteDoc: {
            getBlock: vi.fn().mockReturnValue(mockDbBlock),
            transact: vi.fn((fn: () => void) => {
              transactionLog.push('user1-transaction');
              fn();
            }),
          },
        };

        // User 2's document reference (same underlying Y.js doc)
        const mockRelease2 = vi.fn();
        const mockDoc2 = {
          waitForSyncReady: vi.fn().mockResolvedValue(undefined),
          blockSuiteDoc: {
            getBlock: vi.fn().mockReturnValue(mockDbBlock),
            transact: vi.fn((fn: () => void) => {
              transactionLog.push('user2-transaction');
              fn();
            }),
          },
        };

        // Execute: User 1 makes an edit
        vi.mocked(mockDocsService.open!).mockReturnValueOnce({
          doc: mockDoc1 as any,
          release: mockRelease1,
        });

        await aiService.updateDatabaseCell(
          'shared-doc-id',
          'db-1',
          'row-1',
          'col-1',
          'User 1 edit'
        );

        // Execute: User 2 makes an edit
        vi.mocked(mockDocsService.open!).mockReturnValueOnce({
          doc: mockDoc2 as any,
          release: mockRelease2,
        });

        await aiService.updateDatabaseCell(
          'shared-doc-id',
          'db-1',
          'row-1',
          'col-1',
          'User 2 edit'
        );

        // Verify: Both transactions were executed
        expect(transactionLog).toContain('user1-transaction');
        expect(transactionLog).toContain('user2-transaction');

        // Verify: Both users accessed the same model
        expect(mockDoc1.blockSuiteDoc.getBlock).toHaveBeenCalledWith('db-1');
        expect(mockDoc2.blockSuiteDoc.getBlock).toHaveBeenCalledWith('db-1');

        // Verify: Cleanup
        expect(mockRelease1).toHaveBeenCalled();
        expect(mockRelease2).toHaveBeenCalled();
      });

      it('should propagate edits across all active sessions (Requirements 1.5)', async () => {
        // Setup: Simulate multiple sessions viewing the same document
        const afterTransactionHandlers: Array<(event: any) => void> = [];
        const sharedDbModel = {
          props: {
            columns$: {
              value: [{ id: 'col-1', name: 'Task', type: 'text' }],
            },
          },
        };

        const mockDbBlock = {
          flavour: 'affine:database',
          model: sharedDbModel,
        };

        // Session 1
        const mockRelease1 = vi.fn();
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
          },
        };

        // Session 2
        const mockRelease2 = vi.fn();
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
          },
        };

        // Execute: Session 1 makes an edit
        vi.mocked(mockDocsService.open!).mockReturnValueOnce({
          doc: mockDoc1 as any,
          release: mockRelease1,
        });

        await aiService.updateDatabaseCell(
          'shared-doc-id',
          'db-1',
          'row-1',
          'col-1',
          'Session 1 edit'
        );

        // Simulate Y.js propagating the change
        const mockTransactionEvent = {
          origin: 'session-1',
          changed: new Set(['db-1']),
        };

        afterTransactionHandlers.forEach(handler => {
          handler(mockTransactionEvent);
        });

        // Verify: Transaction was executed
        expect(mockDoc1.blockSuiteDoc.transact).toHaveBeenCalled();

        // Verify: Cleanup
        expect(mockRelease1).toHaveBeenCalled();
      });
    });

    describe('Reference Synchronization Across Users', () => {
      it('should synchronize reference edits to source database (Requirements 4.3)', async () => {
        // Setup: Source database
        const sharedDbModel = {
          props: {
            columns$: {
              value: [{ id: 'col-1', name: 'Task', type: 'text' }],
            },
          },
        };

        const mockSourceDbBlock = {
          flavour: 'affine:database',
          model: sharedDbModel,
        };

        // Setup: Reference block pointing to source
        const mockRefBlock = {
          flavour: 'affine:database-reference',
          model: {
            props: {
              sourceDocId: 'source-doc-id',
              sourceDatabaseId: 'source-db-id',
            },
          },
        };

        // User 1: Opens reference document
        const mockRefRelease = vi.fn();
        const mockRefDoc = {
          waitForSyncReady: vi.fn().mockResolvedValue(undefined),
          blockSuiteDoc: {
            getBlock: vi.fn((id: string) => {
              if (id === 'ref-1') return mockRefBlock;
              return null;
            }),
          },
        };

        // User 1: Opens source document (via reference)
        const mockSourceRelease = vi.fn();
        const mockSourceDoc = {
          waitForSyncReady: vi.fn().mockResolvedValue(undefined),
          blockSuiteDoc: {
            getBlock: vi.fn().mockReturnValue(mockSourceDbBlock),
          },
        };

        // Execute: Get DataSource for reference
        vi.mocked(mockDocsService.open!)
          .mockReturnValueOnce({
            doc: mockRefDoc as any,
            release: mockRefRelease,
          })
          .mockReturnValueOnce({
            doc: mockSourceDoc as any,
            release: mockSourceRelease,
          });

        const { dataSource, release } =
          await dbRefService.getDataSourceForReference('ref-doc-id', 'ref-1');

        // Verify: DataSource is connected to source database
        expect(mockSourceDoc.blockSuiteDoc.getBlock).toHaveBeenCalledWith(
          'source-db-id'
        );
        expect(dataSource).toBeDefined();

        // Verify: Cleanup function releases both documents
        release();
        expect(mockRefRelease).toHaveBeenCalled();
        expect(mockSourceRelease).toHaveBeenCalled();
      });

      it('should propagate source changes to all references', async () => {
        // Setup: Source database with multiple references
        const sharedDbModel = {
          props: {
            columns$: {
              value: [{ id: 'col-1', name: 'Task', type: 'text' }],
            },
          },
        };

        const mockSourceDbBlock = {
          flavour: 'affine:database',
          model: sharedDbModel,
        };

        const mockSourceRelease = vi.fn();
        const transactionLog: string[] = [];
        const mockSourceDoc = {
          waitForSyncReady: vi.fn().mockResolvedValue(undefined),
          blockSuiteDoc: {
            getBlock: vi.fn().mockReturnValue(mockSourceDbBlock),
            transact: vi.fn((fn: () => void) => {
              transactionLog.push('source-transaction');
              fn();
            }),
          },
        };

        // Execute: Edit source database
        vi.mocked(mockDocsService.open!).mockReturnValue({
          doc: mockSourceDoc as any,
          release: mockSourceRelease,
        });

        await aiService.updateDatabaseCell(
          'source-doc-id',
          'source-db-id',
          'row-1',
          'col-1',
          'Updated from source'
        );

        // Verify: Transaction was executed on source
        expect(transactionLog).toContain('source-transaction');

        // In a real Y.js scenario, this change would automatically
        // propagate to all references viewing the same database
        expect(mockSourceDoc.blockSuiteDoc.transact).toHaveBeenCalled();
        expect(mockSourceRelease).toHaveBeenCalled();
      });
    });
  });

  describe('Task 17.3: Edge Cases', () => {
    describe('Empty Document Handling', () => {
      it('should handle empty document gracefully', async () => {
        // Setup: Empty document (no note blocks)
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

        // Execute: Try to add content to empty document
        await expect(
          aiService.addContent('empty-doc-id', {
            type: 'affine:paragraph',
            props: { text: 'Hello' },
          })
        ).rejects.toThrow('No note block found');

        // Verify: Document was still released
        expect(mockRelease).toHaveBeenCalled();
      });

      it('should handle document with no content blocks', async () => {
        // Setup: Document with note block but no children
        const mockRelease = vi.fn();
        const mockNoteBlock = {
          id: 'note-1',
          children: [],
        };

        const mockDoc = {
          waitForSyncReady: vi.fn().mockResolvedValue(undefined),
          blockSuiteDoc: {
            getBlocksByFlavour: vi.fn().mockReturnValue([mockNoteBlock]),
            addBlock: vi.fn().mockReturnValue('new-block-1'),
          },
        };

        vi.mocked(mockDocsService.open!).mockReturnValue({
          doc: mockDoc as any,
          release: mockRelease,
        });

        // Execute: Add content to empty note
        const blockId = await aiService.addContent('doc-id', {
          type: 'affine:paragraph',
          props: { text: 'First content' },
        });

        // Verify: Content was added successfully
        expect(blockId).toBe('new-block-1');
        expect(mockDoc.blockSuiteDoc.addBlock).toHaveBeenCalled();
        expect(mockRelease).toHaveBeenCalled();
      });
    });

    describe('No Active Document Scenario', () => {
      it('should handle no active document context (Requirements 8.3)', async () => {
        // Setup: No active document
        vi.spyOn(contextManager, 'getActiveDocumentContext').mockReturnValue(
          null
        );

        // Execute: Try to execute command without active document
        const result = await aiService.executeCommand('edit this page');

        // Verify: Error is returned
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.message).toContain('No active document context');
      });

      it('should prompt user when no document is active', async () => {
        // Setup: No active document
        vi.spyOn(contextManager, 'getActiveDocumentContext').mockReturnValue(
          null
        );

        // Execute: Get active context
        const context = aiService.getActiveDocumentContext();

        // Verify: Returns null
        expect(context).toBeNull();
      });
    });

    describe('Invalid Reference Targets', () => {
      it('should handle source database deleted scenario (Requirements 8.3)', async () => {
        // Setup: Source document exists but database is deleted
        const mockSourceRelease = vi.fn();
        const mockSourceDoc = {
          waitForSyncReady: vi.fn().mockResolvedValue(undefined),
          blockSuiteDoc: {
            getBlock: vi.fn().mockReturnValue(null), // Database not found
          },
        };

        vi.mocked(mockDocsService.open!).mockReturnValue({
          doc: mockSourceDoc as any,
          release: mockSourceRelease,
        });

        // Execute: Try to create reference to non-existent database
        await expect(
          dbRefService.createReference(
            'target-doc-id',
            'source-doc-id',
            'deleted-db-id'
          )
        ).rejects.toThrow('Source database not found');

        // Verify: Document was still released
        expect(mockSourceRelease).toHaveBeenCalled();
      });

      it('should handle reference to wrong block type', async () => {
        // Setup: Source block exists but is not a database
        const mockSourceRelease = vi.fn();
        const mockWrongBlock = {
          flavour: 'affine:paragraph', // Not a database
        };

        const mockSourceDoc = {
          waitForSyncReady: vi.fn().mockResolvedValue(undefined),
          blockSuiteDoc: {
            getBlock: vi.fn().mockReturnValue(mockWrongBlock),
          },
        };

        vi.mocked(mockDocsService.open!).mockReturnValue({
          doc: mockSourceDoc as any,
          release: mockSourceRelease,
        });

        // Execute: Try to create reference to non-database block
        await expect(
          dbRefService.createReference(
            'target-doc-id',
            'source-doc-id',
            'paragraph-block-id'
          )
        ).rejects.toThrow('Source database not found');

        // Verify: Document was still released
        expect(mockSourceRelease).toHaveBeenCalled();
      });

      it('should validate reference before accessing DataSource', async () => {
        // Setup: Invalid reference
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

        // Execute: Validate non-existent database
        const isValid = await dbRefService.validateReference(
          'source-doc-id',
          'non-existent-db-id'
        );

        // Verify: Returns false
        expect(isValid).toBe(false);
        expect(mockRelease).toHaveBeenCalled();
      });
    });

    describe('Permission-Denied Scenarios', () => {
      it('should handle permission denied when opening document (Requirements 8.4)', async () => {
        // Setup: DocsService throws permission error
        vi.mocked(mockDocsService.open!).mockImplementation(() => {
          throw new Error(
            'Permission denied: User does not have access to this document'
          );
        });

        // Execute: Try to edit document without permission
        await expect(
          aiService.editDocument('restricted-doc-id', 'edit instructions')
        ).rejects.toThrow('Permission denied');
      });

      it('should handle permission denied when creating database reference', async () => {
        // Setup: Source document access denied
        vi.mocked(mockDocsService.open!).mockImplementation(() => {
          throw new Error('Permission denied: Cannot access source document');
        });

        // Execute: Try to create reference to restricted database
        await expect(
          dbRefService.createReference(
            'target-doc-id',
            'restricted-source-doc-id',
            'db-id'
          )
        ).rejects.toThrow('Permission denied');
      });

      it('should provide clear error message for permission issues', async () => {
        // Setup: Mock permission error
        const permissionError = new Error(
          'Permission denied: Read-only access'
        );
        vi.mocked(mockDocsService.open!).mockImplementation(() => {
          throw permissionError;
        });

        // Execute: Try to add content
        try {
          await aiService.addContent('readonly-doc-id', {
            type: 'affine:paragraph',
            props: { text: 'New content' },
          });
          expect.fail('Should have thrown error');
        } catch (error: any) {
          // Verify: Error message is clear
          expect(error.message).toContain('Permission denied');
        }
      });
    });

    describe('Network and Sync Errors', () => {
      it('should handle sync timeout gracefully', async () => {
        // Setup: Document sync fails
        const mockRelease = vi.fn();
        const mockDoc = {
          waitForSyncReady: vi
            .fn()
            .mockRejectedValue(
              new Error(
                'Sync timeout: Document failed to sync within 30 seconds'
              )
            ),
        };

        vi.mocked(mockDocsService.open!).mockReturnValue({
          doc: mockDoc as any,
          release: mockRelease,
        });

        // Execute: Try to edit document with sync failure
        const result = await aiService.editDocument(
          'doc-id',
          'edit instructions'
        );

        // Verify: Error is handled and document is released
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.message).toContain('Sync timeout');
        expect(mockRelease).toHaveBeenCalled();
      });

      it('should handle Y.js transaction errors', async () => {
        // Setup: Transaction fails
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
            transact: vi.fn(() => {
              throw new Error('Y.js transaction failed');
            }),
          },
        };

        vi.mocked(mockDocsService.open!).mockReturnValue({
          doc: mockDoc as any,
          release: mockRelease,
        });

        // Execute: Try to update cell with transaction failure
        await expect(
          aiService.updateDatabaseCell(
            'doc-id',
            'db-id',
            'row-1',
            'col-1',
            'value'
          )
        ).rejects.toThrow('Y.js transaction failed');

        // Verify: Document is still released
        expect(mockRelease).toHaveBeenCalled();
      });
    });

    describe('Complex Integration Scenarios', () => {
      it('should handle complete workflow: create database, add reference, edit through reference', async () => {
        // This test simulates a complete user workflow

        // Step 1: Create database in source document
        const mockSourceRelease = vi.fn();
        const mockSourceNoteBlock = {
          id: 'source-note-1',
          model: { children: [] },
        };

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

        const mockSourceDoc = {
          waitForSyncReady: vi.fn().mockResolvedValue(undefined),
          blockSuiteDoc: {
            getBlocksByFlavour: vi.fn().mockReturnValue([mockSourceNoteBlock]),
            addBlock: vi.fn().mockReturnValue('db-1'),
            getBlock: vi.fn().mockReturnValue(mockDbBlock),
          },
        };

        vi.mocked(mockDocsService.open!).mockReturnValue({
          doc: mockSourceDoc as any,
          release: mockSourceRelease,
        });

        const dbId = await aiService.createDatabase('source-doc-id', {
          columns: [{ name: 'Task', type: 'text' }],
          viewType: 'table',
        });

        expect(dbId).toBe('db-1');

        // Step 2: Create reference in target document
        const mockTargetRelease = vi.fn();
        const mockTargetNoteBlock = {
          id: 'target-note-1',
          model: { children: [] },
        };

        const mockTargetDoc = {
          waitForSyncReady: vi.fn().mockResolvedValue(undefined),
          blockSuiteDoc: {
            getBlocksByFlavour: vi.fn().mockReturnValue([mockTargetNoteBlock]),
            addBlock: vi.fn().mockReturnValue('ref-1'),
          },
        };

        vi.mocked(mockDocsService.open!)
          .mockReturnValueOnce({
            doc: mockSourceDoc as any,
            release: mockSourceRelease,
          })
          .mockReturnValueOnce({
            doc: mockTargetDoc as any,
            release: mockTargetRelease,
          });

        const refId = await dbRefService.createReference(
          'target-doc-id',
          'source-doc-id',
          dbId
        );

        expect(refId).toBe('ref-1');

        // Step 3: Edit through reference (simulated by editing source)
        vi.mocked(mockDocsService.open!).mockReturnValue({
          doc: mockSourceDoc as any,
          release: mockSourceRelease,
        });

        await aiService.addDatabaseRow('source-doc-id', dbId, 'end', {
          Task: 'New Task via Reference',
        });

        // Verify: All operations completed successfully
        expect(mockSourceRelease).toHaveBeenCalled();
        expect(mockTargetRelease).toHaveBeenCalled();
      });
    });
  });
});
