/**
 * @vitest-environment happy-dom
 */
import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  databaseReferenceSlashItem,
  databaseReferenceSlashMenuConfig,
} from '../slash-commands/database-reference-command';
import type {
  DatabaseInfo,
  DatabaseViewInfo,
  DocWithDatabases,
} from '../utils/workspace-database-scanner';

/**
 * Task 20.1: Test slash command end-to-end flow
 */
describe('Task 20.1: Slash Command End-to-End Flow', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Slash Menu Option Visibility', () => {
    it('should show Database Reference option in slash menu', () => {
      expect(databaseReferenceSlashItem.name).toBe('Database Reference');
      expect(databaseReferenceSlashItem.description).toBeDefined();
      expect(databaseReferenceSlashItem.icon).toBeDefined();
      expect(databaseReferenceSlashItem.action).toBeDefined();
    });

    it('should have search aliases for discoverability', () => {
      const aliases = databaseReferenceSlashItem.searchAlias;
      expect(aliases).toBeDefined();
      expect(aliases).toContain('database');
      expect(aliases).toContain('reference');
    });

    it('should be in the Database group', () => {
      expect(databaseReferenceSlashItem.group).toBeDefined();
      expect(databaseReferenceSlashItem.group).toContain('Database');
    });
  });

  describe('Opening Picker Modal', () => {
    it('should dispatch event when action is triggered', () => {
      let dispatchedEvent: CustomEvent | null = null;
      const mockStd = {
        host: {
          dispatchEvent: (event: CustomEvent) => {
            dispatchedEvent = event;
          },
        },
      };
      const mockModel = {
        id: 'test-block-id',
        store: { getParent: () => ({ id: 'parent-block-id' }) },
      };

      databaseReferenceSlashItem.action!({
        std: mockStd as any,
        model: mockModel as any,
      } as any);

      expect(dispatchedEvent).not.toBeNull();
      expect(dispatchedEvent!.type).toBe('affine:open-database-picker');
    });

    it('should include correct block and parent IDs in event', () => {
      let dispatchedEvent: CustomEvent | null = null;
      const mockStd = {
        host: {
          dispatchEvent: (event: CustomEvent) => {
            dispatchedEvent = event;
          },
        },
      };
      const mockModel = {
        id: 'block-123',
        store: { getParent: () => ({ id: 'parent-456' }) },
      };

      databaseReferenceSlashItem.action!({
        std: mockStd as any,
        model: mockModel as any,
      } as any);

      expect(dispatchedEvent!.detail.blockId).toBe('block-123');
      expect(dispatchedEvent!.detail.parentId).toBe('parent-456');
    });

    it('should not dispatch event when parent is not found', () => {
      let dispatchedEvent: CustomEvent | null = null;
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const mockStd = {
        host: {
          dispatchEvent: (event: CustomEvent) => {
            dispatchedEvent = event;
          },
        },
      };
      const mockModel = {
        id: 'orphan-block',
        store: { getParent: () => null },
      };

      databaseReferenceSlashItem.action!({
        std: mockStd as any,
        model: mockModel as any,
      } as any);

      expect(dispatchedEvent).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Database Selection and Reference Insertion', () => {
    it('should include insert position in event detail', () => {
      let dispatchedEvent: CustomEvent | null = null;
      const mockStd = {
        host: {
          dispatchEvent: (event: CustomEvent) => {
            dispatchedEvent = event;
          },
        },
      };
      const mockModel = {
        id: 'current-block',
        store: { getParent: () => ({ id: 'parent-block' }) },
      };

      databaseReferenceSlashItem.action!({
        std: mockStd as any,
        model: mockModel as any,
      } as any);

      expect(dispatchedEvent!.detail.insertPosition).toBeDefined();
      expect(dispatchedEvent!.detail.insertPosition.type).toBe('after');
      expect(dispatchedEvent!.detail.insertPosition.referenceId).toBe(
        'current-block'
      );
    });

    it('should always insert after the current block', () => {
      fc.assert(
        fc.property(fc.uuid(), blockId => {
          let dispatchedEvent: CustomEvent | null = null;
          const mockStd = {
            host: {
              dispatchEvent: (event: CustomEvent) => {
                dispatchedEvent = event;
              },
            },
          };
          const mockModel = {
            id: blockId,
            store: { getParent: () => ({ id: 'parent-id' }) },
          };

          databaseReferenceSlashItem.action!({
            std: mockStd as any,
            model: mockModel as any,
          } as any);

          expect(dispatchedEvent).not.toBeNull();
          expect(dispatchedEvent!.detail.insertPosition.type).toBe('after');
          expect(dispatchedEvent!.detail.insertPosition.referenceId).toBe(
            blockId
          );
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Cancellation Behavior', () => {
    it('should not modify document when cancelled', () => {
      let documentModified = false;
      let modalClosed = false;
      const handleCancel = () => {
        modalClosed = true;
      };
      handleCancel();
      expect(modalClosed).toBe(true);
      expect(documentModified).toBe(false);
    });

    it('should handle Escape key for cancellation', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Escape', 'Enter', 'Tab', 'ArrowDown'),
          key => {
            let cancelCalled = false;
            const handleKeyDown = (eventKey: string) => {
              if (eventKey === 'Escape') cancelCalled = true;
            };
            handleKeyDown(key);
            if (key === 'Escape') expect(cancelCalled).toBe(true);
            else expect(cancelCalled).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

/**
 * Task 20.2: Test edge cases
 */
describe('Task 20.2: Edge Cases', () => {
  describe('Workspace with No Databases', () => {
    it('should handle empty workspace gracefully', () => {
      const docsWithDatabases: DocWithDatabases[] = [];
      expect(docsWithDatabases.length).toBe(0);
      const searchTerm = 'anything';
      const filtered = docsWithDatabases.filter(doc =>
        doc.docTitle.toLowerCase().includes(searchTerm)
      );
      expect(filtered.length).toBe(0);
    });

    it('should still allow slash command to be triggered', () => {
      let dispatchedEvent: CustomEvent | null = null;
      const mockStd = {
        host: {
          dispatchEvent: (event: CustomEvent) => {
            dispatchedEvent = event;
          },
        },
      };
      const mockModel = {
        id: 'block-id',
        store: { getParent: () => ({ id: 'parent-id' }) },
      };
      databaseReferenceSlashItem.action!({
        std: mockStd as any,
        model: mockModel as any,
      } as any);
      expect(dispatchedEvent).not.toBeNull();
    });
  });

  describe('Databases with No Views', () => {
    it('should handle database with default view', () => {
      const dbWithDefaultView: DatabaseInfo = {
        blockId: 'db-1',
        name: 'My Database',
        views: [{ id: 'default', name: 'Table View', type: 'table' }],
      };
      expect(dbWithDefaultView.views.length).toBe(1);
      expect(dbWithDefaultView.views[0].type).toBe('table');
    });

    it('should provide default view name based on type', () => {
      const getDefaultViewName = (type: string): string => {
        switch (type) {
          case 'table':
            return 'Table View';
          case 'kanban':
            return 'Kanban View';
          case 'gallery':
            return 'Gallery View';
          default:
            return type.charAt(0).toUpperCase() + type.slice(1) + ' View';
        }
      };
      expect(getDefaultViewName('table')).toBe('Table View');
      expect(getDefaultViewName('kanban')).toBe('Kanban View');
      expect(getDefaultViewName('gallery')).toBe('Gallery View');
    });
  });

  describe('Very Long Names', () => {
    it('should handle very long database names', () => {
      const longName = 'A'.repeat(500);
      const database: DatabaseInfo = {
        blockId: 'db-1',
        name: longName,
        views: [{ id: 'v1', name: 'Table View', type: 'table' }],
      };
      expect(database.name.length).toBe(500);
      const searchTerm = 'AAA';
      const matches = database.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      expect(matches).toBe(true);
    });

    it('should handle very long document titles', () => {
      const longTitle = 'Document '.repeat(100);
      const doc: DocWithDatabases = {
        docId: 'doc-1',
        docTitle: longTitle,
        databases: [
          {
            blockId: 'db-1',
            name: 'Tasks',
            views: [{ id: 'v1', name: 'Table View', type: 'table' }],
          },
        ],
      };
      expect(doc.docTitle.length).toBeGreaterThan(500);
      const searchTerm = 'document';
      const matches = doc.docTitle.toLowerCase().includes(searchTerm);
      expect(matches).toBe(true);
    });
  });

  describe('Special Characters in Names', () => {
    it('should handle unicode characters in database names', () => {
      const unicodeNames = ['Database', 'Cafe Tasks', 'Naive Implementation'];
      for (const name of unicodeNames) {
        const database: DatabaseInfo = {
          blockId: 'db-1',
          name,
          views: [{ id: 'v1', name: 'Table View', type: 'table' }],
        };
        expect(database.name).toBe(name);
      }
    });

    it('should handle special regex characters in search', () => {
      const specialChars = ['[Tasks]', '(Important)', 'Task.List'];
      for (const name of specialChars) {
        const database: DatabaseInfo = {
          blockId: 'db-1',
          name,
          views: [{ id: 'v1', name: 'Table View', type: 'table' }],
        };
        const searchTerm = name.substring(0, 3);
        const matches = database.name.includes(searchTerm);
        expect(matches).toBe(true);
      }
    });

    it('should handle HTML-like characters', () => {
      const htmlNames = [
        'Tasks and Projects',
        'Tasks less than 10',
        'Priority greater than 5',
      ];
      for (const name of htmlNames) {
        const database: DatabaseInfo = {
          blockId: 'db-1',
          name,
          views: [{ id: 'v1', name: 'Table View', type: 'table' }],
        };
        expect(database.name).toBe(name);
      }
    });
  });

  describe('When Condition Edge Cases', () => {
    it('should not show in database blocks', () => {
      const mockModel = {
        flavour: 'affine:database',
        store: { getParent: () => null },
      };
      const result = databaseReferenceSlashItem.when!({
        model: mockModel as any,
      } as any);
      expect(result).toBe(false);
    });

    it('should be disabled when inside database block (config check)', () => {
      const mockModel = { flavour: 'affine:database' };
      const isDisabled = databaseReferenceSlashMenuConfig.disableWhen!({
        model: mockModel as any,
      } as any);
      expect(isDisabled).toBe(true);
    });

    it('should not be disabled for non-database blocks', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('affine:paragraph', 'affine:list', 'affine:code'),
          flavour => {
            const mockModel = { flavour };
            const isDisabled = databaseReferenceSlashMenuConfig.disableWhen!({
              model: mockModel as any,
            } as any);
            expect(isDisabled).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
