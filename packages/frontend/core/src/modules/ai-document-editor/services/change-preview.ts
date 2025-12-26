import { Service } from '@toeverything/infra';
import type { BlockSnapshot } from '@blocksuite/store';
import { nanoid } from 'nanoid';

import type { DocsService } from '../../doc';
import type {
  ChangePreview,
  DocumentOperation,
  EditOperation,
  InsertOperation,
  DeleteOperation,
  PreviewBlock,
} from '../types';
import { DocumentEditError } from '../errors';

/**
 * ChangePreviewService handles preview generation and application of document changes
 *
 * This service:
 * - Generates previews by cloning document state and applying operations
 * - Tracks before/after states for each affected block
 * - Applies approved changes using transactions for atomicity
 * - Discards previews without affecting the original document
 *
 * Requirements: 7.3, 7.4
 */
export class ChangePreviewService extends Service {
  private previews = new Map<string, ChangePreview>();

  constructor(private readonly docsService: DocsService) {
    super();
  }

  /**
   * Generate a preview of proposed document changes
   *
   * This method:
   * 1. Opens the target document
   * 2. Captures the current state of blocks that will be affected
   * 3. Simulates applying the operations to determine the after state
   * 4. Categorizes changes into additions, modifications, and deletions
   * 5. Stores the preview for later application or discard
   *
   * @param docId - The document ID to preview changes for
   * @param operations - The operations to preview
   * @returns A ChangePreview object containing before/after states
   */
  async generatePreview(
    docId: string,
    operations: DocumentOperation[]
  ): Promise<ChangePreview> {
    let release: (() => void) | null = null;

    try {
      const docRef = this.docsService.open(docId);
      release = docRef.release;
      const doc = docRef.doc;

      await doc.waitForSyncReady();
      const bsDoc = doc.blockSuiteDoc;

      const additions: PreviewBlock[] = [];
      const modifications: PreviewBlock[] = [];
      const deletions: PreviewBlock[] = [];

      // Process each operation to determine its effect
      for (const operation of operations) {
        switch (operation.type) {
          case 'edit': {
            const editOp = operation as EditOperation;
            const block = bsDoc.getBlock(editOp.blockId);
            if (block) {
              // Capture before state
              const before = block.model.toSnapshot();

              // Simulate the change to get after state
              const after = this.simulateEdit(before, editOp.changes);

              modifications.push({
                blockId: editOp.blockId,
                before,
                after,
              });
            }
            break;
          }

          case 'insert': {
            const insertOp = operation as InsertOperation;
            // For insertions, we only have an after state
            const after = this.createBlockSnapshot(insertOp);

            additions.push({
              blockId: nanoid(), // Generate temporary ID for preview
              after,
            });
            break;
          }

          case 'delete': {
            const deleteOp = operation as DeleteOperation;
            const block = bsDoc.getBlock(deleteOp.blockId);
            if (block) {
              // Capture before state, no after state
              const before = block.model.toSnapshot();

              deletions.push({
                blockId: deleteOp.blockId,
                before,
              });
            }
            break;
          }

          case 'database': {
            // Database operations are handled similarly to edits
            // For now, we'll treat them as modifications
            // In a full implementation, we'd need to handle each database action type
            break;
          }
        }
      }

      const preview: ChangePreview = {
        id: nanoid(),
        docId,
        operations,
        additions,
        modifications,
        deletions,
        createdAt: new Date(),
      };

      // Store the preview for later use
      this.previews.set(preview.id, preview);

      return preview;
    } catch (error) {
      throw new DocumentEditError(
        `Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`,
        docId,
        operations[0] || { type: 'edit', blockId: '', changes: {} },
        error as Error
      );
    } finally {
      // Always call release() in finally block (Requirement 11.8)
      if (release) {
        release();
      }
    }
  }

