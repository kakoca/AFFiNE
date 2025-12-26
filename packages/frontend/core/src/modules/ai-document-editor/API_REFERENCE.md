# AI Document Editor - API Reference

This document provides comprehensive API documentation for developers integrating with or extending the AI Document Editor module.

## Table of Contents

- [Overview](#overview)
- [Module Architecture](#module-architecture)
- [Services](#services)
  - [AIDocumentEditorService](#aidocumenteditorservice)
  - [DatabaseReferenceService](#databasereferenceservice)
  - [ChangePreviewService](#changepreviewservice)
  - [DocumentContextManager](#documentcontextmanager)
- [Utilities](#utilities)
  - [CommandParser](#commandparser)
- [Types and Interfaces](#types-and-interfaces)
- [Error Handling](#error-handling)
- [Extension Points](#extension-points)

## Overview

The AI Document Editor module provides services for AI-driven document manipulation, database creation, and cross-document database references. It follows AFFiNE's service-oriented architecture using the `@toeverything/infra` framework.

### Module Location

```
packages/frontend/core/src/modules/ai-document-editor/
```

### Module Registration

The module is registered in the workspace scope:

```typescript
import { configureAIDocumentEditorModule } from '@affine/core/modules/ai-document-editor';

// In your app initialization
configureAIDocumentEditorModule(framework);
```

## Module Architecture

### Directory Structure

```
ai-document-editor/
├── index.ts                    # Module configuration and exports
├── types.ts                    # Type definitions
├── errors.ts                   # Error classes
├── command-parser.ts           # Command parsing utility
├── services/
│   ├── ai-document-editor.ts   # Main service
│   ├── database-reference.ts   # Database reference management
│   ├── change-preview.ts       # Change preview functionality
│   └── document-context-manager.ts  # Context management
├── ui/
│   ├── ai-command-input.tsx    # Command input component
│   └── change-preview-dialog.tsx    # Preview dialog component
└── __tests__/                  # Test files
```

### Dependency Injection

Services are injected using the `@toeverything/infra` framework:

```typescript
import { Service } from '@toeverything/infra';

export class AIDocumentEditorService extends Service {
  constructor(
    private readonly docsService: DocsService,
    private readonly workspaceService: WorkspaceService
  ) {
    super();
  }
}
```

## Services

### AIDocumentEditorService

The primary service for AI-driven document operations.

#### Constructor

```typescript
constructor(
  docsService: DocsService,
  workspaceService: WorkspaceService
)
```

**Parameters:**

- `docsService`: Service for document access and manipulation
- `workspaceService`: Service for workspace-level operations

#### Methods

##### executeCommand

Execute a natural language command.

```typescript
async executeCommand(
  command: string,
  options?: CommandOptions
): Promise<CommandResult>
```

**Parameters:**

- `command`: Natural language command string
- `options`: Optional configuration
  - `preview?: boolean`: Whether to generate a preview before applying
  - `context?: DocumentContext`: Explicit context (overrides auto-detection)

**Returns:** `Promise<CommandResult>`

- `success: boolean`: Whether the command executed successfully
- `operations: DocumentOperation[]`: List of operations performed
- `affectedBlocks: string[]`: IDs of blocks that were modified
- `error?: Error`: Error if command failed
- `preview?: ChangePreview`: Preview object if preview was requested

**Example:**

```typescript
const result = await aiDocService.executeCommand('Add a task database with status and assignee columns', { preview: true });

if (result.success && result.preview) {
  // Show preview to user
  await changePreviewService.applyChanges(docId, result.preview);
}
```

##### editDocument

Edit document content based on AI instructions.

```typescript
async editDocument(
  docId: string,
  instructions: string,
  preview?: boolean
): Promise<EditResult>
```

**Parameters:**

- `docId`: Target document identifier
- `instructions`: Natural language editing instructions
- `preview`: Whether to generate a preview (default: false)

**Returns:** `Promise<EditResult>`

- `success: boolean`: Whether the edit succeeded
- `changes: DocumentOperation[]`: List of changes made
- `preview?: ChangePreview`: Preview object if requested

**Example:**

```typescript
const result = await aiDocService.editDocument('doc-123', 'Update the introduction to emphasize security', true);
```

##### addContent

Add new content to a document.

```typescript
async addContent(
  docId: string,
  content: BlockContent,
  position?: InsertToPosition
): Promise<string>
```

**Parameters:**

- `docId`: Target document identifier
- `content`: Content to add
  - `type: string`: Block type (e.g., 'affine:paragraph', 'affine:list')
  - `props: Record<string, any>`: Block properties
- `position`: Where to insert (default: end of document)
  - `'before' | 'after'`: Relative position
  - `id?: string`: Reference block ID

**Returns:** `Promise<string>` - ID of the created block

**Example:**

```typescript
const blockId = await aiDocService.addContent(
  'doc-123',
  {
    type: 'affine:paragraph',
    props: { text: 'New paragraph content' },
  },
  { position: 'after', id: 'existing-block-id' }
);
```

##### createDatabase

Create a new database block.

```typescript
async createDatabase(
  docId: string,
  config: DatabaseConfig,
  position?: InsertToPosition
): Promise<string>
```

**Parameters:**

- `docId`: Target document identifier
- `config`: Database configuration
  - `name?: string`: Database name
  - `columns: ColumnConfig[]`: Column definitions
  - `viewType: 'table' | 'kanban' | 'gallery'`: Initial view type
  - `initialRows?: RowData[]`: Initial data
- `position`: Where to insert (default: end of document)

**Returns:** `Promise<string>` - ID of the created database block

**Example:**

```typescript
const dbId = await aiDocService.createDatabase('doc-123', {
  name: 'Task Tracker',
  columns: [
    { name: 'Title', type: 'title' },
    { name: 'Status', type: 'select', data: { options: ['Todo', 'Done'] } },
    { name: 'Assignee', type: 'text' },
  ],
  viewType: 'table',
  initialRows: [{ Title: 'First task', Status: 'Todo', Assignee: 'Alice' }],
});
```

##### getActiveDocumentContext

Get context for the currently active document.

```typescript
getActiveDocumentContext(): DocumentContext | null
```

**Returns:** `DocumentContext | null`

- `docId: string`: Document identifier
- `doc: Doc`: Document instance
- `databases: DatabaseInfo[]`: Databases in the document
- `cursorPosition?: BlockPosition`: Current cursor position
- `selection?: BlockSelection`: Current selection

**Example:**

```typescript
const context = aiDocService.getActiveDocumentContext();
if (context) {
  console.log(`Active doc: ${context.docId}`);
  console.log(`Databases: ${context.databases.length}`);
}
```

### DatabaseReferenceService

Service for managing database references across documents.

#### Constructor

```typescript
constructor(docsService: DocsService)
```

#### Methods

##### createReference

Create a reference to an existing database.

```typescript
async createReference(
  targetDocId: string,
  sourceDocId: string,
  sourceDatabaseId: string,
  viewId?: string,
  position?: InsertToPosition
): Promise<string>
```

**Parameters:**

- `targetDocId`: Document where reference will be created
- `sourceDocId`: Document containing the source database
- `sourceDatabaseId`: ID of the source database block
- `viewId`: Optional specific view to display
- `position`: Where to insert the reference

**Returns:** `Promise<string>` - ID of the created reference block

**Throws:**

- `DatabaseReferenceError`: If source database doesn't exist

**Example:**

```typescript
const refId = await dbRefService.createReference(
  'target-doc-123',
  'source-doc-456',
  'database-block-789',
  'view-abc' // Optional: specific view
);
```

##### getDataSourceForReference

Get a DataSource for manipulating data through a reference.

```typescript
async getDataSourceForReference(
  referenceDocId: string,
  referenceBlockId: string
): Promise<{
  dataSource: DatabaseBlockDataSource;
  release: () => void;
}>
```

**Parameters:**

- `referenceDocId`: Document containing the reference
- `referenceBlockId`: ID of the reference block

**Returns:** Object with:

- `dataSource`: DatabaseBlockDataSource for the source database
- `release`: Function to call when done (releases document references)

**Important:** Always call `release()` when finished to prevent memory leaks.

**Example:**

```typescript
const { dataSource, release } = await dbRefService.getDataSourceForReference('doc-123', 'ref-block-456');

try {
  // Manipulate data
  dataSource.rowAdd('end');
  dataSource.cellValueChange(rowId, propertyId, 'New value');
} finally {
  release(); // Always release!
}
```

##### findReferences

Find all references to a specific database.

```typescript
async findReferences(
  sourceDocId: string,
  databaseId: string
): Promise<DatabaseReference[]>
```

**Parameters:**

- `sourceDocId`: Document containing the source database
- `databaseId`: ID of the database block

**Returns:** `Promise<DatabaseReference[]>` - Array of references

- `id: string`: Reference block ID
- `sourceId: string`: Source database ID
- `targetDocId: string`: Document containing the reference
- `viewId?: string`: Specific view being referenced
- `createdAt: Date`: When reference was created

**Example:**

```typescript
const references = await dbRefService.findReferences('source-doc-123', 'database-456');

console.log(`Found ${references.length} references`);
references.forEach(ref => {
  console.log(`Reference in doc: ${ref.targetDocId}`);
});
```

##### validateReference

Check if a database reference target exists.

```typescript
async validateReference(
  sourceDocId: string,
  databaseId: string
): Promise<boolean>
```

**Parameters:**

- `sourceDocId`: Document that should contain the database
- `databaseId`: ID of the database block

**Returns:** `Promise<boolean>` - True if database exists and is valid

**Example:**

```typescript
const isValid = await dbRefService.validateReference('doc-123', 'database-456');

if (!isValid) {
  console.error('Database reference target no longer exists');
}
```

### ChangePreviewService

Service for previewing changes before applying them.

#### Methods

##### generatePreview

Generate a preview of proposed changes.

```typescript
async generatePreview(
  docId: string,
  operations: DocumentOperation[]
): Promise<ChangePreview>
```

**Parameters:**

- `docId`: Target document identifier
- `operations`: List of operations to preview

**Returns:** `Promise<ChangePreview>`

- `id: string`: Preview identifier
- `docId: string`: Target document
- `operations: DocumentOperation[]`: Operations to apply
- `additions: PreviewBlock[]`: Blocks to be added
- `modifications: PreviewBlock[]`: Blocks to be modified
- `deletions: PreviewBlock[]`: Blocks to be deleted
- `createdAt: Date`: When preview was created

**Example:**

```typescript
const preview = await changePreviewService.generatePreview('doc-123', operations);

// Show preview to user
displayPreview(preview);
```

##### applyChanges

Apply approved changes to the document.

```typescript
async applyChanges(
  docId: string,
  preview: ChangePreview
): Promise<void>
```

**Parameters:**

- `docId`: Target document identifier
- `preview`: Preview object to apply

**Throws:**

- `DocumentEditError`: If changes cannot be applied

**Example:**

```typescript
// User approved the preview
await changePreviewService.applyChanges('doc-123', preview);
```

##### discardPreview

Discard a preview without applying changes.

```typescript
async discardPreview(previewId: string): Promise<void>
```

**Parameters:**

- `previewId`: Preview identifier to discard

**Example:**

```typescript
// User rejected the preview
await changePreviewService.discardPreview(preview.id);
```

### DocumentContextManager

Service for managing document context for AI operations.

#### Methods

##### getActiveDocument

Get the currently active document.

```typescript
getActiveDocument(): Doc | null
```

**Returns:** `Doc | null` - Active document or null if none

##### enrichContext

Enrich context with database information.

```typescript
async enrichContext(doc: Doc): Promise<DocumentContext>
```

**Parameters:**

- `doc`: Document to enrich

**Returns:** `Promise<DocumentContext>` - Enriched context with database info

##### observeActiveDocument

Observe changes to the active document.

```typescript
observeActiveDocument(): Observable<Doc | null>
```

**Returns:** `Observable<Doc | null>` - Stream of active document changes

**Example:**

```typescript
contextManager.observeActiveDocument().subscribe(doc => {
  if (doc) {
    console.log(`Active document changed: ${doc.id}`);
  }
});
```

## Utilities

### CommandParser

Utility for parsing natural language commands.

#### Methods

##### parse

Parse a command string into a structured command object.

```typescript
static parse(
  command: string,
  context: DocumentContext
): ParsedCommand
```

**Parameters:**

- `command`: Natural language command
- `context`: Current document context

**Returns:** `ParsedCommand`

- `type: CommandType`: Command type ('edit' | 'add' | 'create' | 'reference')
- `targetDocId: string`: Target document ID
- `action: string`: Specific action to perform
- `parameters: Record<string, any>`: Extracted parameters

**Example:**

```typescript
const parsed = CommandParser.parse('Add a task database with status column', context);

console.log(parsed.type); // 'create'
console.log(parsed.action); // 'database'
```

##### getCommandType

Determine the command type.

```typescript
static getCommandType(command: string): CommandType
```

**Parameters:**

- `command`: Command string

**Returns:** `CommandType` - 'edit' | 'add' | 'create' | 'reference'

##### extractTargetDocument

Extract target document from command or context.

```typescript
static extractTargetDocument(
  command: string,
  context: DocumentContext
): string | null
```

**Parameters:**

- `command`: Command string
- `context`: Current context

**Returns:** `string | null` - Document ID or null if not found

## Types and Interfaces

### BlockContent

```typescript
interface BlockContent {
  type: string; // Block flavour (e.g., 'affine:paragraph')
  props: Record<string, any>; // Block properties
}
```

### DatabaseConfig

```typescript
interface DatabaseConfig {
  name?: string;
  columns: ColumnConfig[];
  viewType: 'table' | 'kanban' | 'gallery';
  initialRows?: RowData[];
}

interface ColumnConfig {
  name: string;
  type: string; // 'title' | 'text' | 'number' | 'select' | 'date' | etc.
  data?: Record<string, any>; // Type-specific configuration
}

interface RowData {
  [columnName: string]: any;
}
```

### DocumentOperation

```typescript
type DocumentOperation = EditOperation | InsertOperation | DeleteOperation | DatabaseOperation;

interface EditOperation {
  type: 'edit';
  blockId: string;
  changes: Record<string, any>;
}

interface InsertOperation {
  type: 'insert';
  blockType: string;
  content: any;
  position: InsertToPosition;
  parentId: string;
}

interface DeleteOperation {
  type: 'delete';
  blockId: string;
}

interface DatabaseOperation {
  type: 'database';
  action: 'create' | 'addRow' | 'updateCell' | 'addView' | 'updateView';
  databaseId?: string;
  data: any;
}
```

### InsertToPosition

```typescript
type InsertToPosition = 'before' | 'after' | { position: 'before' | 'after'; id: string };
```

### DocumentContext

```typescript
interface DocumentContext {
  docId: string;
  doc: Doc;
  databases: DatabaseInfo[];
  cursorPosition?: BlockPosition;
  selection?: BlockSelection;
}

interface DatabaseInfo {
  blockId: string;
  name: string;
  views: ViewInfo[];
}

interface ViewInfo {
  id: string;
  name: string;
  type: 'table' | 'kanban' | 'gallery';
}
```

## Error Handling

### Error Classes

#### DocumentEditError

```typescript
class DocumentEditError extends Error {
  constructor(
    message: string,
    public readonly docId: string,
    public readonly operation: DocumentOperation,
    public readonly cause?: Error
  )
}
```

**Usage:**

```typescript
try {
  await aiDocService.editDocument(docId, instructions);
} catch (error) {
  if (error instanceof DocumentEditError) {
    console.error(`Failed to edit doc ${error.docId}`);
    console.error(`Operation:`, error.operation);
  }
}
```

#### DatabaseReferenceError

```typescript
class DatabaseReferenceError extends Error {
  constructor(
    message: string,
    public readonly sourceId: string,
    public readonly targetDocId: string,
    public readonly cause?: Error
  )
}
```

**Usage:**

```typescript
try {
  await dbRefService.createReference(targetDocId, sourceDocId, dbId);
} catch (error) {
  if (error instanceof DatabaseReferenceError) {
    console.error(`Reference failed: ${error.message}`);
    console.error(`Source: ${error.sourceId}`);
  }
}
```

#### CommandParseError

```typescript
class CommandParseError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly cause?: Error
  )
}
```

### Error Handling Patterns

#### Transaction Rollback

All document operations use transactions that automatically rollback on failure:

```typescript
const { doc, release } = docsService.open(docId);
try {
  await doc.waitForSyncReady();

  doc.blockSuiteDoc.transact(() => {
    // All operations here are atomic
    doc.blockSuiteDoc.addBlock(...);
    doc.blockSuiteDoc.updateBlock(...);
  });
} catch (error) {
  // Transaction automatically rolled back
  console.error('Operation failed, changes rolled back');
} finally {
  release(); // Always release
}
```

#### Retry Logic

Network operations include automatic retry with exponential backoff:

```typescript
import { retryWithBackoff } from './retry-logic';

const result = await retryWithBackoff(() => copilotClient.someOperation(), {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
});
```

## Extension Points

### Custom Command Types

Extend the command parser to recognize new command types:

```typescript
// In your extension
import { CommandParser } from '@affine/core/modules/ai-document-editor';

class CustomCommandParser extends CommandParser {
  static getCommandType(command: string): CommandType {
    if (command.includes('my-custom-action')) {
      return 'custom' as CommandType;
    }
    return super.getCommandType(command);
  }
}
```

### Custom Block Types

Add support for custom block types in content addition:

```typescript
await aiDocService.addContent(docId, {
  type: 'my-custom:block',
  props: {
    customProp: 'value',
  },
});
```

### Custom Database Operations

Extend database operations with custom logic:

```typescript
class ExtendedDatabaseReferenceService extends DatabaseReferenceService {
  async createReferenceWithCustomLogic(targetDocId: string, sourceDocId: string, sourceDatabaseId: string): Promise<string> {
    // Custom pre-processing
    await this.validateCustomRules(sourceDocId, sourceDatabaseId);

    // Call parent implementation
    const refId = await super.createReference(targetDocId, sourceDocId, sourceDatabaseId);

    // Custom post-processing
    await this.notifyCustomListeners(refId);

    return refId;
  }
}
```

### Custom Preview Rendering

Customize how change previews are displayed:

```typescript
import { ChangePreview } from '@affine/core/modules/ai-document-editor';

function renderCustomPreview(preview: ChangePreview) {
  return (
    <CustomPreviewComponent
      additions={preview.additions}
      modifications={preview.modifications}
      deletions={preview.deletions}
      onApprove={() => applyChanges(preview)}
      onReject={() => discardPreview(preview.id)}
    />
  );
}
```

### Event Hooks

Subscribe to document editing events:

```typescript
// In your extension
import { AIDocumentEditorService } from '@affine/core/modules/ai-document-editor';

class MyExtension {
  constructor(private aiDocService: AIDocumentEditorService) {
    // Hook into operations
    this.setupHooks();
  }

  private setupHooks() {
    // Override methods to add hooks
    const originalExecuteCommand = this.aiDocService.executeCommand.bind(this.aiDocService);

    this.aiDocService.executeCommand = async (command, options) => {
      // Pre-execution hook
      await this.onBeforeCommand(command);

      // Execute
      const result = await originalExecuteCommand(command, options);

      // Post-execution hook
      await this.onAfterCommand(command, result);

      return result;
    };
  }

  private async onBeforeCommand(command: string) {
    console.log(`Executing command: ${command}`);
  }

  private async onAfterCommand(command: string, result: CommandResult) {
    console.log(`Command completed: ${result.success}`);
  }
}
```

## Best Practices

### Always Release Documents

```typescript
// ✅ Good
const { doc, release } = docsService.open(docId);
try {
  // Use doc
} finally {
  release(); // Always in finally block
}

// ❌ Bad
const { doc, release } = docsService.open(docId);
// Use doc
release(); // Might not be called if error occurs
```

### Use Transactions for Multiple Operations

```typescript
// ✅ Good
doc.blockSuiteDoc.transact(() => {
  doc.blockSuiteDoc.addBlock(...);
  doc.blockSuiteDoc.updateBlock(...);
  doc.blockSuiteDoc.deleteBlock(...);
});

// ❌ Bad
doc.blockSuiteDoc.addBlock(...);
doc.blockSuiteDoc.updateBlock(...);
doc.blockSuiteDoc.deleteBlock(...);
```

### Handle Errors Gracefully

```typescript
// ✅ Good
try {
  await aiDocService.executeCommand(command);
} catch (error) {
  if (error instanceof DocumentEditError) {
    showUserFriendlyError(error);
  } else if (error instanceof DatabaseReferenceError) {
    suggestAlternatives(error);
  } else {
    logUnexpectedError(error);
  }
}

// ❌ Bad
await aiDocService.executeCommand(command); // Unhandled errors
```

### Validate Before Operations

```typescript
// ✅ Good
const isValid = await dbRefService.validateReference(sourceDocId, dbId);
if (!isValid) {
  throw new Error('Invalid reference target');
}
await dbRefService.createReference(targetDocId, sourceDocId, dbId);

// ❌ Bad
await dbRefService.createReference(targetDocId, sourceDocId, dbId);
// Might fail if source doesn't exist
```

## Related Documentation

- [Command Reference Guide](./COMMAND_REFERENCE.md) - User-facing command syntax
- [Integration Guide](./INTEGRATION_GUIDE.md) - Integration examples
- [Design Document](./design.md) - Architecture and design decisions
- [Requirements](./requirements.md) - Feature requirements and acceptance criteria
