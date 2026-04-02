# Design Document: AI Document Editor

## Overview

This design document outlines the architecture for enabling AFFiNE's AI Assistant to directly edit documents through chat commands and to create, add, and reference database blocks across pages. The system extends the existing CopilotClient and DatabaseBlockDataSource infrastructure to provide seamless AI-driven document manipulation capabilities.

The design follows a service-oriented architecture pattern consistent with AFFiNE's existing codebase, leveraging the @toeverything/infra framework for dependency injection and state management. All new components integrate with existing services (DocsService, CopilotClient, DatabaseBlockDataSource) to maximize code reuse and maintain architectural consistency.

## Key Implementation Patterns (AFFiNE-Specific)

### Accessing CopilotClient

CopilotClient is NOT injected via dependency injection. It's accessed through the AIProvider singleton or created with GraphQL dependencies:

```typescript
// Pattern 1: Via AIProvider (for AI actions)
import { AIProvider } from '@affine/core/blocksuite/ai/provider/ai-provider';
const session = AIProvider.session;
const context = AIProvider.context;

// Pattern 2: Direct instantiation (for service layer)
import { CopilotClient } from '@affine/core/blocksuite/ai/provider/copilot-client';
const copilotClient = new CopilotClient(gqlFn, fetcherFn, eventSourceFn);
```

### Accessing DatabaseBlockDataSource

DatabaseBlockDataSource is NOT a service - it's instantiated with a DatabaseBlockModel:

```typescript
import { DatabaseBlockDataSource } from '@blocksuite/affine/blocks/database';
import type { DatabaseBlockModel } from '@blocksuite/affine/model';

// Get the database model from a document
const dbBlock = doc.blockSuiteDoc.getBlock(databaseBlockId);
const dbModel = dbBlock.model as DatabaseBlockModel;

// Create DataSource instance
const dataSource = new DatabaseBlockDataSource(dbModel);

// Now you can use all DataSource methods:
dataSource.rowAdd('end');
dataSource.cellValueChange(rowId, propertyId, value);
dataSource.propertyAdd(position, { type, name });
dataSource.viewDataAdd(viewData);
```

### Accessing Documents

Documents are accessed via DocsService with a release pattern:

```typescript
// Open a document (increments reference count)
const { doc, release } = docsService.open(docId);

// Wait for sync if needed
await doc.waitForSyncReady();

// Access BlockSuite document
const bsDoc = doc.blockSuiteDoc;

// Add blocks
bsDoc.addBlock('affine:paragraph', { text }, parentId);
bsDoc.addBlock('affine:database', { columns: [], views: [] }, parentId);

// IMPORTANT: Always release when done
release();
```

### Module Structure

New modules follow this structure in `packages/frontend/core/src/modules/`:

```
ai-document-editor/
├── index.ts              # Module configuration and exports
├── entities/             # Entity classes (state containers)
├── services/             # Service classes (business logic)
├── stores/               # Store classes (data access)
└── types.ts              # Type definitions
```

Module registration pattern:

```typescript
// index.ts
import type { Framework } from '@toeverything/infra';
import { WorkspaceScope } from '../workspace';

export function configureAIDocumentEditorModule(framework: Framework) {
  framework.scope(WorkspaceScope).service(AIDocumentEditorService, [DocsService, WorkspaceService]).service(DatabaseReferenceService, [DocsService]).service(ChangePreviewService);
}
```

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Chat Panel  │  │ Editor View  │  │ Preview Dialog   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼─────────────┐
│         │      Service Layer (Frontend)       │             │
│  ┌──────▼──────────────────▼──────────────────▼─────────┐   │
│  │         AIDocumentEditorService                       │   │
│  │  - parseCommand()                                     │   │
│  │  - editDocument()                                     │   │
│  │  - addContent()                                       │   │
│  │  - createDatabase()                                   │   │
│  │  - addDatabaseReference()                             │   │
│  └───────┬───────────────────────────────────────────────┘   │
│          │                                                    │
│  ┌───────▼────────────┐  ┌──────────────────┐               │
│  │ DatabaseReference  │  │ ChangePreview    │               │
│  │ Service            │  │ Service          │               │
│  └───────┬────────────┘  └──────────────────┘               │
└──────────┼─────────────────────────────────────────────────┘
           │
┌──────────┼─────────────────────────────────────────────────┐
│          │      Existing Infrastructure                     │
│  ┌───────▼────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ CopilotClient  │  │ DocsService  │  │ DatabaseBlock   │ │
│  │                │  │              │  │ DataSource      │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└──────────────────────────────────────────────────────────────┘
           │
┌──────────┼─────────────────────────────────────────────────┐
│          │      Backend (GraphQL API)                       │
│  ┌───────▼────────────────────────────────────────────┐    │
│  │  AI Backend (Copilot)                              │    │
│  │  - Command parsing                                 │    │
│  │  - Document update generation                      │    │
│  │  - Context-aware responses                         │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **User Command Flow**:
   - User sends command via Chat Panel
   - AIDocumentEditorService receives command
   - Service determines active document context
   - Command is sent to AI Backend via CopilotClient
   - AI Backend generates document operations
   - Operations are previewed (if enabled)
   - User approves/rejects changes
   - Changes are applied via DocsService/DatabaseBlockDataSource

