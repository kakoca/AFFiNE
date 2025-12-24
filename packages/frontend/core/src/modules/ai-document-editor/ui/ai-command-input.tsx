import { Input } from '@affine/component';
import { useService } from '@toeverything/infra';
import { useCallback, useState } from 'react';
import { AIDocumentEditorService } from '../services/ai-document-editor';
import type { CommandResult } from '../types';
import * as styles from './ai-command-input.css';

export interface AICommandInputProps {
  onCommandExecute?: (result: CommandResult) => void;
  onError?: (error: Error) => void;
  placeholder?: string;
  className?: string;
}

/**
 * AICommandInput component provides a text input for executing AI document editing commands
 * 
 * Features:
 * - Natural language command input
 * - Command suggestions and autocomplete (future enhancement)
 * - Integration with AIDocumentEditorService
 * - Error handling and user feedback
 * 
 * Requirements: 11.7
 */
export const AICommandInput = ({
  onCommandExecute,
  onError,
  placeholder = 'Enter a document editing command...',
  className,
}: AICommandInputProps) => {
  const aiDocumentEditorService = useService(AIDocumentEditorService);
  const [command, setCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!command.trim() || isExecuting) {
        return;
      }

      setIsExecuting(true);

      try {
        // Execute the command through the AI document editor service
        const result = await aiDocumentEditorService.executeCommand(command);

        // Notify parent component of the result
        if (onCommandExecute) {
          onCommandExecute(result);
        }

        // Clear the input on successful execution
        if (result.success) {
          setCommand('');
        } else if (result.error && onError) {
          onError(result.error);
        }
      } catch (error) {
        if (onError) {
          onError(error as Error);
        }
      } finally {
        setIsExecuting(false);
      }
    },
    [command, isExecuting, aiDocumentEditorService, onCommandExecute, onError]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Submit on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as any);
      }
    },
    [handleSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className={styles.inputContainer}>
        <Input
          value={command}
          onChange={setCommand}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isExecuting}
          className={styles.input}
          data-testid="ai-command-input"
        />
        <button
          type="submit"
          disabled={!command.trim() || isExecuting}
          className={styles.submitButton}
          data-testid="ai-command-submit"
        >
          {isExecuting ? 'Executing...' : 'Execute'}
        </button>
      </div>
    </form>
  );
};
