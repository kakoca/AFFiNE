import { SlashMenuConfigExtension } from '@blocksuite/affine-widget-slash-menu';
import type { ExtensionType } from '@blocksuite/store';

import { databaseReferenceSlashMenuConfig } from '../slash-commands/database-reference-command';

/**
 * Extension to register the database reference slash menu item
 *
 * This extension adds the "Database Reference" option to the slash menu,
 * allowing users to insert references to databases from other pages.
 *
 * Requirements: 12.1
 */
export const DatabaseReferenceSlashMenuExtension: ExtensionType =
  SlashMenuConfigExtension(
    'affine:database-reference',
    databaseReferenceSlashMenuConfig
  );

/**
 * Get the database reference slash menu extension
 *
 * This function returns the extension that can be registered
 * with the BlockSuite framework.
 */
export function getDatabaseReferenceSlashMenuExtension(): ExtensionType {
  return DatabaseReferenceSlashMenuExtension;
}
