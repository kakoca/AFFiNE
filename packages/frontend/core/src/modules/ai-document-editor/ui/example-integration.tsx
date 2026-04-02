/**
 * Example integration of AI Document Editor UI components
 *
 * This file demonstrates how to integrate the AICommandInput and ChangePreviewDialog
 * components into an existing AFFiNE page or panel.
 *
 * Usage example:
 *
 * ```tsx
 * import { AIDocumentEditorPanel } from '@affine/core/modules/ai-document-editor/ui/example-integration';
 *
 * // In your component:
 * <AIDocumentEditorPanel />
 * ```
 */

import { toast } from '@affine/component';
import { useCallback, useState } from 'react';

import type { ChangePreview, CommandResult } from '../types';
import { AICommandInput } from './ai-command-input';
import { ChangePreviewDialog } from './change-preview-dialog';

/**
 * Example panel that integrates AI command input with change preview
 *
 * This demonstrates the complete workflow:
 * 1. User enters a command
 * 2. Command is executed
 * 3. If preview is available, show preview dialog
 * 4. User approves/rejects changes
 * 5. Show feedback to user
 */
export const AIDocumentEditorPanel = () => {
  const [preview, setPreview] = useState<ChangePreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleCommandExecute = useCallback((result: CommandResult) => {
    if (result.success) {
      if (result.preview) {
        // Show preview dialog if available
        setPreview(result.preview);
        setIsPreviewOpen(true);
      } else {
        // Command executed successfully without preview
        toast.success('Command executed successfully');
      }
    } else {
      // Command failed
      toast.error(result.error?.message || 'Command execution failed');
    }
  }, []);

  const handleCommandError = useCallback((error: Error) => {
    toast.error(`Error: ${error.message}`);
  }, []);

  const handlePreviewApprove = useCallback(() => {
    setIsPreviewOpen(false);
    setPreview(null);
    toast.success('Changes applied successfully');
  }, []);

  const handlePreviewReject = useCallback(() => {
    setIsPreviewOpen(false);
    setPreview(null);
    toast.info('Changes rejected');
  }, []);

  const handlePreviewModify = useCallback(() => {
    // In a full implementation, this would allow the user to modify the command
    // and re-execute it. For now, we just close the preview.
    setIsPreviewOpen(false);
    toast.info('Please modify your command and try again');
  }, []);

  const handlePreviewClose = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  return (
    <div>
      <AICommandInput
        onCommandExecute={handleCommandExecute}
        onError={handleCommandError}
        placeholder="Enter a document editing command (e.g., 'Add a task list to this page')"
      />

      {preview && (
        <ChangePreviewDialog
          preview={preview}
          open={isPreviewOpen}
          onApprove={handlePreviewApprove}
          onReject={handlePreviewReject}
          onModify={handlePreviewModify}
          onClose={handlePreviewClose}
        />
      )}
    </div>
  );
};

/**
 * Example of integrating the command input into the existing chat panel
 *
 * This shows how to extend the EditorChatPanel with document editing capabilities.
 *
 * In packages/frontend/core/src/desktop/pages/workspace/detail-page/tabs/chat.tsx:
 *
 * ```tsx
 * import { AICommandInput } from '@affine/core/modules/ai-document-editor/ui';
 *
 * // Add to the EditorChatPanel component:
 * <div className={styles.commandInputContainer}>
 *   <AICommandInput
 *     onCommandExecute={handleCommandExecute}
 *     onError={handleCommandError}
 *   />
 * </div>
 * ```
 */
export const ChatPanelIntegrationExample = () => {
  // This is a placeholder to show the integration pattern
  // The actual integration would be done in the EditorChatPanel component
  return null;
};
