# AI Document Editor UI Components

This directory contains React components for the AI Document Editor feature.

## Components

### AICommandInput

A text input component for executing AI document editing commands.

**Features:**
- Natural language command input
- Command execution through AIDocumentEditorService
- Loading states and error handling
- Keyboard shortcuts (Enter to submit)

**Usage:**

```tsx
import { AICommandInput } from '@affine/core/modules/ai-document-editor/ui';

<AICommandInput
  onCommandExecute={(result) => {
    if (result.success) {
      console.log('Command executed:', result);
    }
  }}
  onError={(error) => {
    console.error('Command failed:', error);
  }}
  placeholder="Enter a document editing command..."
/>
```

**Props:**
- `onCommandExecute?: (result: CommandResult) => void` - Called when a command is executed
- `onError?: (error: Error) => void` - Called when an error occurs
- `placeholder?: string` - Placeholder text for the input
- `className?: string` - Additional CSS class name

### ChangePreviewDialog

A modal dialog that displays a preview of proposed document changes.

**Features:**
- Visual diff display (additions, modifications, deletions)
- Approve/reject/modify actions
- Integration with ChangePreviewService
- Scrollable content for large change sets

**Usage:**

```tsx
import { ChangePreviewDialog } from '@affine/core/modules/ai-document-editor/ui';

<ChangePreviewDialog
  preview={changePreview}
  open={isOpen}
  onApprove={() => {
    console.log('Changes approved');
    setIsOpen(false);
  }}
  onReject={() => {
    console.log('Changes rejected');
    setIsOpen(false);
  }}
  onModify={() => {
    console.log('User wants to modify');
    setIsOpen(false);
  }}
  onClose={() => setIsOpen(false)}
/>
```

**Props:**
- `preview: ChangePreview` - The preview object containing the changes
- `open: boolean` - Whether the dialog is open
- `onApprove: () => void` - Called when user approves changes
- `onReject: () => void` - Called when user rejects changes
- `onModify?: () => void` - Optional callback for modify action
- `onClose: () => void` - Called when dialog is closed

## Integration Examples

### Basic Integration

See `example-integration.tsx` for a complete example of how to use both components together.

### Chat Panel Integration

To integrate the command input into the existing chat panel:

1. Import the component:
```tsx
import { AICommandInput } from '@affine/core/modules/ai-document-editor/ui';
```

2. Add it to your chat panel layout:
```tsx
<div className={styles.chatPanel}>
  {/* Existing chat content */}
  
  <AICommandInput
    onCommandExecute={handleCommandExecute}
    onError={handleCommandError}
  />
</div>
```

3. Handle command results:
```tsx
const handleCommandExecute = (result: CommandResult) => {
  if (result.success && result.preview) {
    // Show preview dialog
    setPreview(result.preview);
    setShowPreview(true);
  } else if (result.success) {
    // Show success message
    toast.success('Command executed');
  } else {
    // Show error
    toast.error(result.error?.message);
  }
};
```

## Styling

All components use vanilla-extract for styling with CSS modules. The styles follow AFFiNE's design system:

- Colors: Use CSS variables like `var(--affine-primary-color)`
- Spacing: Use consistent spacing (8px, 12px, 16px, 24px)
- Typography: Follow existing font sizes and weights
- Borders: Use `var(--affine-border-color)` for consistency

## Requirements

These components satisfy the following requirements:

- **Requirement 11.7**: UI components follow existing AFFiNE component patterns and design system
- **Requirement 7.1**: Display preview of AI-proposed changes
- **Requirement 7.2**: Highlight additions, deletions, and modifications
- **Requirement 7.5**: Provide approve/reject/modify actions

## Testing

To test these components:

```bash
# Run unit tests
yarn test packages/frontend/core/src/modules/ai-document-editor/ui

# Run integration tests
yarn test packages/frontend/core/src/modules/ai-document-editor/__tests__/integration.spec.ts
```

## Future Enhancements

Potential improvements for these components:

1. **Command Suggestions**: Add autocomplete/suggestions based on document context
2. **Command History**: Allow users to recall previous commands
3. **Rich Preview**: Show actual rendered content instead of JSON
4. **Inline Editing**: Allow editing changes directly in the preview
5. **Keyboard Shortcuts**: Add more keyboard shortcuts for power users
6. **Accessibility**: Improve ARIA labels and keyboard navigation
