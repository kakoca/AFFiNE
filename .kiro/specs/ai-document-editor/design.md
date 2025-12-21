# Design Document: AI Document Editor

## Overview

This design document outlines the architecture for enabling AFFiNE's AI Assistant to directly edit documents through chat commands and to create, add, and reference database blocks across pages. The system extends the existing CopilotClient and DatabaseBlockDataSource infrastructure to provide seamless AI-driven document manipulation capabilities.

The design follows a service-oriented architecture pattern consistent with AFFiNE's existing codebase, leveraging the @toeverything/infra framework for dependency injection and state management. All new components integrate with existing services (DocsService, CopilotClient, DatabaseBlockDataSource) to maximize code reuse and maintain architectural consistency.

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
export class AIDocumentEditorService extends Service {
  constructor(
    private copilotClient: CopilotClient,
    private docsService: DocsService,
    private workspaceService: WorkspaceService,
    private changePreviewService: ChangePreviewService
  ) {}

  /**
   * Parse a natural language command and execute the appropriate action
   */
  async executeCommand(
    command: string,
    options?: CommandOptions
  ): Promise<CommandResult>;

  /**
   * Edit document content based on AI instructions
   */
  async editDocument(
    docId: string,
    instructions: string,
    preview?: boolean
  ): Promise<EditResult>;

  /**
   * Add new content to a document at specified position
   */
  async addContent(
    docId: string,
    content: BlockContent,
    position?: InsertToPosition
  ): Promise<string>; // returns block ID

  /**
   * Create a new database block
   */
  async createDatabase(
    docId: string,
    config: DatabaseConfig,
    position?: InsertToPosition
  ): Promise<string>; // returns database block ID

  /**
   * Get the currently active document context
   */
  getActiveDocumentContext(): DocumentContext | null;
}
```

### DatabaseReferenceService

Service for managing database references across documents.

```typescript
export class DatabaseReferenceService extends Service {
  constructor(
    private docsService: DocsService,
    private workspaceService: WorkspaceService
  ) {}

  /**
   * Create a reference to an existing database in another document
   */
  async createReference(
    targetDocId: string,
    sourceDatabaseId: string,
    viewId?: string,
    position?: InsertToPosition
  ): Promise<string>; // returns reference block ID

  /**
   * Find all references to a given database
   */
  async findReferences(databaseId: string): Promise<DatabaseReference[]>;

  /**
   * Update all references when source database changes
   */
  async syncReferences(databaseId: string, changes: DatabaseChanges): Promise<void>;

  /**
   * Validate that a database reference target exists
   */
  async validateReference(databaseId: string): Promise<boolean>;
}
```

### ChangePreviewService

Service for previewing AI-generated changes before applying them.

```typescript
export class ChangePreviewService extends Service {
  /**
   * Generate a preview of proposed document changes
   */
  async generatePreview(
    docId: string,
    operations: DocumentOperation[]
  ): Promise<ChangePreview>;

