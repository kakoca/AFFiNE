import type { DocumentOperation } from './types';

/**
 * Base error type for AI document editor errors
 */
abstract class BaseAIDocumentEditorError extends Error {
  abstract readonly type: AIDocumentEditorErrorType;
}

/**
 * Error types for AI document editor
 */
export enum AIDocumentEditorErrorType {
  DocumentEditError = 'DocumentEditError',
  DatabaseReferenceError = 'DatabaseReferenceError',
  CommandParseError = 'CommandParseError',
}

/**
 * Error thrown when a document edit operation fails
 */
export class DocumentEditError extends BaseAIDocumentEditorError {
  override readonly type = AIDocumentEditorErrorType.DocumentEditError;
  readonly docId: string;
  readonly operation: DocumentOperation;
  readonly cause?: Error;

  constructor(
    message: string,
    docId: string,
    operation: DocumentOperation,
    cause?: Error
  ) {
    super(message);
    this.docId = docId;
    this.operation = operation;
    this.cause = cause;
  }
}

/**
 * Error thrown when a database reference operation fails
 */
export class DatabaseReferenceError extends BaseAIDocumentEditorError {
  override readonly type = AIDocumentEditorErrorType.DatabaseReferenceError;
  readonly sourceId: string;
  readonly targetDocId: string;
  readonly cause?: Error;

  constructor(
    message: string,
    sourceId: string,
    targetDocId: string,
    cause?: Error
  ) {
    super(message);
    this.sourceId = sourceId;
    this.targetDocId = targetDocId;
    this.cause = cause;
  }
}

/**
 * Error thrown when command parsing fails
 */
export class CommandParseError extends BaseAIDocumentEditorError {
  override readonly type = AIDocumentEditorErrorType.CommandParseError;
  readonly command: string;
  readonly cause?: Error;

  constructor(message: string, command: string, cause?: Error) {
    super(message);
    this.command = command;
    this.cause = cause;
  }
}

/**
 * Union type of all AI document editor errors
 */
export type AIDocumentEditorError =
  | DocumentEditError
  | DatabaseReferenceError
  | CommandParseError;
