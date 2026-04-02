/**
 * Retry logic with exponential backoff for network errors
 *
 * Requirements: 8.5
 */

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts
   */
  maxAttempts: number;

  /**
   * Initial delay in milliseconds before first retry
   */
  initialDelay: number;

  /**
   * Maximum delay in milliseconds between retries
   */
  maxDelay: number;

  /**
   * Multiplier for exponential backoff
   */
  backoffMultiplier: number;

  /**
   * Function to determine if an error is retryable
   */
  isRetryable?: (error: Error) => boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  isRetryable: isNetworkError,
};

/**
 * Check if an error is a network error that should be retried
 *
 * @param error - The error to check
 * @returns True if the error is retryable
 */
export function isNetworkError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Check for common network error patterns
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('fetch') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('etimedout') ||
    message.includes('offline') ||
    error.name === 'NetworkError' ||
    error.name === 'TimeoutError'
  );
}

/**
 * Execute an operation with retry logic and exponential backoff
 *
 * This function will:
 * 1. Attempt to execute the operation
 * 2. If it fails with a retryable error, wait with exponential backoff
 * 3. Retry up to maxAttempts times
 * 4. Throw the last error if all attempts fail
 *
 * Requirements: 8.5
 *
 * @param operation - The async operation to execute
 * @param config - Retry configuration (optional)
 * @returns The result of the operation
 * @throws The last error if all retry attempts fail
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;
  let delay = finalConfig.initialDelay;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      const shouldRetry =
        attempt < finalConfig.maxAttempts &&
        (finalConfig.isRetryable?.(lastError) ?? true);

      if (!shouldRetry) {
        throw lastError;
      }

      // Wait before retrying with exponential backoff
      await sleep(delay);

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(
        delay * finalConfig.backoffMultiplier,
        finalConfig.maxDelay
      );

      console.warn(
        `Retry attempt ${attempt}/${finalConfig.maxAttempts} after ${delay}ms delay`,
        lastError
      );
    }
  }

  // All attempts failed, throw the last error
  throw lastError;
}

/**
 * Sleep for a specified duration
 *
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Operation queue for handling operations during network interruptions
 *
 * This queue will:
 * 1. Store operations when network is unavailable
 * 2. Automatically retry operations when network is restored
 * 3. Provide status updates for queued operations
 *
 * Requirements: 8.5
 */
export class OperationQueue {
  private queue: QueuedOperation[] = [];
  private isProcessing = false;
  private isOnline = true;

  constructor() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      this.isOnline = navigator.onLine;
    }
  }

  /**
   * Add an operation to the queue
   *
   * @param operation - The operation to queue
   * @param metadata - Optional metadata about the operation
   * @returns Promise that resolves when the operation completes
   */
  async enqueue<T>(
    operation: () => Promise<T>,
    metadata?: OperationMetadata
  ): Promise<T> {
    // If online, try to execute immediately
    if (this.isOnline) {
      try {
        return await withRetry(operation);
      } catch (error) {
        // If it's a network error, queue it
        if (isNetworkError(error as Error)) {
          return this.queueOperation(operation, metadata);
        }
        throw error;
      }
    }

    // If offline, queue the operation
    return this.queueOperation(operation, metadata);
  }

  /**
   * Queue an operation for later execution
   */
  private queueOperation<T>(
    operation: () => Promise<T>,
    metadata?: OperationMetadata
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedOp: QueuedOperation = {
        id: generateId(),
        operation,
        metadata,
        resolve,
        reject,
        attempts: 0,
        queuedAt: new Date(),
      };

      this.queue.push(queuedOp);
      console.log(`Operation queued: ${queuedOp.id}`, metadata);
    });
  }

  /**
   * Handle online event - process queued operations
   */
  private handleOnline() {
    console.log('Network connection restored, processing queued operations');
    this.isOnline = true;
    this.processQueue().catch((err: unknown) => {
      console.error('Error processing queue:', err);
    });
  }

  /**
   * Handle offline event
   */
  private handleOffline() {
    console.log('Network connection lost, operations will be queued');
    this.isOnline = false;
  }

  /**
   * Process all queued operations
   */
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && this.isOnline) {
      const queuedOp = this.queue[0];

      try {
        console.log(`Processing queued operation: ${queuedOp.id}`);
        const result = await withRetry(queuedOp.operation);
        queuedOp.resolve(result);
        this.queue.shift(); // Remove from queue
      } catch (error) {
        queuedOp.attempts++;

        // If it's still a network error and we haven't exceeded max attempts, keep in queue
        if (isNetworkError(error as Error) && queuedOp.attempts < 5) {
          console.warn(
            `Operation ${queuedOp.id} failed, will retry later (attempt ${queuedOp.attempts})`
          );
          // Move to end of queue
          this.queue.shift();
          this.queue.push(queuedOp);
        } else {
          // Max attempts reached or non-network error, reject
          console.error(`Operation ${queuedOp.id} failed permanently`, error);
          queuedOp.reject(error);
          this.queue.shift();
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get the current queue status
   */
  getStatus(): QueueStatus {
    return {
      isOnline: this.isOnline,
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      operations: this.queue.map(op => ({
        id: op.id,
        metadata: op.metadata,
        attempts: op.attempts,
        queuedAt: op.queuedAt,
      })),
    };
  }

  /**
   * Clear all queued operations
   */
  clear() {
    this.queue.forEach(op => {
      op.reject(new Error('Operation queue cleared'));
    });
    this.queue = [];
  }
}

/**
 * Queued operation
 */
interface QueuedOperation {
  id: string;
  operation: () => Promise<any>;
  metadata?: OperationMetadata;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  attempts: number;
  queuedAt: Date;
}

/**
 * Metadata about a queued operation
 */
export interface OperationMetadata {
  type: string;
  description: string;
  docId?: string;
  [key: string]: any;
}

/**
 * Queue status information
 */
export interface QueueStatus {
  isOnline: boolean;
  queueLength: number;
  isProcessing: boolean;
  operations: Array<{
    id: string;
    metadata?: OperationMetadata;
    attempts: number;
    queuedAt: Date;
  }>;
}

/**
 * Generate a unique ID for operations
 */
function generateId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Global operation queue instance
 */
export const globalOperationQueue = new OperationQueue();