2. **Database Reference Flow**:
   - User requests database reference
   - DatabaseReferenceService locates source database
   - Reference block is created in target document
   - Reference maintains live link to source
   - Changes propagate bidirectionally

## Components and Interfaces

### AIDocumentEditorService

Primary service for handling AI-driven document editing operations.

```typescript
import { Service } from '@toeverything/infra';
import { DatabaseBlockDataSource } from '@blocksuite/affine/blocks/database';
import type { DatabaseBlockModel } from '@blocksuite/affine/model';

export class AIDocumentEditorService extends Service {
  constructor(
    private readonly docsService: DocsService,
    private readonly workspaceService: WorkspaceService
  ) {
    super();
  }

  // CopilotClient is accessed when needed, not injected
  private getCopilotClient(): CopilotClient {
    // Access via GraphQL service or create instance
    const gql = this.workspaceService.workspace.graphql;
    return new CopilotClient(gql, fetch, EventSource);
  }

  /**
   * Parse a natural language command and execute the appropriate action
   */
  async executeCommand(command: string, options?: CommandOptions): Promise<CommandResult>;

  /**
   * Edit document content based on AI instructions
   */
  async editDocument(docId: string, instructions: string, preview?: boolean): Promise<EditResult>;

  /**
   * Add new content to a document at specified position
   */
  async addContent(docId: string, content: BlockContent, position?: InsertToPosition): Promise<string> {
    const { doc, release } = this.docsService.open(docId);
    try {
      await doc.waitForSyncReady();
      const bsDoc = doc.blockSuiteDoc;

      // Find parent block (note block)
      const [noteBlock] = bsDoc.getBlocksByFlavour('affine:note');
      if (!noteBlock) throw new Error('No note block found');

      // Add block
      const blockId = bsDoc.addBlock(content.type as any, content.props, noteBlock.id, position ? insertPositionToIndex(position, noteBlock.children) : undefined);

      return blockId;
    } finally {
      release();
    }
  }

  /**
   * Create a new database block
   */
  async createDatabase(docId: string, config: DatabaseConfig, position?: InsertToPosition): Promise<string> {
    const { doc, release } = this.docsService.open(docId);
    try {
      await doc.waitForSyncReady();
      const bsDoc = doc.blockSuiteDoc;

      const [noteBlock] = bsDoc.getBlocksByFlavour('affine:note');
      if (!noteBlock) throw new Error('No note block found');

      // Create database block
      const dbId = bsDoc.addBlock('affine:database', { columns: [], views: [] }, noteBlock.id, position ? insertPositionToIndex(position, noteBlock.children) : undefined);

      // Get the model and create DataSource
      const dbBlock = bsDoc.getBlock(dbId);
      const dbModel = dbBlock?.model as DatabaseBlockModel;
      const dataSource = new DatabaseBlockDataSource(dbModel);

      // Configure columns
      for (const col of config.columns) {
        dataSource.propertyAdd('end', { type: col.type, name: col.name });
      }

      // Add initial view
      dataSource.viewManager.viewAdd(config.viewType);

      // Add initial rows if specified
      if (config.initialRows) {
        for (const row of config.initialRows) {
          dataSource.rowAdd('end');
        }
      }

      return dbId;
    } finally {
      release();
    }
  }

  /**
   * Get the currently active document context
   */
  getActiveDocumentContext(): DocumentContext | null;
}
```

### DatabaseReferenceService

Service for managing database references across documents. This service creates a NEW block type that renders the source database inline with full interactivity.

