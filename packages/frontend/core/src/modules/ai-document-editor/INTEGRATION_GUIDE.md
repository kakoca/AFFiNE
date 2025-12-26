# AI Document Editor - Integration Guide

This guide provides practical examples and patterns for integrating the AI Document Editor module into your AFFiNE application or extension.

## Table of Contents

- [Getting Started](#getting-started)
- [Basic Integration](#basic-integration)
- [Common Use Cases](#common-use-cases)
- [Advanced Patterns](#advanced-patterns)
- [UI Integration](#ui-integration)
- [Testing Integration](#testing-integration)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- AFFiNE workspace with `@toeverything/infra` framework
- Access to `DocsService` and `WorkspaceService`
- CopilotClient configured for AI operations

### Installation

The AI Document Editor module is part of the AFFiNE core package. Ensure you have the latest version:

```bash
yarn install
```

### Module Registration

Register the module in your application initialization:

```typescript
import { Framework } from '@toeverything/infra';
import { configureAIDocumentEditorModule } from '@affine/core/modules/ai-document-editor';

// During app initialization
const framework = new Framework();
configureAIDocumentEditorModule(framework);
```

## Basic Integration

### Accessing Services

Services are accessed through dependency injection:

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

  return <button onClick={() => handleCommand('Add a task database')}>
    Execute Command
  </button>;
}
```

### Simple Command Execution

Execute a command with automatic context detection:

```typescript
import { AIDocumentEditorService } from '@affine/core/modules/ai-document-editor';

async function executeSimpleCommand(aiDocService: AIDocumentEditorService, command: string) {
  try {
    const result = await aiDocService.executeCommand(command);

    if (result.success) {
      console.log(`Affected ${result.affectedBlocks.length} blocks`);
      return result;
    } else {
      console.error('Command failed:', result.error);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Usage
await executeSimpleCommand(aiDocService, 'Add a paragraph about project goals');
```

### Document Editing

Edit a specific document:

```typescript
async function editDocumentContent(aiDocService: AIDocumentEditorService, docId: string, instructions: string) {
  const result = await aiDocService.editDocument(
    docId,
    instructions,
    false // No preview
  );

  if (result.success) {
    console.log('Document edited successfully');
    console.log('Changes:', result.changes);
  }
}

// Usage
await editDocumentContent(aiDocService, 'doc-123', 'Update the introduction to emphasize security features');
```

## Common Use Cases

### Use Case 1: Task Management System

Create a complete task management system with databases and references:

```typescript
import { AIDocumentEditorService, DatabaseReferenceService } from '@affine/core/modules/ai-document-editor';

async function setupTaskManagement(aiDocService: AIDocumentEditorService, dbRefService: DatabaseReferenceService, projectDocId: string, personalDocId: string) {
  // 1. Create main task database in project document
  const taskDbId = await aiDocService.createDatabase(projectDocId, {
    name: 'Project Tasks',
    columns: [
      { name: 'Title', type: 'title' },
      {
        name: 'Status',
        type: 'select',
        data: {
          options: ['Todo', 'In Progress', 'Done'],
        },
      },
      {
        name: 'Priority',
        type: 'select',
        data: {
          options: ['Low', 'Medium', 'High'],
        },
      },
      { name: 'Assignee', type: 'text' },
      { name: 'Due Date', type: 'date' },
    ],
    viewType: 'table',
    initialRows: [
      {
        Title: 'Set up development environment',
        Status: 'Todo',
        Priority: 'High',
        Assignee: 'Alice',
        'Due Date': new Date('2024-02-01'),
      },
    ],
  });

  // 2. Create a kanban view
  const { dataSource, release } = await dbRefService.getDataSourceForReference(projectDocId, taskDbId);

  try {
    dataSource.viewManager.viewAdd('kanban');
  } finally {
    release();
  }

  // 3. Add reference to personal workspace
  const refId = await dbRefService.createReference(personalDocId, projectDocId, taskDbId);

  console.log('Task management system set up successfully');
  return { taskDbId, refId };
}
```

### Use Case 2: Meeting Notes with Action Items

Automatically extract and track action items from meeting notes:

```typescript
async function processMeetingNotes(aiDocService: AIDocumentEditorService, meetingDocId: string, actionItemsDocId: string) {
  // 1. Create action items database in meeting doc
  const actionDbId = await aiDocService.createDatabase(meetingDocId, {
    name: 'Action Items',
    columns: [
      { name: 'Action', type: 'title' },
      { name: 'Owner', type: 'text' },
      { name: 'Due Date', type: 'date' },
      {
        name: 'Status',
        type: 'select',
        data: {
          options: ['Not Started', 'In Progress', 'Complete'],
        },
      },
    ],
    viewType: 'table',
  });

  // 2. Use AI to extract action items from meeting notes
  await aiDocService.executeCommand(
    `Analyze the meeting notes and add action items to the Action Items database. 
     Extract any tasks mentioned with their owners and deadlines.`
  );

  // 3. Create reference in central action items tracker
  const dbRefService = useService(DatabaseReferenceService);
  await dbRefService.createReference(actionItemsDocId, meetingDocId, actionDbId);

  return actionDbId;
}
```

### Use Case 3: Project Dashboard

Create a dashboard that aggregates data from multiple sources:

```typescript
async function createProjectDashboard(aiDocService: AIDocumentEditorService, dbRefService: DatabaseReferenceService, dashboardDocId: string, sourceDocuments: Array<{ docId: string; dbId: string; viewId?: string }>) {
  // Add title
  await aiDocService.addContent(dashboardDocId, {
    type: 'affine:paragraph',
    props: {
      text: 'Project Dashboard',
      type: 'h1',
    },
  });

  // Add references to all source databases
  for (const source of sourceDocuments) {
    // Add section heading
    await aiDocService.addContent(dashboardDocId, {
      type: 'affine:paragraph',
      props: {
        text: `Data from ${source.docId}`,
        type: 'h2',
      },
    });

    // Add database reference
    await dbRefService.createReference(dashboardDocId, source.docId, source.dbId, source.viewId);
  }

  console.log('Dashboard created with all references');
}
```

### Use Case 4: Content Templates

Create reusable content templates:

```typescript
async function applyTemplate(aiDocService: AIDocumentEditorService, docId: string, templateType: 'project-plan' | 'meeting-notes' | 'design-doc') {
  const templates = {
    'project-plan': `
      Add the following structure:
      - Heading: Project Overview
      - Paragraph: Brief description
      - Heading: Goals and Objectives
      - Bullet list with 3 placeholder items
      - Heading: Timeline
      - Create a database with columns: Milestone, Due Date, Status, Owner
      - Heading: Resources
      - Paragraph: Resource allocation notes
    `,
    'meeting-notes': `
      Add the following structure:
      - Heading: Meeting Notes
      - Paragraph: Date and attendees
      - Heading: Agenda
      - Numbered list with 3 placeholder items
      - Heading: Discussion Points
      - Paragraph: Notes placeholder
      - Heading: Action Items
      - Create a database with columns: Action, Owner, Due Date, Status
    `,
    'design-doc': `
      Add the following structure:
      - Heading: Design Document
      - Heading: Overview
      - Paragraph: Purpose and scope
      - Heading: Requirements
      - Bullet list with placeholder requirements
      - Heading: Architecture
      - Paragraph: Architecture description
      - Heading: Implementation Plan
      - Create a database with columns: Task, Priority, Status, Assignee
    `,
  };

  const template = templates[templateType];
  await aiDocService.executeCommand(template);
}
```

## Advanced Patterns

### Pattern 1: Batch Operations

Execute multiple operations efficiently:

```typescript
async function batchDatabaseOperations(
  dbRefService: DatabaseReferenceService,
  docId: string,
  dbId: string,
  operations: Array<{
    type: 'addRow' | 'updateCell';
    data: any;
  }>
) {
  const { dataSource, release } = await dbRefService.getDataSourceForReference(docId, dbId);

  try {
    // Use transaction for atomic operations
    for (const op of operations) {
      if (op.type === 'addRow') {
        const rowId = dataSource.rowAdd('end');
        // Populate row data
        Object.entries(op.data).forEach(([key, value]) => {
          const property = dataSource.propertyGetByName(key);
          if (property) {
            dataSource.cellValueChange(rowId, property.id, value);
          }
        });
      } else if (op.type === 'updateCell') {
        dataSource.cellValueChange(op.data.rowId, op.data.propertyId, op.data.value);
      }
    }
  } finally {
    release();
  }
}
```

### Pattern 2: Change Preview with User Confirmation

Implement preview workflow:

```typescript
import {
  AIDocumentEditorService,
  ChangePreviewService
} from '@affine/core/modules/ai-document-editor';

async function executeWithPreview(
  aiDocService: AIDocumentEditorService,
  changePreviewService: ChangePreviewService,
  command: string,
  onPreview: (preview: ChangePreview) => Promise<boolean>
) {
  // Execute command with preview
  const result = await aiDocService.executeCommand(command, {
    preview: true
  });

  if (!result.success || !result.preview) {
    throw new Error('Failed to generate preview');
  }

  // Show preview to user and get approval
  const approved = await onPreview(result.preview);

  if (approved) {
    // Apply changes
    await changePreviewService.applyChanges(
      result.preview.docId,
      result.preview
    );
    console.log('Changes applied');
  } else {
    // Discard preview
    await changePreviewService.discardPreview(result.preview.id);
    console.log('Changes discarded');
  }
}

// Usage with React
function CommandWithPreview() {
  const aiDocService = useService(AIDocumentEditorService);
  const changePreviewService = useService(ChangePreviewService);
  const [preview, setPreview] = useState<ChangePreview | null>(null);

  const handleCommand = async (command: string) => {
    await executeWithPreview(
      aiDocService,
      changePreviewService,
      command,
      async (preview) => {
        setPreview(preview);
        // Return promise that resolves when user makes decision
        return new Promise((resolve) => {
          // Store resolve function to call on user action
          window.previewResolve = resolve;
        });
      }
    );
  };

  return (
    <>
      <CommandInput onSubmit={handleCommand} />
      {preview && (
        <PreviewDialog
          preview={preview}
          onApprove={() => {
            window.previewResolve(true);
            setPreview(null);
          }}
          onReject={() => {
            window.previewResolve(false);
            setPreview(null);
          }}
        />
      )}
    </>
  );
}
```

### Pattern 3: Context-Aware Operations

Use document context for intelligent operations:

```typescript
async function smartDatabaseOperation(aiDocService: AIDocumentEditorService, operation: string) {
  // Get current context
  const context = aiDocService.getActiveDocumentContext();

  if (!context) {
    throw new Error('No active document');
  }

  // Check if document has databases
  if (context.databases.length === 0) {
    // No databases, create one first
    await aiDocService.executeCommand('Create a task database with title, status, and assignee columns');
  }

  // Now execute the operation with context
  await aiDocService.executeCommand(operation);
}
```

### Pattern 4: Error Recovery

Implement robust error handling:

```typescript
import { DocumentEditError, DatabaseReferenceError, CommandParseError } from '@affine/core/modules/ai-document-editor';

async function executeWithRecovery(aiDocService: AIDocumentEditorService, command: string, maxRetries: number = 3) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await aiDocService.executeCommand(command);
      return result;
    } catch (error) {
      lastError = error as Error;

      if (error instanceof CommandParseError) {
        // Command syntax error - don't retry
        throw error;
      } else if (error instanceof DatabaseReferenceError) {
        // Reference error - try to fix
        console.log('Database reference error, attempting recovery...');
        await attemptReferenceRecovery(error);
      } else if (error instanceof DocumentEditError) {
        // Edit error - might be transient
        console.log(`Edit failed, attempt ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      } else {
        // Unknown error
        throw error;
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message}`);
}

async function attemptReferenceRecovery(error: DatabaseReferenceError) {
  // Try to find alternative database or create new one
  console.log('Attempting to recover from reference error...');
  // Implementation depends on your use case
}
```

### Pattern 5: Real-time Synchronization

Monitor and react to changes:

```typescript
import { DocumentContextManager } from '@affine/core/modules/ai-document-editor';

function setupRealtimeSync(contextManager: DocumentContextManager, onDocumentChange: (docId: string) => void) {
  // Observe active document changes
  const subscription = contextManager.observeActiveDocument().subscribe(doc => {
    if (doc) {
      onDocumentChange(doc.id);

      // Set up listeners for document changes
      doc.blockSuiteDoc.slots.blockUpdated.on(update => {
        console.log('Block updated:', update);
        // React to changes
      });
    }
  });

  // Cleanup
  return () => subscription.unsubscribe();
}
```

## UI Integration

### Integrating Command Input

Add AI command input to your UI:

```typescript
import { AICommandInput } from '@affine/core/modules/ai-document-editor/ui';

function MyWorkspace() {
  const aiDocService = useService(AIDocumentEditorService);

  const handleCommand = async (command: string) => {
    const result = await aiDocService.executeCommand(command);
    if (result.success) {
      showSuccessNotification('Command executed successfully');
    } else {
      showErrorNotification(result.error?.message || 'Command failed');
    }
  };

  return (
    <div>
      <AICommandInput onSubmit={handleCommand} />
      {/* Rest of your UI */}
    </div>
  );
}
```

### Custom Preview Dialog

Create a custom preview dialog:

```typescript
import { ChangePreview } from '@affine/core/modules/ai-document-editor';

interface PreviewDialogProps {
  preview: ChangePreview;
  onApprove: () => void;
  onReject: () => void;
}

function CustomPreviewDialog({ preview, onApprove, onReject }: PreviewDialogProps) {
  return (
    <Dialog open>
      <DialogTitle>Preview Changes</DialogTitle>
      <DialogContent>
        <Section title="Additions">
          {preview.additions.map(block => (
            <PreviewBlock key={block.blockId} block={block} type="add" />
          ))}
        </Section>

        <Section title="Modifications">
          {preview.modifications.map(block => (
            <PreviewBlock key={block.blockId} block={block} type="modify" />
          ))}
        </Section>

        <Section title="Deletions">
          {preview.deletions.map(block => (
            <PreviewBlock key={block.blockId} block={block} type="delete" />
          ))}
        </Section>
      </DialogContent>

      <DialogActions>
        <Button onClick={onReject} variant="secondary">
          Reject
        </Button>
        <Button onClick={onApprove} variant="primary">
          Apply Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

### Status Indicators

Show operation status:

```typescript
function CommandStatus() {
  const [status, setStatus] = useState<'idle' | 'executing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const executeCommand = async (command: string) => {
    setStatus('executing');
    setMessage('Executing command...');

    try {
      const result = await aiDocService.executeCommand(command);
      setStatus('success');
      setMessage(`Command executed successfully. Affected ${result.affectedBlocks.length} blocks.`);
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  return (
    <div>
      <StatusBadge status={status} />
      <StatusMessage>{message}</StatusMessage>
    </div>
  );
}
```

## Testing Integration

### Unit Testing

Test service integration:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AIDocumentEditorService } from '@affine/core/modules/ai-document-editor';

describe('AI Document Editor Integration', () => {
  let aiDocService: AIDocumentEditorService;

  beforeEach(() => {
    // Set up test environment
    aiDocService = createTestService();
  });

  it('should execute simple command', async () => {
    const result = await aiDocService.executeCommand('Add a paragraph with test content');

    expect(result.success).toBe(true);
    expect(result.affectedBlocks.length).toBeGreaterThan(0);
  });

  it('should create database with specified structure', async () => {
    const dbId = await aiDocService.createDatabase('test-doc', {
      columns: [
        { name: 'Title', type: 'title' },
        { name: 'Status', type: 'select', data: { options: ['Todo', 'Done'] } },
      ],
      viewType: 'table',
    });

    expect(dbId).toBeTruthy();
  });
});
```

### Integration Testing

Test end-to-end workflows:

```typescript
describe('Task Management Workflow', () => {
  it('should create complete task management system', async () => {
    // Create project document
    const projectDoc = await createTestDocument();

    // Create task database
    const taskDbId = await aiDocService.createDatabase(projectDoc.id, taskDatabaseConfig);

    // Add initial tasks
    await aiDocService.executeCommand('Add task: Complete documentation, Status: Todo, Assignee: Alice');

    // Create personal document
    const personalDoc = await createTestDocument();

    // Add reference
    const refId = await dbRefService.createReference(personalDoc.id, projectDoc.id, taskDbId);

    // Verify reference works
    const { dataSource, release } = await dbRefService.getDataSourceForReference(personalDoc.id, refId);

    try {
      const rows = dataSource.rows;
      expect(rows.length).toBeGreaterThan(0);
    } finally {
      release();
    }
  });
});
```

## Performance Optimization

### Caching Context

Cache document context to avoid repeated lookups:

```typescript
class ContextCache {
  private cache = new Map<string, { context: DocumentContext; timestamp: number }>();
  private ttl = 5000; // 5 seconds

  async getContext(docId: string, contextManager: DocumentContextManager): Promise<DocumentContext> {
    const cached = this.cache.get(docId);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.context;
    }

    const doc = await docsService.open(docId);
    const context = await contextManager.enrichContext(doc.doc);

    this.cache.set(docId, { context, timestamp: Date.now() });

    return context;
  }
}
```

### Batch Reference Creation

Create multiple references efficiently:

```typescript
async function createMultipleReferences(dbRefService: DatabaseReferenceService, targetDocId: string, sources: Array<{ docId: string; dbId: string }>) {
  // Validate all sources first
  const validations = await Promise.all(sources.map(s => dbRefService.validateReference(s.docId, s.dbId)));

  const validSources = sources.filter((_, i) => validations[i]);

  // Create all references in parallel
  const refIds = await Promise.all(validSources.map(s => dbRefService.createReference(targetDocId, s.docId, s.dbId)));

  return refIds;
}
```

### Debounced Operations

Debounce frequent operations:

```typescript
import { debounce } from 'lodash';

const debouncedExecuteCommand = debounce(
  async (aiDocService: AIDocumentEditorService, command: string) => {
    await aiDocService.executeCommand(command);
  },
  500
);

// Usage in component
function CommandInput() {
  const handleInput = (command: string) => {
    debouncedExecuteCommand(aiDocService, command);
  };

  return <input onChange={(e) => handleInput(e.target.value)} />;
}
```

## Troubleshooting

### Common Issues

#### Issue: "No active document" error

**Solution:** Ensure a document is focused before executing commands:

```typescript
const context = aiDocService.getActiveDocumentContext();
if (!context) {
  // Prompt user to open a document
  showNotification('Please open a document first');
  return;
}
```

#### Issue: Database reference not updating

**Solution:** Verify Y.js synchronization is working:

```typescript
const { doc, release } = docsService.open(docId);
try {
  await doc.waitForSyncReady();
  // Now proceed with operations
} finally {
  release();
}
```

#### Issue: Memory leaks from unreleased documents

**Solution:** Always use try-finally blocks:

```typescript
const { doc, release } = docsService.open(docId);
try {
  // Operations
} finally {
  release(); // Always called, even on error
}
```

#### Issue: Commands not being parsed correctly

**Solution:** Use more specific command syntax:

```typescript
// ❌ Vague
'Add something to the database';

// ✅ Specific
"Add a row to the Tasks database with Title: 'New task', Status: 'Todo'";
```

### Debug Mode

Enable debug logging:

```typescript
// In development
if (process.env.NODE_ENV === 'development') {
  window.aiDocDebug = true;
}

// In your code
if (window.aiDocDebug) {
  console.log('Command:', command);
  console.log('Context:', context);
  console.log('Result:', result);
}
```

### Performance Monitoring

Monitor operation performance:

```typescript
async function executeWithTiming(aiDocService: AIDocumentEditorService, command: string) {
  const start = performance.now();

  try {
    const result = await aiDocService.executeCommand(command);
    const duration = performance.now() - start;

    console.log(`Command executed in ${duration.toFixed(2)}ms`);

    if (duration > 1000) {
      console.warn('Slow command execution detected');
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`Command failed after ${duration.toFixed(2)}ms`);
    throw error;
  }
}
```

## Next Steps

- Review the [API Reference](./API_REFERENCE.md) for detailed API documentation
- Check the [Command Reference](./COMMAND_REFERENCE.md) for command syntax
- Read the [Design Document](./design.md) for architecture details
- Explore the [test files](./__tests__/) for more examples

## Support

For issues or questions:

- Check existing documentation
- Review test files for examples
- Consult the design document for architecture details
- Reach out to the AFFiNE development team
