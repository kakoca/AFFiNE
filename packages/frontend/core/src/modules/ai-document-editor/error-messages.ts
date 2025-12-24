import type {
  AIDocumentEditorError,
  DocumentEditError,
  DatabaseReferenceError,
  CommandParseError,
} from './errors';
import { AIDocumentEditorErrorType } from './errors';

/**
 * User-friendly error message with actionable suggestions
 */
export interface UserFriendlyError {
  title: string;
  message: string;
  suggestions: string[];
  canRetry: boolean;
}

/**
 * Translate technical errors into user-friendly messages with actionable suggestions
 * 
 * Requirements: 8.2, 8.3, 8.4
 */
export class ErrorMessageTranslator {
  /**
   * Translate an AI document editor error into a user-friendly format
   * 
   * @param error - The error to translate
   * @returns User-friendly error information
   */
  static translate(error: Error): UserFriendlyError {
    // Check if it's an AI document editor error
    if ('type' in error && typeof (error as any).type === 'string') {
      const aiError = error as AIDocumentEditorError;
      
      switch (aiError.type) {
        case AIDocumentEditorErrorType.DocumentEditError:
          return this.translateDocumentEditError(aiError as DocumentEditError);
        
        case AIDocumentEditorErrorType.DatabaseReferenceError:
          return this.translateDatabaseReferenceError(aiError as DatabaseReferenceError);
        
        case AIDocumentEditorErrorType.CommandParseError:
          return this.translateCommandParseError(aiError as CommandParseError);
      }
    }
    
    // Fall back to generic error translation
    return this.translateGenericError(error);
  }

  /**
   * Translate a DocumentEditError into user-friendly format
   * 
   * Requirements: 8.2
   */
  private static translateDocumentEditError(error: DocumentEditError): UserFriendlyError {
    const { message, operation } = error;

    // Check for specific error patterns
    if (message.includes('No note block found')) {
      return {
        title: 'Document Structure Issue',
        message: 'The document does not have the required structure to add content.',
        suggestions: [
          'Try creating a new document',
          'Check if the document is properly initialized',
          'Contact support if the issue persists',
        ],
        canRetry: false,
      };
    }

    if (message.includes('transaction rolled back')) {
      return {
        title: 'Operation Failed',
        message: 'The operation could not be completed and has been safely rolled back.',
        suggestions: [
          'Try the operation again',
          'Check if the document is still accessible',
          'Ensure you have the necessary permissions',
        ],
        canRetry: true,
      };
    }

    if (message.includes('Database block not found')) {
      return {
        title: 'Database Not Found',
        message: 'The database you are trying to access could not be found.',
        suggestions: [
          'Check if the database still exists in the document',
          'Verify the database ID is correct',
          'Try refreshing the document',
        ],
        canRetry: false,
      };
    }

    if (message.includes('Block is not a database')) {
      return {
        title: 'Invalid Block Type',
        message: 'The block you are trying to access is not a database.',
        suggestions: [
          'Verify you are targeting the correct block',
          'Check the block type in the document',
        ],
        canRetry: false,
      };
    }

    // Generic document edit error
    return {
      title: 'Document Edit Failed',
      message: `Unable to edit the document: ${this.simplifyErrorMessage(message)}`,
      suggestions: [
        'Try the operation again',
        'Check if the document is accessible',
        'Ensure you have edit permissions',
      ],
      canRetry: true,
    };
  }