```typescript
import { Service } from '@toeverything/infra';
import { DatabaseBlockDataSource } from '@blocksuite/affine/blocks/database';
import type { DatabaseBlockModel } from '@blocksuite/affine/model';

export class DatabaseReferenceService extends Service {
  constructor(private readonly docsService: DocsService) {
    super();
  }

  /**
   * Create a reference to an existing database in another document.
   * This creates a new 'affine:database-reference' block that renders
   * the source database with full interactivity.
   */
  async createReference(targetDocId: string, sourceDocId: string, sourceDatabaseId: string, viewId?: string, position?: InsertToPosition): Promise<string> {
    // Validate source database exists
    const sourceRef = this.docsService.open(sourceDocId);
    try {
      await sourceRef.doc.waitForSyncReady();
      const sourceDb = sourceRef.doc.blockSuiteDoc.getBlock(sourceDatabaseId);
      if (!sourceDb || sourceDb.flavour !== 'affine:database') {
        throw new DatabaseReferenceError('Source database not found', sourceDatabaseId, targetDocId);
      }
    } finally {
      sourceRef.release();
    }

    // Create reference block in target document
    const targetRef = this.docsService.open(targetDocId);
    try {
      await targetRef.doc.waitForSyncReady();
      const bsDoc = targetRef.doc.blockSuiteDoc;

      const [noteBlock] = bsDoc.getBlocksByFlavour('affine:note');
      if (!noteBlock) throw new Error('No note block found');

      // Create the reference block (new block type)
      const refBlockId = bsDoc.addBlock(
        'affine:database-reference' as any,
        {
          sourceDocId,
          sourceDatabaseId,
          viewId, // Optional: specific view to display
        },
        noteBlock.id,
        position ? insertPositionToIndex(position, noteBlock.children) : undefined
      );

      return refBlockId;
    } finally {
      targetRef.release();
    }
  }

  /**
   * Get the DataSource for a database reference.
   * This returns a DataSource connected to the SOURCE database,
   * allowing full read/write operations.
   */
  async getDataSourceForReference(referenceDocId: string, referenceBlockId: string): Promise<{ dataSource: DatabaseBlockDataSource; release: () => void }> {
    const refDoc = this.docsService.open(referenceDocId);
    await refDoc.doc.waitForSyncReady();

    const refBlock = refDoc.doc.blockSuiteDoc.getBlock(referenceBlockId);
    if (!refBlock) {
      refDoc.release();
      throw new Error('Reference block not found');
    }

    const { sourceDocId, sourceDatabaseId } = refBlock.model.props as any;

    // Open source document and get database
    const sourceDoc = this.docsService.open(sourceDocId);
    await sourceDoc.doc.waitForSyncReady();

    const dbBlock = sourceDoc.doc.blockSuiteDoc.getBlock(sourceDatabaseId);
    if (!dbBlock) {
      refDoc.release();
      sourceDoc.release();
      throw new DatabaseReferenceError('Source database no longer exists', sourceDatabaseId, referenceDocId);
    }

    const dbModel = dbBlock.model as DatabaseBlockModel;
    const dataSource = new DatabaseBlockDataSource(dbModel);

    return {
      dataSource,
      release: () => {
        refDoc.release();
        sourceDoc.release();
      },
    };
  }

  /**
   * Find all references to a given database
   */
  async findReferences(sourceDocId: string, databaseId: string): Promise<DatabaseReference[]>;

  /**
   * Validate that a database reference target exists
   */
  async validateReference(sourceDocId: string, databaseId: string): Promise<boolean> {
    try {
      const docRef = this.docsService.open(sourceDocId);
      await docRef.doc.waitForSyncReady();
      const block = docRef.doc.blockSuiteDoc.getBlock(databaseId);
      docRef.release();
      return block?.flavour === 'affine:database';
    } catch {
      return false;
    }
  }
}
```

### ChangePreviewService

Service for previewing AI-generated changes before applying them.

```typescript
export class ChangePreviewService extends Service {
  /**
   * Generate a preview of proposed document changes
   */
  async generatePreview(docId: string, operations: DocumentOperation[]): Promise<ChangePreview>;

  /**
   * Apply approved changes to the document
   */
  async applyChanges(docId: string, preview: ChangePreview): Promise<void>;

  /**
   * Discard a preview without applying changes
   */
  async discardPreview(previewId: string): Promise<void>;
}
```

### CommandParser

Utility for parsing natural language commands into structured operations.

```typescript
export class CommandParser {
  /**
   * Parse a command string into a structured command object
   */
  static parse(command: string, context: DocumentContext): ParsedCommand;

  /**
   * Determine the command type (edit, add, create, reference)
   */
  static getCommandType(command: string): CommandType;

  /**
   * Extract target document from command or context
   */
  static extractTargetDocument(command: string, context: DocumentContext): string | null;
}
```

## Data Models

### CommandResult

```typescript
interface CommandResult {
  success: boolean;
  operations: DocumentOperation[];
  affectedBlocks: string[];
  error?: Error;
  preview?: ChangePreview;
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

### DatabaseReference

```typescript
interface DatabaseReference {
  id: string; // reference block ID
  sourceId: string; // source database block ID
  targetDocId: string; // document containing the reference
  viewId?: string; // specific view to display
  createdAt: Date;
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
  type: string; // matches existing property types
  data?: Record<string, any>;
}
```

### ChangePreview

```typescript
interface ChangePreview {
  id: string;
  docId: string;
  operations: DocumentOperation[];
  additions: PreviewBlock[];
  modifications: PreviewBlock[];
  deletions: PreviewBlock[];
  createdAt: Date;
}

interface PreviewBlock {
  blockId: string;
  before?: any;
  after?: any;
}
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
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Command parsing identifies target document

_For any_ chat command and document context, when the command is parsed, the system should correctly identify the target document from either explicit references or the active context.
**Validates: Requirements 1.1, 6.1, 6.3**

### Property 2: Edit operations preserve untargeted content

_For any_ document and edit operation, when the edit is applied, all content not explicitly targeted by the operation should remain unchanged.
**Validates: Requirements 1.3**

### Property 3: Multi-session synchronization propagates edits

_For any_ document with multiple active sessions, when an AI-generated edit is applied, the edit should propagate to all active sessions viewing that document.
**Validates: Requirements 1.5**

### Property 4: Content insertion respects specified position

_For any_ document, content, and insertion position, when content is added at the specified position, the content should appear at exactly that position in the document structure.
**Validates: Requirements 2.1**

### Property 5: All block types can be inserted

_For any_ valid block type (paragraph, heading, list, database, etc.), the system should successfully create and insert that block type into a document.
**Validates: Requirements 2.3**

