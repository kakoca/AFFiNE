import { isInsideBlockByFlavour } from '@blocksuite/affine-shared/utils';
import type {
  SlashMenuActionItem,
  SlashMenuConfig,
} from '@blocksuite/affine-widget-slash-menu';
import { LinkedPageIcon } from '@blocksuite/icons/lit';

/**
 * Slash menu configuration for database reference insertion
 *
 * This provides a slash command option to insert database references
 * from other pages in the workspace.
 *
 * Requirements: 12.1
 */

/**
 * Database Reference slash menu item
 *
 * When selected, this opens a database picker modal that allows users to:
 * - Search for pages containing databases
 * - Select a specific database
 * - Optionally select a specific view
 * - Insert the reference at the cursor position
 */
export const databaseReferenceSlashItem: SlashMenuActionItem = {
  name: 'Database Reference',
  description: 'Insert a reference to a database from another page',
  searchAlias: ['database', 'reference', 'link database', 'embed database'],
  icon: LinkedPageIcon(),
  group: '7_Database@3', // Place after Table View and Kanban View in the Database group
  /**
   * Only show in note blocks, not in edgeless text or database blocks
   */
  when: ({ model }) =>
    !isInsideBlockByFlavour(model.store, model, 'affine:edgeless-text') &&
    model.flavour !== 'affine:database',
  /**
   * Action to open the database picker modal
   *
   * This action triggers the database picker modal which allows users to:
   * 1. Browse all databases in the workspace
   * 2. Search for specific databases
   * 3. Select a database and optionally a specific view
   * 4. Insert the reference at the current cursor position
   *
   * The actual modal opening is handled by dispatching a custom event
   * that the DatabasePickerModal component listens for.
   */
  action: ({ std, model }) => {
    // Get the current block position for insertion
    const blockId = model.id;
    const parentId = model.store.getParent(model)?.id;

    if (!parentId) {
      console.error('Cannot insert database reference: no parent block found');
      return;
    }

    // Dispatch a custom event to open the database picker modal
    // The modal component will listen for this event and handle the UI
    const event = new CustomEvent('affine:open-database-picker', {
      detail: {
        std,
        blockId,
        parentId,
        // The position where the reference should be inserted
        insertPosition: {
          type: 'after',
          referenceId: blockId,
        },
      },
      bubbles: true,
      composed: true,
    });

    // Dispatch from the host element
    std.host.dispatchEvent(event);
  },
};

/**
 * Slash menu configuration for database reference
 *
 * This configuration is registered with the slash menu system
 * to provide the "Database Reference" option.
 */
export const databaseReferenceSlashMenuConfig: SlashMenuConfig = {
  /**
   * Disable when inside a database block (can't nest database references)
   */
  disableWhen: ({ model }) => model.flavour === 'affine:database',
  items: [databaseReferenceSlashItem],
};

/**
 * Event detail type for the database picker open event
 */
export interface DatabasePickerOpenEventDetail {
  std: any;
  blockId: string;
  parentId: string;
  insertPosition: {
    type: 'before' | 'after';
    referenceId: string;
  };
}

/**
 * Type declaration for the custom event
 */
declare global {
  interface HTMLElementEventMap {
    'affine:open-database-picker': CustomEvent<DatabasePickerOpenEventDetail>;
  }
}
