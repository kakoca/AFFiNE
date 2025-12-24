# AI Document Editor Module

This module provides AI-driven document editing capabilities for AFFiNE, enabling the AI assistant to directly manipulate documents through chat commands.

## Features

- **Direct Document Editing**: AI can edit document content through natural language commands
- **Database Block Creation**: Create and configure database blocks with AI assistance
- **Cross-Document References**: Reference and display databases from other documents
- **Change Preview**: Preview AI-proposed changes before applying them
- **Context-Aware Commands**: AI understands the current document context

## Module Structure

```
ai-document-editor/
├── index.ts              # Module configuration and exports
├── types.ts              # Type definitions
├── errors.ts             # Error classes
├── command-parser.ts     # Command parsing utility
├── services/             # Service implementations
│   ├── document-context-manager.ts  # Active document tracking and context enrichment
│   └── change-preview.ts            # Change preview and application
├── entities/             # Entity classes
└── stores/               # Store classes
```

## Implemented Components

### DocumentContextManager

The `DocumentContextManager` service tracks the currently active document and enriches it with context information:

- **Active Document Tracking**: Monitors the workbench to detect which document is currently focused
- **Database Scanning**: Automatically scans documents for `affine:database` blocks and extracts their metadata
- **Reactive Updates**: Provides an observable stream (`activeDocumentContext$`) that emits updates when the active document changes
- **Multi-Document Support**: Handles multiple open documents by using the focused editor from WorkbenchService

**Key Methods**:
- `getActiveDocumentContext()`: Returns the current active document context synchronously
- `activeDocumentContext$`: Observable that emits context updates when the active view changes

**Context Information**:
- Document ID
- List of databases in the document (with block IDs, names, and views)
- Cursor position (future)
- Selection (future)

### CommandParser

The `CommandParser` utility parses natural language commands into structured operations:

- **Command Type Detection**: Identifies edit, add, create, reference, and database operations
- **Target Document Extraction**: Extracts document IDs from commands or uses context
- **Context Resolution**: Handles "this page" and "current document" references

**Requirements Validated**:
- 6.1: Automatic detection of currently active document
- 6.2: Context enrichment with database information
- 6.4: Multiple open documents handled via focused editor

### ChangePreviewService

The `ChangePreviewService` handles preview generation and application of document changes:

- **Preview Generation**: Creates previews by capturing before/after states of affected blocks
- **Change Categorization**: Organizes changes into additions, modifications, and deletions
- **Transaction Support**: Applies changes atomically using BlockSuite transactions
- **Rollback on Failure**: Automatically rolls back partial changes if any operation fails
- **Preview Discard**: Allows rejecting changes without affecting the original document

**Key Methods**:
- `generatePreview(docId, operations)`: Generates a preview of proposed changes
- `applyChanges(docId, preview)`: Applies approved changes using transactions
- `discardPreview(previewId)`: Discards a preview without applying changes
- `getPreview(previewId)`: Retrieves a stored preview by ID

**Preview Structure**:
- Additions: New blocks to be inserted
- Modifications: Existing blocks with before/after states
- Deletions: Blocks to be removed with their current state

**Requirements Validated**:
- 7.3: Apply changes to the document with transaction support
- 7.4: Discard proposed changes and maintain current document state
- 8.1: Roll back partial changes on failure to maintain consistency

## Architecture

The module follows AFFiNE's @toeverything/infra patterns:

- **Services**: Business logic for document editing, database operations, and change management
- **Entities**: State containers for document context and previews
- **Stores**: Data access layer for persistent state

## Integration

The module integrates with existing AFFiNE infrastructure:

- **DocsService**: For document access and manipulation
- **CopilotClient**: For AI communication
- **DatabaseBlockDataSource**: For database operations
- **WorkspaceService**: For workspace context

## Documentation

### For Users

- **[Command Reference Guide](./COMMAND_REFERENCE.md)**: Complete guide to AI command syntax with examples for document editing, database creation, and database references

### For Developers

- **[API Reference](./API_REFERENCE.md)**: Comprehensive API documentation for all services, methods, types, and error handling
- **[Integration Guide](./INTEGRATION_GUIDE.md)**: Practical examples and patterns for integrating the AI Document Editor into your application

### Specification Documents

- **[Requirements](../../.kiro/specs/ai-document-editor/requirements.md)**: Detailed feature requirements and acceptance criteria
- **[Design Document](../../.kiro/specs/ai-document-editor/design.md)**: Architectural design and implementation details
- **[Implementation Tasks](../../.kiro/specs/ai-document-editor/tasks.md)**: Implementation plan and task list

## Quick Start

### For Users

Execute natural language commands in the chat interface:

```
"Add a task database with status and assignee columns"
"Create a reference to the Team Tasks database"
"Update the introduction to emphasize security"
```

See the [Command Reference Guide](./COMMAND_REFERENCE.md) for complete syntax and examples.

### For Developers

```typescript
import { useService } from '@toeverything/infra';
import { AIDocumentEditorService } from '@affine/core/modules/ai-document-editor';

function MyComponent() {
  const aiDocService = useService(AIDocumentEditorService);
  
  const handleCommand = async (command: string) => {
    const result = await aiDocService.executeCommand(command);
    if (result.success) {
      console.log('Command executed successfully');
    }
  };
  
  return <CommandInput onSubmit={handleCommand} />;
}
```

See the [Integration Guide](./INTEGRATION_GUIDE.md) for detailed examples and patterns.

## Requirements

See [requirements.md](../../.kiro/specs/ai-document-editor/requirements.md) for detailed requirements.

## Design

See [design.md](../../.kiro/specs/ai-document-editor/design.md) for architectural design and implementation details.

## Implementation Tasks

See [tasks.md](../../.kiro/specs/ai-document-editor/tasks.md) for the implementation plan.