### Property 6: Block hierarchy is maintained after insertion

_For any_ document with nested block structure, when new content is added, the existing parent-child relationships and nesting levels should remain valid.
**Validates: Requirements 2.4**

### Property 7: Block insertion returns valid identifier

_For any_ block insertion operation, when the block is successfully added, the system should return a valid, non-null block identifier that can be used for subsequent operations.
**Validates: Requirements 2.5**

### Property 8: Database creation matches specification

_For any_ database configuration specification, when a database is created, the resulting database should have columns, views, and initial data matching the specification.
**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 9: Database creation returns valid identifier

_For any_ database creation operation, when the database is successfully created, the system should return a valid database block identifier.
**Validates: Requirements 3.5**

### Property 10: Database reference points to source

_For any_ database reference creation request, when the reference is created, it should contain a valid pointer to the source database block.
**Validates: Requirements 4.1**

### Property 11: Reference modifications update source and all references

_For any_ database with multiple references, when data is modified through any reference, the source database and all other references should reflect the same modification.
**Validates: Requirements 4.3**

### Property 12: All view types work through references

_For any_ database view type (table, kanban, gallery), when a reference is created for that view type, the reference should correctly display data in that view format.
**Validates: Requirements 4.4**

### Property 13: References remain valid after source moves

_For any_ database reference, when the source database is moved to a different document, the reference should continue to point to and display the source database correctly.
**Validates: Requirements 4.5**

### Property 14: View-specific references display only specified view

_For any_ database with multiple views, when a reference is created for a specific view, the reference should display only that view and not other views from the source database.
**Validates: Requirements 5.2**

### Property 15: View references preserve configuration

_For any_ database view with filters and sorting, when a reference to that view is created, the reference should preserve and apply the same filters and sorting configuration.
**Validates: Requirements 5.3**

### Property 16: View reference edits update source

_For any_ view-specific database reference, when data is edited through the reference, the changes should be applied to the source database.
**Validates: Requirements 5.4**

### Property 17: Source view changes propagate to references

_For any_ database view with references, when the source view's configuration (filters, sorting) is changed, all references to that view should reflect the updated configuration.
**Validates: Requirements 5.5**

### Property 18: Active document context includes databases

_For any_ active document containing database blocks, when the document context is retrieved, the context should include information about all databases in that document.
**Validates: Requirements 6.2**

### Property 19: Multiple open documents use focused editor

_For any_ workspace state with multiple open documents, when a command is executed without explicit document specification, the system should use the currently focused editor's document as the target.
**Validates: Requirements 6.4**

### Property 20: Preview rejection leaves document unchanged

_For any_ document and proposed changes, when the user rejects the preview, the document should remain in exactly the same state as before the preview was generated.
**Validates: Requirements 7.4**

### Property 21: Failed operations roll back completely

_For any_ document edit operation that fails, the system should roll back any partial changes, leaving the document in its original state before the operation was attempted.
**Validates: Requirements 8.1**

### Property 22: Database row insertion adds rows

_For any_ database and row data, when a request to add rows is processed, the database should contain the new rows with the specified data.
**Validates: Requirements 10.1**

### Property 23: Cell updates modify specified cells

_For any_ database cell update request, when the update is processed, the specified cells should contain the new values.
**Validates: Requirements 10.2**

### Property 24: View configuration applies filters and sorting

_For any_ database view and configuration request (filters, sorting), when the configuration is applied, the view should display data according to the specified filters and sorting rules.
**Validates: Requirements 10.3**

### Property 25: New view creation adds view with settings

_For any_ database and view specification, when a new view is created, the database should contain the new view with the specified settings (type, filters, sorting, columns).
**Validates: Requirements 10.4**

## Error Handling

### Error Types

The system extends existing AFFiNE error types:

```typescript
export class DocumentEditError extends Error {
  constructor(
    message: string,
    public readonly docId: string,
    public readonly operation: DocumentOperation,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'DocumentEditError';
  }
}

export class DatabaseReferenceError extends Error {
  constructor(
    message: string,
    public readonly sourceId: string,
    public readonly targetDocId: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'DatabaseReferenceError';
  }
}

export class CommandParseError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CommandParseError';
  }
}
```

### Error Handling Strategy

1. **Transaction Rollback**: All document operations are wrapped in transactions. If any operation fails, the entire transaction is rolled back to maintain consistency.

2. **Graceful Degradation**: When non-critical operations fail (e.g., preview generation), the system continues with reduced functionality rather than blocking the user.

3. **User Feedback**: All errors are translated into user-friendly messages with actionable suggestions.

4. **Retry Logic**: Network-related errors trigger automatic retry with exponential backoff.

5. **Error Propagation**: Errors are properly propagated through the service layer, maintaining the error context for debugging.

### Error Scenarios