  /**
   * Translate a DatabaseReferenceError into user-friendly format
   * 
   * Requirements: 8.3
   */
  private static translateDatabaseReferenceError(error: DatabaseReferenceError): UserFriendlyError {
    const { message } = error;

    // Check for specific error patterns
    if (message.includes('Source database not found')) {
      return {
        title: 'Database Not Found',
        message: 'The database you are trying to reference does not exist.',
        suggestions: [
          'Check if the database still exists in the source document',
          'Verify the database ID is correct',
          'Try creating a new database instead',
        ],
        canRetry: false,
      };
    }

    if (message.includes('Source database no longer exists')) {
      return {
        title: 'Database No Longer Available',
        message: 'The database that was referenced has been deleted or moved.',
        suggestions: [
          'Remove the broken reference',
          'Create a new reference to a different database',
          'Check if the database was moved to another document',
        ],
        canRetry: false,
      };
    }

    if (message.includes('No note block found in target document')) {
      return {
        title: 'Document Structure Issue',
        message: 'The target document does not have the required structure to add a database reference.',
        suggestions: [
          'Try creating a new document',
          'Check if the target document is properly initialized',
        ],
        canRetry: false,
      };
    }

    if (message.includes('Reference block not found')) {
      return {
        title: 'Reference Not Found',
        message: 'The database reference you are trying to access could not be found.',
        suggestions: [
          'Check if the reference still exists in the document',
          'Try refreshing the document',
          'Create a new reference if needed',
        ],
        canRetry: false,
      };
    }

    // Generic database reference error
    return {
      title: 'Database Reference Failed',
      message: `Unable to create or access database reference: ${this.simplifyErrorMessage(message)}`,
      suggestions: [
        'Verify the source database exists',
        'Check if you have access to both documents',
        'Try creating the reference again',
      ],
      canRetry: true,
    };
  }

  /**
   * Translate a CommandParseError into user-friendly format
   */
  private static translateCommandParseError(error: CommandParseError): UserFriendlyError {
    const { message, command } = error;

    return {
      title: 'Command Not Understood',
      message: `I couldn't understand the command: "${command}"`,
      suggestions: [
        'Try rephrasing your command',
        'Use more specific instructions',
        'Check the command syntax',
        'Examples: "Add a paragraph", "Create a database", "Edit this section"',
      ],
      canRetry: true,
    };
  }

  /**
   * Translate a generic error into user-friendly format
   */
  private static translateGenericError(error: Error): UserFriendlyError {
    return {
      title: 'Operation Failed',
      message: this.simplifyErrorMessage(error.message),
      suggestions: [
        'Try the operation again',
        'Check your internet connection',
        'Contact support if the issue persists',
      ],
      canRetry: true,
    };
  }

  /**
   * Simplify technical error messages for end users
   * 
   * @param message - The technical error message
   * @returns A simplified, user-friendly message
   */
  private static simplifyErrorMessage(message: string): string {
    // Remove technical stack traces and internal details
    const simplified = message
      .split('\n')[0] // Take only the first line
      .replace(/Error: /g, '')
      .replace(/at .*/g, '')
      .trim();

    // Capitalize first letter
    return simplified.charAt(0).toUpperCase() + simplified.slice(1);
  }

  /**
   * Get suggestions for common error scenarios
   * 
   * Requirements: 8.2, 8.3, 8.4
   * 
   * @param errorType - The type of error
   * @returns Array of actionable suggestions
   */
  static getSuggestionsForErrorType(errorType: AIDocumentEditorErrorType): string[] {
    switch (errorType) {
      case AIDocumentEditorErrorType.DocumentEditError:
        return [
          'Ensure the document is accessible',
          'Check if you have edit permissions',
          'Try refreshing the document',
          'Verify the document structure is valid',
        ];

      case AIDocumentEditorErrorType.DatabaseReferenceError:
        return [
          'Verify the source database exists',
          'Check if the database was deleted or moved',
          'Ensure you have access to both documents',
          'Try creating a new reference',
        ];

      case AIDocumentEditorErrorType.CommandParseError:
        return [
          'Use clear, specific instructions',
          'Try rephrasing your command',
          'Break complex commands into smaller steps',
          'Check command syntax and examples',
        ];

      default:
        return [
          'Try the operation again',
          'Check your internet connection',
          'Contact support if the issue persists',
        ];
    }
  }

  /**
   * Format an error for display in the UI
   * 
   * @param error - The error to format
   * @returns Formatted error message for display
   */
  static formatForDisplay(error: Error): string {
    const friendly = this.translate(error);
    
    let formatted = `${friendly.title}\n\n${friendly.message}`;
    
    if (friendly.suggestions.length > 0) {
      formatted += '\n\nSuggestions:';
      friendly.suggestions.forEach((suggestion, index) => {
        formatted += `\n${index + 1}. ${suggestion}`;
      });
    }
    
    return formatted;
  }

  /**
   * Check if an error is retryable
   * 
   * @param error - The error to check
   * @returns True if the operation can be retried
   */
  static isRetryable(error: Error): boolean {
    const friendly = this.translate(error);
    return friendly.canRetry;
  }
}
