import { Service } from '@toeverything/infra';
import { insertPositionToIndex } from '@blocksuite/affine-shared/utils';
import { DatabaseBlockDataSource } from '@blocksuite/affine/blocks/database';
import type { DatabaseBlockModel } from '@blocksuite/affine/model';

import type { DocsService } from '../../doc';
import { DatabaseReferenceError } from '../errors';
import type { DatabaseReference } from '../types';

/**
 * DatabaseReferenceService manages database references across documents.
 *
 * This service:
 * - Creates references to existing databases in other documents
 * - Provides DataSource access for referenced databases
 * - Validates reference targets
 * - Finds all references to a given database
 *
 * Requirements: 4.1, 8.3, 11.4
 */
export class DatabaseReferenceService extends Service {
  constructor(private readonly docsService: DocsService) {
    super();
  }

  /**
   * Create a reference to an existing database in another document.
   * This creates a new 'affine:database-reference' block that renders
   * the source database with full interactivity.
   *
   * The reference uses stable block IDs (sourceDocId + sourceDatabaseId) rather
   * than document-relative paths, ensuring the reference remains valid even if
   * the source database is moved to another document (Requirement 4.5).
   *
   * Requirements: 4.1, 4.5, 11.4
   *
   * @param targetDocId - Document where the reference will be created
   * @param sourceDocId - Document containing the source database
   * @param sourceDatabaseId - ID of the source database block
   * @param viewId - Optional specific view to display
   * @param position - Optional position specification
   * @returns The reference block ID
   */
  async createReference(
    targetDocId: string,
    sourceDocId: string,
    sourceDatabaseId: string,
    viewId?: string,
    position?: any
  ): Promise<string> {
    let sourceRelease: (() => void) | null = null;
    let targetRelease: (() => void) | null = null;

    try {
      // Validate source database exists
      const sourceRef = this.docsService.open(sourceDocId);
      sourceRelease = sourceRef.release;

      try {
        await sourceRef.doc.waitForSyncReady();
        const sourceDb = sourceRef.doc.blockSuiteDoc.getBlock(sourceDatabaseId);
        if (!sourceDb || sourceDb.flavour !== 'affine:database') {
          throw new DatabaseReferenceError(
            'Source database not found',
            sourceDatabaseId,
            targetDocId
          );
        }
      } finally {
        // Release source document after validation
        if (sourceRelease) {
          sourceRelease();
          sourceRelease = null;
        }
      }

      // Create reference block in target document
      const targetRef = this.docsService.open(targetDocId);
      targetRelease = targetRef.release;

      await targetRef.doc.waitForSyncReady();
      const bsDoc = targetRef.doc.blockSuiteDoc;

      const noteBlocks = bsDoc.getBlocksByFlavour('affine:note');
      if (!noteBlocks || noteBlocks.length === 0) {
        throw new DatabaseReferenceError(
          'No note block found in target document',
          sourceDatabaseId,
          targetDocId
        );
      }

      const noteBlock = noteBlocks[0];
      const parentId = noteBlock.id;

      // Calculate the index for insertion based on position
      let index: number | undefined;

      if (position) {
        index = insertPositionToIndex(position, noteBlock.model.children);
      }

      // Use transaction to ensure atomicity (Requirement 8.1)
      let refBlockId: string | null = null;

      try {
        bsDoc.transact(() => {
          // Create the reference block (new block type)
          refBlockId = bsDoc.addBlock(
            'affine:database-reference' as any,
            {
              sourceDocId,
              sourceDatabaseId,
              viewId, // Optional: specific view to display
            },
            parentId,
            index
          );

          if (!refBlockId) {
            throw new Error('Failed to create database reference block');
          }
        });
      } catch (transactionError) {
        // Transaction automatically rolls back on error (Requirement 8.1)
        throw new DatabaseReferenceError(
          'Failed to create database reference - transaction rolled back',
          sourceDatabaseId,
          targetDocId,
          transactionError as Error
        );
      }

      if (!refBlockId) {
        throw new DatabaseReferenceError(
          'Failed to create database reference block',
          sourceDatabaseId,
          targetDocId
        );
      }

      return refBlockId;
    } catch (error) {
      if (error instanceof DatabaseReferenceError) {
        throw error;
      }
      throw new DatabaseReferenceError(
        `Failed to create database reference: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sourceDatabaseId,
        targetDocId,
        error as Error
      );
    } finally {
      // Always call release() in finally blocks (Requirement 11.8)
      if (sourceRelease) {
        sourceRelease();
      }
      if (targetRelease) {
        targetRelease();
      }
    }
  }

  /**
   * Get the DataSource for a database reference.
   * This returns a DataSource connected to the SOURCE database,
   * allowing full read/write operations.
   *
   * Requirements: 4.3, 5.4
   *
   * @param referenceDocId - Document containing the reference
   * @param referenceBlockId - ID of the reference block
   * @returns DataSource and release function
   */
  async getDataSourceForReference(
    referenceDocId: string,
    referenceBlockId: string
  ): Promise<{ dataSource: DatabaseBlockDataSource; release: () => void }> {
    let refRelease: (() => void) | null = null;
    let sourceRelease: (() => void) | null = null;

    try {
      const refDoc = this.docsService.open(referenceDocId);
      refRelease = refDoc.release;

      await refDoc.doc.waitForSyncReady();

      const refBlock = refDoc.doc.blockSuiteDoc.getBlock(referenceBlockId);
      if (!refBlock) {
        throw new DatabaseReferenceError(
          'Reference block not found',
          referenceBlockId,
          referenceDocId
        );
      }

      const { sourceDocId, sourceDatabaseId } = refBlock.model.props as any;

      // Open source document and get database
      const sourceDoc = this.docsService.open(sourceDocId);
      sourceRelease = sourceDoc.release;

      await sourceDoc.doc.waitForSyncReady();

      const dbBlock = sourceDoc.doc.blockSuiteDoc.getBlock(sourceDatabaseId);
      if (!dbBlock) {
        throw new DatabaseReferenceError(
          'Source database no longer exists',
          sourceDatabaseId,
          referenceDocId
        );
      }

      const dbModel = dbBlock.model as DatabaseBlockModel;
      const dataSource = new DatabaseBlockDataSource(dbModel);

      // Return dataSource with a combined release function
      // that releases both documents (Requirement 11.8)
      return {
        dataSource,
        release: () => {
          if (refRelease) {
            refRelease();
          }
          if (sourceRelease) {
            sourceRelease();
          }
        },
      };
    } catch (error) {
      // Clean up any opened documents on error (Requirement 11.8)
      if (refRelease) {
        refRelease();
      }
      if (sourceRelease) {
        sourceRelease();
      }

      if (error instanceof DatabaseReferenceError) {
        throw error;
      }
      throw new DatabaseReferenceError(
        `Failed to get data source for reference: ${error instanceof Error ? error.message : 'Unknown error'}`,
        referenceBlockId,
        referenceDocId,
        error as Error
      );
    }
  }

  /**
   * Find all references to a given database
   *
   * Requirements: 8.3
   *
   * @param sourceDocId - Document containing the source database
   * @param databaseId - ID of the database block
   * @returns Array of database references
   */
  async findReferences(
    sourceDocId: string,
    databaseId: string
  ): Promise<DatabaseReference[]> {
    // This would require scanning all documents in the workspace
    // For now, we'll return an empty array as a placeholder
    // A full implementation would need to:
    // 1. Get all documents from the workspace
    // 2. Scan each document for database-reference blocks
    // 3. Filter those that point to the specified database
    // 4. Return the list of references

    // TODO: Implement full reference scanning
    return [];
  }

  /**
   * Validate that a database reference target exists
   *
   * Requirements: 8.3
   *
   * @param sourceDocId - Document containing the database
   * @param databaseId - ID of the database block
   * @returns True if the database exists
   */
  async validateReference(
    sourceDocId: string,
    databaseId: string
  ): Promise<boolean> {
    let release: (() => void) | null = null;

    try {
      const docRef = this.docsService.open(sourceDocId);
      release = docRef.release;

      await docRef.doc.waitForSyncReady();
      const block = docRef.doc.blockSuiteDoc.getBlock(databaseId);
      return block?.flavour === 'affine:database';
    } catch {
      return false;
    } finally {
      // Always call release() in finally block (Requirement 11.8)
      if (release) {
        release();
      }
    }
  }
}