| Scenario                            | Error Type             | Handling Strategy                       |
| ----------------------------------- | ---------------------- | --------------------------------------- |
| Invalid document ID                 | DocumentEditError      | Prompt user to select valid document    |
| Database reference target not found | DatabaseReferenceError | Suggest available databases             |
| Permission denied                   | UnauthorizedError      | Show permission requirements            |
| Network timeout                     | GeneralNetworkError    | Retry with backoff, then notify user    |
| Invalid command syntax              | CommandParseError      | Show command examples and syntax help   |
| Concurrent edit conflict            | DocumentEditError      | Merge changes or prompt user to resolve |

## Testing Strategy

### Unit Testing

Unit tests will cover individual service methods and utility functions:

- **CommandParser**: Test parsing of various command formats
- **AIDocumentEditorService**: Test each method in isolation with mocked dependencies
- **DatabaseReferenceService**: Test reference creation, validation, and synchronization
- **ChangePreviewService**: Test preview generation and application

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check** (JavaScript property testing library):

- Each correctness property listed above will be implemented as a property-based test
- Tests will run a minimum of 100 iterations with randomly generated inputs
- Each test will be tagged with a comment referencing the design document property
- Tag format: `// Feature: ai-document-editor, Property N: [property text]`

Example property test structure:

```typescript
import fc from 'fast-check';

describe('AI Document Editor Properties', () => {
  it('Property 2: Edit operations preserve untargeted content', () => {
    // Feature: ai-document-editor, Property 2: Edit operations preserve untargeted content
    fc.assert(
      fc.property(
        fc.record({
          doc: arbitraryDocument(),
          edit: arbitraryEditOperation(),
        }),
        ({ doc, edit }) => {
          const originalContent = getUntargetedContent(doc, edit);
          applyEdit(doc, edit);
          const newContent = getUntargetedContent(doc, edit);
          expect(newContent).toEqual(originalContent);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

Integration tests will verify end-to-end workflows:

- Complete command execution flow from chat to document update
- Database reference creation and synchronization across documents
- Multi-user scenarios with concurrent edits
- Preview approval/rejection workflows

### Edge Case Testing

Specific edge cases identified in requirements:

- Empty document handling
- No active document scenario
- Invalid database reference targets
- Permission-denied scenarios
- Network interruption during operations

## Implementation Notes

### Reusing Existing Infrastructure

The implementation maximizes reuse of existing AFFiNE components:

1. **CopilotClient**: Accessed via AIProvider or instantiated with GraphQL dependencies

   ```typescript
   // Via AIProvider for AI actions
   const session = AIProvider.session;

   // Or direct instantiation
   const client = new CopilotClient(gql, fetcher, eventSource);
   client.applyDocUpdates(workspaceId, docId, op, updates);
   ```

2. **DocsService**: Document access uses the open/release pattern

   ```typescript
   const { doc, release } = docsService.open(docId);
   try {
     await doc.waitForSyncReady();
     // Use doc.blockSuiteDoc for operations
   } finally {
     release();
   }
   ```

3. **DatabaseBlockDataSource**: Instantiated with DatabaseBlockModel

   ```typescript
   const dbBlock = doc.blockSuiteDoc.getBlock(databaseId);
   const dbModel = dbBlock.model as DatabaseBlockModel;
   const dataSource = new DatabaseBlockDataSource(dbModel);

   // Use DataSource methods
   dataSource.rowAdd('end');
   dataSource.cellValueChange(rowId, propertyId, value);
   dataSource.propertyAdd(position, { type, name });
   dataSource.viewDataAdd(viewData);
   dataSource.viewDataUpdate(viewId, updater);
   ```

4. **Block Creation**: Uses BlockSuite's addBlock method

   ```typescript
   const blockId = doc.blockSuiteDoc.addBlock('affine:paragraph', { text: new Text([{ insert: 'Hello' }]) }, parentId, index);
   ```

5. **Y.js Synchronization**: Automatic via BlockSuite - all changes to doc.blockSuiteDoc are synced

6. **Service Architecture**: Follows @toeverything/infra patterns

   ```typescript
   export class MyService extends Service {
     constructor(
       private readonly docsService: DocsService,
       private readonly workspaceService: WorkspaceService
     ) {
       super();
     }
   }
   ```

7. **GraphQL**: Uses existing mutations/queries from @affine/graphql
   ```typescript
   import { applyDocUpdatesQuery } from '@affine/graphql';
   ```

### New Block Type Registration

The `affine:database-reference` block must be registered in the BlockSuite schema:

```typescript
// In blocksuite/affine/model/src/blocks/index.ts
export * from './database-reference/database-reference-model.js';

// In blocksuite/affine/blocks/database-reference/index.ts
export * from './database-reference-block.js';

// Register in schema
import { DatabaseReferenceBlockSchema } from '@blocksuite/affine-model';
import { DatabaseReferenceBlock } from '@blocksuite/affine-blocks';

// Add to block specs
BlockViewExtension('affine:database-reference', literal`affine-database-reference`);
```

### Database Reference Implementation

Database references are implemented as a **NEW block type** (`affine:database-reference`) that renders the source database inline with full interactivity. This is NOT a link - it's a complete, editable view of the database.

#### Block Schema Definition

```typescript
// New file: blocksuite/affine/model/src/blocks/database-reference/database-reference-model.ts
import { defineBlockSchema } from '@blocksuite/store';