  /**
   * Apply approved changes to the document
   */
  async applyChanges(
    docId: string,
    preview: ChangePreview
  ): Promise<void>;

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
  static extractTargetDocument(
    command: string,
    context: DocumentContext
  ): string | null;
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
type DocumentOperation =
  | EditOperation
  | InsertOperation
  | DeleteOperation
  | DatabaseOperation;

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

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Command parsing identifies target document

*For any* chat command and document context, when the command is parsed, the system should correctly identify the target document from either explicit references or the active context.
**Validates: Requirements 1.1, 6.1, 6.3**

### Property 2: Edit operations preserve untargeted content

*For any* document and edit operation, when the edit is applied, all content not explicitly targeted by the operation should remain unchanged.
**Validates: Requirements 1.3**

### Property 3: Multi-session synchronization propagates edits

*For any* document with multiple active sessions, when an AI-generated edit is applied, the edit should propagate to all active sessions viewing that document.
**Validates: Requirements 1.5**

### Property 4: Content insertion respects specified position

*For any* document, content, and insertion position, when content is added at the specified position, the content should appear at exactly that position in the document structure.
**Validates: Requirements 2.1**

### Property 5: All block types can be inserted

*For any* valid block type (paragraph, heading, list, database, etc.), the system should successfully create and insert that block type into a document.
**Validates: Requirements 2.3**

### Property 6: Block hierarchy is maintained after insertion

*For any* document with nested block structure, when new content is added, the existing parent-child relationships and nesting levels should remain valid.
**Validates: Requirements 2.4**

### Property 7: Block insertion returns valid identifier

*For any* block insertion operation, when the block is successfully added, the system should return a valid, non-null block identifier that can be used for subsequent operations.
**Validates: Requirements 2.5**

### Property 8: Database creation matches specification

*For any* database configuration specification, when a database is created, the resulting database should have columns, views, and initial data matching the specification.
**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 9: Database creation returns valid identifier

*For any* database creation operation, when the database is successfully created, the system should return a valid database block identifier.
**Validates: Requirements 3.5**

### Property 10: Database reference points to source

*For any* database reference creation request, when the reference is created, it should contain a valid pointer to the source database block.
**Validates: Requirements 4.1**

### Property 11: Reference modifications update source and all references

*For any* database with multiple references, when data is modified through any reference, the source database and all other references should reflect the same modification.
**Validates: Requirements 4.3**

### Property 12: All view types work through references

*For any* database view type (table, kanban, gallery), when a reference is created for that view type, the reference should correctly display data in that view format.
**Validates: Requirements 4.4**

### Property 13: References remain valid after source moves

*For any* database reference, when the source database is moved to a different document, the reference should continue to point to and display the source database correctly.
**Validates: Requirements 4.5**

### Property 14: View-specific references display only specified view

*For any* database with multiple views, when a reference is created for a specific view, the reference should display only that view and not other views from the source database.
**Validates: Requirements 5.2**

### Property 15: View references preserve configuration

*For any* database view with filters and sorting, when a reference to that view is created, the reference should preserve and apply the same filters and sorting configuration.
**Validates: Requirements 5.3**

### Property 16: View reference edits update source

*For any* view-specific database reference, when data is edited through the reference, the changes should be applied to the source database.
**Validates: Requirements 5.4**

### Property 17: Source view changes propagate to references

*For any* database view with references, when the source view's configuration (filters, sorting) is changed, all references to that view should reflect the updated configuration.
**Validates: Requirements 5.5**

### Property 18: Active document context includes databases

*For any* active document containing database blocks, when the document context is retrieved, the context should include information about all databases in that document.
**Validates: Requirements 6.2**

### Property 19: Multiple open documents use focused editor

*For any* workspace state with multiple open documents, when a command is executed without explicit document specification, the system should use the currently focused editor's document as the target.
**Validates: Requirements 6.4**

### Property 20: Preview rejection leaves document unchanged

*For any* document and proposed changes, when the user rejects the preview, the document should remain in exactly the same state as before the preview was generated.
**Validates: Requirements 7.4**

### Property 21: Failed operations roll back completely

*For any* document edit operation that fails, the system should roll back any partial changes, leaving the document in its original state before the operation was attempted.
**Validates: Requirements 8.1**

### Property 22: Database row insertion adds rows

*For any* database and row data, when a request to add rows is processed, the database should contain the new rows with the specified data.
**Validates: Requirements 10.1**

### Property 23: Cell updates modify specified cells

*For any* database cell update request, when the update is processed, the specified cells should contain the new values.
**Validates: Requirements 10.2**

### Property 24: View configuration applies filters and sorting

*For any* database view and configuration request (filters, sorting), when the configuration is applied, the view should display data according to the specified filters and sorting rules.
**Validates: Requirements 10.3**

### Property 25: New view creation adds view with settings

*For any* database and view specification, when a new view is created, the database should contain the new view with the specified settings (type, filters, sorting, columns).
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

| Scenario | Error Type | Handling Strategy |
|----------|-----------|-------------------|
| Invalid document ID | DocumentEditError | Prompt user to select valid document |
| Database reference target not found | DatabaseReferenceError | Suggest available databases |
| Permission denied | UnauthorizedError | Show permission requirements |
| Network timeout | GeneralNetworkError | Retry with backoff, then notify user |
| Invalid command syntax | CommandParseError | Show command examples and syntax help |
| Concurrent edit conflict | DocumentEditError | Merge changes or prompt user to resolve |

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

1. **CopilotClient**: All AI communication uses existing methods (`createSession`, `createMessage`, `chatTextStream`, `applyDocUpdates`)

2. **DocsService**: Document access and manipulation uses existing service methods

3. **DatabaseBlockDataSource**: Database operations use existing methods (`rowAdd`, `cellValueChange`, `propertyAdd`, `viewDataAdd`, `viewDataUpdate`)

4. **Block Creation**: Uses existing `doc.addBlock()` and `insertPositionToIndex()` utilities

5. **Y.js Synchronization**: Leverages existing CRDT-based synchronization for real-time updates

6. **Service Architecture**: Follows @toeverything/infra patterns (Service, Entity, Store)

7. **GraphQL**: Extends existing mutations/queries rather than creating new communication channels

### Database Reference Implementation

Database references are implemented as a new block type that extends the existing database block:

```typescript
// New block type: 'affine:database-reference'
interface DatabaseReferenceBlock {
  flavour: 'affine:database-reference';
  sourceId: string; // ID of source database block
  viewId?: string; // Optional specific view
  isLinked: true; // Marker for reference blocks
}
```

The reference block uses the same DatabaseBlockDataSource but wraps operations to:
- Forward all data operations to the source database
- Subscribe to source database changes
- Maintain view-specific filtering if viewId is specified

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
