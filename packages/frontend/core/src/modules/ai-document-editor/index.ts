import type { Framework } from '@toeverything/infra';

import { GraphQLService } from '../cloud';
import { DocsService } from '../doc';
import { WorkbenchService } from '../workbench';
import { WorkspaceScope, WorkspaceService } from '../workspace';
import { AIDocumentEditorService } from './services/ai-document-editor';
import { ChangePreviewService } from './services/change-preview';
import { DatabaseReferenceService } from './services/database-reference';
import { DocumentContextManager } from './services/document-context-manager';

/**
 * Configure the AI Document Editor module
 *
 * This module provides AI-driven document editing capabilities including:
 * - Direct document editing through chat commands
 * - Database block creation and manipulation
 * - Cross-document database references
 * - Change preview and approval workflows
 *
 * Requirements: 11.9
 *
 * @param framework - The framework instance to configure
 */
export function configureAIDocumentEditorModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(DocumentContextManager, [WorkbenchService, DocsService])
    .service(AIDocumentEditorService, [
      DocsService,
      WorkspaceService,
      GraphQLService,
      DocumentContextManager,
    ])
    .service(DatabaseReferenceService, [DocsService])
    .service(ChangePreviewService, [DocsService]);
}

// Export types
export type {
  BlockContent,
  BlockPosition,
  BlockSelection,
  ChangePreview,
  ColumnConfig,
  CommandOptions,
  CommandResult,
  CommandType,
  DatabaseConfig,
  DatabaseInfo,
  DatabaseOperation,
  DatabaseReference,
  DeleteOperation,
  DocumentContext,
  DocumentOperation,
  EditOperation,
  EditResult,
  InsertOperation,
  ParsedCommand,
  PreviewBlock,
  RowData,
  ViewInfo,
} from './types';
export { CommandType as CommandTypeEnum } from './types';

// Export errors
export type { AIDocumentEditorError } from './errors';
export {
  AIDocumentEditorErrorType,
  CommandParseError,
  DatabaseReferenceError,
  DocumentEditError,
} from './errors';

// Export error message utilities
export type { UserFriendlyError } from './error-messages';
export { ErrorMessageTranslator } from './error-messages';

// Export retry logic utilities
export type {
  OperationMetadata,
  QueueStatus,
  RetryConfig,
} from './retry-logic';
export {
  globalOperationQueue,
  isNetworkError,
  OperationQueue,
  withRetry,
} from './retry-logic';

// Export utilities
export { CommandParser } from './command-parser';

// Export services
export { AIDocumentEditorService } from './services/ai-document-editor';
export { ChangePreviewService } from './services/change-preview';
export { DatabaseReferenceService } from './services/database-reference';
export { DocumentContextManager } from './services/document-context-manager';

// Export UI components
export type {
  AICommandInputProps,
  ChangePreviewDialogProps,
  DatabasePickerModalProps,
} from './ui';
export {
  AICommandInput,
  ChangePreviewDialog,
  DatabasePickerContainer,
  DatabasePickerModal,
} from './ui';

// Export slash commands
export {
  type DatabasePickerOpenEventDetail,
  databaseReferenceSlashItem,
  databaseReferenceSlashMenuConfig,
} from './slash-commands';

// Export extensions
export {
  DatabaseReferenceSlashMenuExtension,
  getDatabaseReferenceSlashMenuExtension,
} from './extensions';

// Export utilities
export {
  createWorkspaceDatabaseScanner,
  type DatabaseViewInfo,
  type DocWithDatabases,
  type DatabaseInfo as WorkspaceDatabaseInfo,
  WorkspaceDatabaseScanner,
} from './utils';