export interface DatabaseReferenceBlockProps {
  sourceDocId: string; // Document containing the source database
  sourceDatabaseId: string; // Block ID of the source database
  viewId?: string; // Optional: specific view to display
}

export const DatabaseReferenceBlockSchema = defineBlockSchema({
  flavour: 'affine:database-reference',
  props: (): DatabaseReferenceBlockProps => ({
    sourceDocId: '',
    sourceDatabaseId: '',
    viewId: undefined,
  }),
  metadata: {
    version: 1,
    role: 'content',
    parent: ['affine:note'],
    children: [], // No children - renders source database
  },
});
```

#### Block Component

```typescript
// New file: blocksuite/affine/blocks/database-reference/database-reference-block.ts
import { DatabaseBlockDataSource } from '@blocksuite/affine/blocks/database';
import type { DatabaseBlockModel } from '@blocksuite/affine/model';

@customElement('affine-database-reference')
export class DatabaseReferenceBlock extends BlockComponent {
  private dataSource: DatabaseBlockDataSource | null = null;
  private sourceDocRef: { release: () => void } | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this.loadSourceDatabase();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.sourceDocRef?.release();
  }

  private async loadSourceDatabase() {
    const { sourceDocId, sourceDatabaseId, viewId } = this.model.props;

    // Open source document
    const docsService = this.std.get(DocsService);
    this.sourceDocRef = docsService.open(sourceDocId);
    await this.sourceDocRef.doc.waitForSyncReady();

    // Get database model
    const dbBlock = this.sourceDocRef.doc.blockSuiteDoc.getBlock(sourceDatabaseId);
    if (!dbBlock || dbBlock.flavour !== 'affine:database') {
      this.renderError('Source database not found');
      return;
    }

    const dbModel = dbBlock.model as DatabaseBlockModel;
    this.dataSource = new DatabaseBlockDataSource(dbModel);

    // If viewId specified, filter to that view
    if (viewId) {
      this.dataSource.viewManager.setCurrentView(viewId);
    }

    this.requestUpdate();
  }

  override render() {
    if (!this.dataSource) {
      return html`<div class="loading">Loading database...</div>`;
    }

    // Render the SAME database component used for regular databases
    // All edits go directly to the source database via DataSource
    return html` <affine-database-table .dataSource=${this.dataSource} .view=${this.dataSource.viewManager.currentView$.value}></affine-database-table> `;
  }
}
```

#### How Synchronization Works

1. **DataSource connects to source model**: The `DatabaseBlockDataSource` is created with the source database's model, not a copy
2. **All operations go to source**: When you call `dataSource.rowAdd()` or `dataSource.cellValueChange()`, it modifies the source database directly
3. **Y.js handles sync**: The source document's Y.js doc propagates changes to all connected clients
4. **References auto-update**: Since references use the same DataSource, they see changes immediately

```
┌─────────────────────┐     ┌─────────────────────┐
│     Document A      │     │     Document B      │
│  ┌───────────────┐  │     │  ┌───────────────┐  │
│  │ affine:database│◄─┼─────┼──│ affine:database│  │
│  │ (source)      │  │     │  │ -reference    │  │
│  │               │  │     │  │               │  │
│  │ DatabaseBlock │  │     │  │ Uses same     │  │
│  │ DataSource    │◄─┼─────┼──│ DataSource    │  │
│  └───────────────┘  │     │  └───────────────┘  │
└─────────────────────┘     └─────────────────────┘
         │                           │
         └───────────┬───────────────┘
                     │
              ┌──────▼──────┐
              │   Y.js Doc  │
              │ (source doc)│
              │             │
              │ Syncs to    │
              │ all clients │
              └─────────────┘
```

#### View-Specific References

When a `viewId` is specified, the reference shows only that specific view:

```typescript
// Create reference to specific view
await databaseReferenceService.createReference(
  targetDocId,
  sourceDocId,
  sourceDatabaseId,
  'kanban-view-id' // Only show this view
);

// The reference block will:
// 1. Load the source database
// 2. Set the view manager to the specified view
// 3. Render only that view (with its filters/sorting)
// 4. Edits still go to source database
```

### Context Management

Document context is managed through a reactive system:

```typescript
export class DocumentContextManager {
  // Observable of current active document
  activeDocument$: Observable<DocumentContext | null>;

  // Update context when editor focus changes
  updateActiveDocument(docId: string): void;