  /**
   * Apply approved changes to the document
   *
   * This method uses BlockSuite transactions to ensure atomicity.
   * If any operation fails, the entire transaction is rolled back.
   *
   * Requirements: 7.3, 8.1
   *
   * @param docId - The document ID to apply changes to
   * @param preview - The preview containing the operations to apply
   */
  async applyChanges(docId: string, preview: ChangePreview): Promise<void> {
    if (preview.docId !== docId) {
      throw new DocumentEditError(
        'Preview document ID does not match target document ID',
        docId,
        preview.operations[0]
      );
    }

    let release: (() => void) | null = null;

    try {
      const docRef = this.docsService.open(docId);
      release = docRef.release;
      const doc = docRef.doc;

      await doc.waitForSyncReady();
      const bsDoc = doc.blockSuiteDoc;

      // Use a transaction to ensure atomicity (Requirement 8.1)
      // Transaction will automatically roll back on error
      try {
        bsDoc.transact(() => {
          for (const operation of preview.operations) {
            this.applyOperation(bsDoc, operation);
          }
        });
      } catch (transactionError) {
        // Transaction automatically rolls back on error (Requirement 8.1)
        throw new DocumentEditError(
          'Failed to apply changes - transaction rolled back',
          docId,
          preview.operations[0],
          transactionError as Error
        );
      }

      // Remove the preview after successful application
      this.previews.delete(preview.id);
    } catch (error) {
      if (error instanceof DocumentEditError) {
        throw error;
      }
      throw new DocumentEditError(
        `Failed to apply changes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        docId,
        preview.operations[0],
        error as Error
      );
    } finally {
      // Always call release() in finally block (Requirement 11.8)
      if (release) {
        release();
      }
    }
  }

  /**
   * Discard a preview without applying changes
   *
   * This simply removes the preview from storage.
   * The original document remains unchanged.
   *
   * Requirements: 7.4
   *
   * @param previewId - The ID of the preview to discard
   */
  async discardPreview(previewId: string): Promise<void> {
    this.previews.delete(previewId);
  }

  /**
   * Get a stored preview by ID
   *
   * @param previewId - The ID of the preview to retrieve
   * @returns The preview, or undefined if not found
   */
  getPreview(previewId: string): ChangePreview | undefined {
    return this.previews.get(previewId);
  }

  /**
   * Simulate an edit operation on a block snapshot
   *
   * @param snapshot - The original block snapshot
   * @param changes - The changes to apply
   * @returns A new snapshot with the changes applied
   */
  private simulateEdit(
    snapshot: BlockSnapshot,
    changes: Record<string, any>
  ): BlockSnapshot {
    // Create a shallow copy of the snapshot
    const simulated = { ...snapshot };

    // Apply changes to the props
    simulated.props = {
      ...snapshot.props,
      ...changes,
    };

    return simulated;
  }

  /**
   * Create a block snapshot from an insert operation
   *
   * @param operation - The insert operation
   * @returns A block snapshot representing the new block
   */
  private createBlockSnapshot(operation: InsertOperation): BlockSnapshot {
    return {
      type: 'block',
      id: nanoid(), // Temporary ID for preview
      flavour: operation.blockType,
      props: operation.content,
      children: [],
    };
  }

  /**
   * Apply a single operation to a BlockSuite document
   *
   * This is called within a transaction context.
   *
   * @param bsDoc - The BlockSuite document
   * @param operation - The operation to apply
   */
  private applyOperation(bsDoc: any, operation: DocumentOperation): void {
    switch (operation.type) {
      case 'edit': {
        const editOp = operation as EditOperation;
        const block = bsDoc.getBlock(editOp.blockId);
        if (block) {
          // Update block properties
          for (const [key, value] of Object.entries(editOp.changes)) {
            block.model[key] = value;
          }
        }
        break;
      }

      case 'insert': {
        const insertOp = operation as InsertOperation;
        bsDoc.addBlock(
          insertOp.blockType as any,
          insertOp.content,
          insertOp.parentId,
          insertOp.position
        );
        break;
      }

      case 'delete': {
        const deleteOp = operation as DeleteOperation;
        const block = bsDoc.getBlock(deleteOp.blockId);
        if (block) {
          bsDoc.deleteBlock(block.model);
        }
        break;
      }

      case 'database': {
        // Database operations would be handled here
        // This would require access to DatabaseBlockDataSource
        // For now, we'll leave this as a placeholder
        break;
      }
    }
  }
}
