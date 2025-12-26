import { Service } from '@toeverything/infra';
import { combineLatest, map, Observable } from 'rxjs';

import type { DocsService } from '../../doc';
import type { WorkbenchService } from '../../workbench';
import type { DocumentContext } from '../types';
import { resolveRouteLinkMeta } from '../../navigation/utils';

/**
 * DocumentContextManager tracks the active document and enriches it with context information
 *
 * This service:
 * - Tracks the currently active document from the workbench
 * - Scans documents for database blocks
 * - Provides reactive updates when the active document changes
 * - Handles multiple open documents by using the focused editor
 */
export class DocumentContextManager extends Service {
  constructor(
    private readonly workbenchService: WorkbenchService,
    private readonly docsService: DocsService
  ) {
    super();
  }

  /**
   * Observable that emits the current document context whenever the active view changes
   */
  get activeDocumentContext$(): Observable<DocumentContext | null> {
    return combineLatest([
      this.workbenchService.workbench.activeView$,
      this.workbenchService.workbench.location$,
    ]).pipe(
      map(([activeView, location]: [any, any]) => {
        if (!activeView) {
          return null;
        }

        // Extract document ID from the location pathname
        const docId = this.extractDocIdFromLocation(location.pathname);
        if (!docId) {
          return null;
        }

        // Get document context with database information
        return this.getDocumentContext(docId);
      })
    );
  }

  /**
   * Get the current active document context synchronously
   * Returns null if no document is currently active
   */
  getActiveDocumentContext(): DocumentContext | null {
    const activeView = this.workbenchService.workbench.activeView$.value;
    if (!activeView) {
      return null;
    }

    const location = activeView.location$.value;
    const docId = this.extractDocIdFromLocation(location.pathname);
    if (!docId) {
      return null;
    }

    return this.getDocumentContext(docId);
  }

  /**
   * Get document context for a specific document ID
   * Includes database information by scanning for affine:database blocks
   */
  private getDocumentContext(docId: string): DocumentContext | null {
    try {
      // Check if document exists
      const docRecord = this.docsService.list.doc$(docId).value;
      if (!docRecord) {
        return null;
      }

      // Try to get the document if it's already loaded
      const loaded = this.docsService.loaded(docId);
      if (!loaded) {
        // Document not loaded yet, return basic context without database info
        return {
          docId,
          databases: [],
        };
      }

      const { doc, release } = loaded;
      try {
        // Scan for database blocks
        const databases = this.scanForDatabases(doc.blockSuiteDoc);

        return {
          docId,
          databases,
        };
      } finally {
        release();
      }
    } catch (error) {
      console.error('Failed to get document context:', error);
      return null;
    }
  }

  /**
   * Extract document ID from a location pathname
   * Handles the URL pattern: /workspace/{workspaceId}/{docId}
   */
  private extractDocIdFromLocation(pathname: string): string | null {
    // Use the existing route resolution utility
    const fullUrl = `http://localhost${pathname}`;
    const meta = resolveRouteLinkMeta(fullUrl);

    if (meta && 'docId' in meta) {
      return meta.docId ?? null;
    }

    return null;
  }

  /**
   * Scan a BlockSuite document for database blocks and extract their information
   */
  private scanForDatabases(blockSuiteDoc: any): Array<{
    blockId: string;
    name: string;
    views: Array<{
      id: string;
      name: string;
      type: 'table' | 'kanban' | 'gallery';
    }>;
  }> {
    const databases: Array<{
      blockId: string;
      name: string;
      views: Array<{
        id: string;
        name: string;
        type: 'table' | 'kanban' | 'gallery';
      }>;
    }> = [];

    try {
      // Get all database blocks
      const databaseBlocks =
        blockSuiteDoc.getBlocksByFlavour('affine:database');

      for (const block of databaseBlocks) {
        const model = block.model;
        const blockId = block.id;

        // Extract database name (title)
        const name = model.title?.toString() || 'Untitled Database';

        // Extract views information
        const views: Array<{
          id: string;
          name: string;
          type: 'table' | 'kanban' | 'gallery';
        }> = [];

        // Access views from the model
        if (model.views && Array.isArray(model.views)) {
          for (const view of model.views) {
            views.push({
              id: view.id,
              name: view.name || 'Untitled View',
              type: view.mode as 'table' | 'kanban' | 'gallery',
            });
          }
        }

        databases.push({
          blockId,
          name,
          views,
        });
      }
    } catch (error) {
      console.error('Failed to scan for databases:', error);
    }

    return databases;
  }
}