  // Enrich context with database information
  enrichContext(context: DocumentContext): DocumentContext;
}
```

### Preview System

The preview system uses a diff-based approach:

1. Clone the current document state
2. Apply operations to the clone
3. Generate diff between original and modified
4. Display diff in preview UI
5. On approval, apply operations to real document
6. On rejection, discard clone

This ensures previews are accurate and don't affect the actual document until approved.

## Performance Considerations

1. **Lazy Loading**: Database references load data on-demand rather than eagerly

2. **Debouncing**: AI command parsing is debounced to avoid excessive API calls

3. **Caching**: Document context is cached and invalidated only when necessary

4. **Batch Operations**: Multiple document operations are batched into single transactions

5. **Incremental Updates**: Only changed portions of documents are synchronized, not entire documents

## Security Considerations

1. **Permission Checks**: All document operations verify user permissions before execution

2. **Input Validation**: All AI-generated operations are validated before application

3. **Sandboxing**: Preview operations run in isolated context to prevent side effects

4. **Rate Limiting**: AI command execution is rate-limited to prevent abuse

5. **Audit Logging**: All AI-driven document changes are logged for audit purposes

## Slash Command Integration

### Overview

The slash command "/" menu provides a direct way for users to insert database references without using the AI chat. This integrates with BlockSuite's existing slash menu system.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Editor (BlockSuite)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Slash Menu System                        │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ "/" typed → Show menu with options:            │  │   │
│  │  │  - Text                                        │  │   │
│  │  │  - Heading                                     │  │   │
│  │  │  - Database                                    │  │   │
│  │  │  - Database Reference  ← NEW                   │  │   │
│  │  │  - ...                                         │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (user selects "Database Reference")
┌─────────────────────────────────────────────────────────────┐
│              DatabasePickerModal Component                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Search: [________________]                           │   │
│  │                                                       │   │
│  │  Pages with Databases:                               │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │ 📄 Project Tasks                                │ │   │
│  │  │    └─ 📊 Sprint Backlog (Table, Kanban)        │ │   │
│  │  │    └─ 📊 Bug Tracker (Table)                   │ │   │
│  │  │ 📄 Team Directory                               │ │   │
│  │  │    └─ 📊 Members (Table, Gallery)              │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │  Selected: Sprint Backlog                            │   │
│  │  View: [Kanban ▼]  (optional)                        │   │
│  │                                                       │   │
│  │  [Cancel]                              [Insert]       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (user clicks Insert)
┌─────────────────────────────────────────────────────────────┐
│  DatabaseReferenceService.createReference()                  │
│  → Creates affine:database-reference block at cursor        │
└─────────────────────────────────────────────────────────────┘
```

### SlashCommandHandler

Extends BlockSuite's slash menu to add the "Database Reference" option.

```typescript
// New file: packages/frontend/core/src/modules/ai-document-editor/slash-commands/database-reference-command.ts
import type { SlashMenuConfig } from '@blocksuite/affine/blocks';
import { DatabaseIcon } from '@blocksuite/icons/rc';

export const databaseReferenceSlashItem: SlashMenuConfig['items'][0] = {
  name: 'Database Reference',
  description: 'Insert a reference to a database from another page',
  icon: DatabaseIcon,
  group: 'Content',
  showWhen: ctx => {
    // Show in all note blocks
    const { model } = ctx;
    return model.flavour === 'affine:note' || model.parent?.flavour === 'affine:note';
  },
  action: async ctx => {
    const { std, model } = ctx;

    // Get services
    const workspaceService = std.get(WorkspaceService);
    const docsService = std.get(DocsService);

    // Open the database picker modal
    const result = await openDatabasePickerModal({
      workspaceService,
      docsService,
    });

    if (!result) {
      // User cancelled
      return;
    }

    const { sourceDocId, sourceDatabaseId, viewId } = result;

    // Insert the database reference block
    const doc = model.doc;
    const parentId = model.parent?.id ?? model.id;
    const index = model.parent?.children.indexOf(model) ?? 0;

    doc.addBlock(
      'affine:database-reference' as any,
      {
        sourceDocId,
        sourceDatabaseId,
        viewId,
      },
      parentId,
      index + 1
    );
  },
};
```

### DatabasePickerModal Component

React component for selecting a database to reference.

```typescript
// New file: packages/frontend/core/src/modules/ai-document-editor/ui/database-picker-modal.tsx
import { Modal, Input, Button } from '@affine/component';
import { useService } from '@toeverything/infra';
import { useState, useEffect, useMemo } from 'react';

interface DatabaseInfo {
  docId: string;
  docTitle: string;
  databaseId: string;
  databaseName: string;
  views: Array<{ id: string; name: string; type: string }>;
}

interface DatabasePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selection: {
    sourceDocId: string;
    sourceDatabaseId: string;
    viewId?: string;
  }) => void;
}

export function DatabasePickerModal({
  open,
  onClose,
  onSelect,
}: DatabasePickerModalProps) {
  const docsService = useService(DocsService);
  const workspaceService = useService(WorkspaceService);

  const [searchQuery, setSearchQuery] = useState('');
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseInfo | null>(null);
  const [selectedViewId, setSelectedViewId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  // Load all databases from workspace
  useEffect(() => {
    if (!open) return;

    const loadDatabases = async () => {
      setLoading(true);
      const allDatabases: DatabaseInfo[] = [];

      // Get all docs in workspace
      const docsList = workspaceService.workspace.docCollection.docs;

      for (const [docId, doc] of docsList) {
        const { doc: docRef, release } = docsService.open(docId);
        try {
          await docRef.waitForSyncReady();
          const bsDoc = docRef.blockSuiteDoc;

          // Find all database blocks
          const dbBlocks = bsDoc.getBlocksByFlavour('affine:database');

          for (const dbBlock of dbBlocks) {
            const model = dbBlock.model as DatabaseBlockModel;
            const views = model.views.map(v => ({
              id: v.id,
              name: v.name || v.mode,
              type: v.mode,
            }));

            allDatabases.push({
              docId,
              docTitle: docRef.meta?.title || 'Untitled',
              databaseId: dbBlock.id,
              databaseName: model.title?.toString() || 'Untitled Database',
              views,
            });
          }
        } finally {
          release();
        }
      }

      setDatabases(allDatabases);
      setLoading(false);
    };

    loadDatabases();
  }, [open, docsService, workspaceService]);

  // Filter databases by search query
  const filteredDatabases = useMemo(() => {
    if (!searchQuery) return databases;
    const query = searchQuery.toLowerCase();
    return databases.filter(
      db =>
        db.docTitle.toLowerCase().includes(query) ||
        db.databaseName.toLowerCase().includes(query)
    );
  }, [databases, searchQuery]);

  // Group by document
  const groupedByDoc = useMemo(() => {
    const groups = new Map<string, DatabaseInfo[]>();
    for (const db of filteredDatabases) {
      const existing = groups.get(db.docId) || [];
      existing.push(db);
      groups.set(db.docId, existing);
    }
    return groups;
  }, [filteredDatabases]);

  const handleInsert = () => {
    if (!selectedDatabase) return;

    onSelect({
      sourceDocId: selectedDatabase.docId,
      sourceDatabaseId: selectedDatabase.databaseId,
      viewId: selectedViewId,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Insert Database Reference">
      <div className="database-picker">
        <Input
          placeholder="Search pages and databases..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          autoFocus
        />

        {loading ? (
          <div className="loading">Loading databases...</div>
        ) : (
          <div className="database-list">
            {Array.from(groupedByDoc.entries()).map(([docId, dbs]) => (
              <div key={docId} className="doc-group">
                <div className="doc-title">📄 {dbs[0].docTitle}</div>
                {dbs.map(db => (
                  <div
                    key={db.databaseId}
                    className={`database-item ${
                      selectedDatabase?.databaseId === db.databaseId ? 'selected' : ''
                    }`}
                    onClick={() => {
                      setSelectedDatabase(db);
                      setSelectedViewId(undefined);
                    }}
                  >
                    <span className="database-icon">📊</span>
                    <span className="database-name">{db.databaseName}</span>
                    <span className="view-types">
                      ({db.views.map(v => v.type).join(', ')})
                    </span>
                  </div>
                ))}
              </div>
            ))}

            {groupedByDoc.size === 0 && (
              <div className="empty-state">
                No databases found in this workspace
              </div>
            )}
          </div>
        )}

        {selectedDatabase && selectedDatabase.views.length > 1 && (
          <div className="view-selector">
            <label>View (optional):</label>
            <select
              value={selectedViewId || ''}
              onChange={e => setSelectedViewId(e.target.value || undefined)}
            >
              <option value="">All views</option>
              {selectedDatabase.views.map(view => (
                <option key={view.id} value={view.id}>
                  {view.name} ({view.type})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="primary"
            disabled={!selectedDatabase}
            onClick={handleInsert}
          >
            Insert
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Helper function to open the modal imperatively
export function openDatabasePickerModal(deps: {
  workspaceService: WorkspaceService;
  docsService: DocsService;
}): Promise<{
  sourceDocId: string;
  sourceDatabaseId: string;
  viewId?: string;
} | null> {
  return new Promise((resolve) => {
    // Implementation uses React portal to render modal
    // and resolves promise on selection or cancel
    // ... (implementation details)
  });
}
```

### Data Models

```typescript
// Add to types.ts
interface DatabasePickerSelection {
  sourceDocId: string;
  sourceDatabaseId: string;
  viewId?: string;
}

interface WorkspaceDatabaseInfo {
  docId: string;
  docTitle: string;
  databases: Array<{
    id: string;
    name: string;
    views: Array<{
      id: string;
      name: string;
      type: 'table' | 'kanban' | 'gallery';
    }>;
  }>;
}
```

### Correctness Properties for Slash Command

### Property 26: Slash menu shows Database Reference option

_For any_ editor context where the user types "/", when the slash menu is displayed, the menu should include a "Database Reference" option.
**Validates: Requirements 12.1**

### Property 27: Database picker shows all workspace databases

_For any_ workspace with databases, when the database picker modal is opened, it should display all databases from all pages in the workspace.
**Validates: Requirements 12.3, 12.4**

### Property 28: Database reference insertion at cursor position

_For any_ database selection in the picker modal, when the user confirms the selection, the system should insert the database reference block at the current cursor position.
**Validates: Requirements 12.6**

### Property 29: Picker modal cancellation has no side effects

_For any_ database picker modal interaction, when the user cancels the modal, no blocks should be inserted and the document should remain unchanged.
**Validates: Requirements 12.8**

### Registration

The slash command is registered when the AI Document Editor module is configured:

```typescript
// In module configuration
export function configureAIDocumentEditorModule(framework: Framework) {
  // ... existing service registrations

  // Register slash command
  framework.impl(SlashMenuConfigIdentifier, prev => ({
    ...prev,
    items: [...prev.items, databaseReferenceSlashItem],
  }));
}
```
