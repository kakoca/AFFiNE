import type { DatabaseBlockModel } from '@blocksuite/affine/model';

import type { DocsService } from '../../doc';

/**
 * Information about a database view
 */
export interface DatabaseViewInfo {
  id: string;
  name: string;
  type: 'table' | 'kanban' | 'gallery' | string;
}

/**
 * Information about a database block
 */
export interface DatabaseInfo {
  blockId: string;
  name: string;
  views: DatabaseViewInfo[];
}

/**
 * Information about a document containing databases
 */
export interface DocWithDatabases {
  docId: string;
  docTitle: string;
  databases: DatabaseInfo[];
}

/**
 * Cache entry for workspace database scan results
 */
interface CacheEntry {
  data: DocWithDatabases[];
  timestamp: number;
}

/**
 * Cache duration in milliseconds (30 seconds)
 */
const CACHE_DURATION = 30000;

/**
 * In-memory cache for workspace database scan results
 */
const scanCache = new Map<string, CacheEntry>();

/**
 * WorkspaceDatabaseScanner scans all documents in a workspace for databases
 *
 * This utility:
 * - Scans all docs in the workspace for database blocks
 * - Extracts database metadata (name, views, doc title)
 * - Caches results for performance
 *
 * Requirements: 12.3, 12.4
 */
export class WorkspaceDatabaseScanner {
  constructor(private readonly docsService: DocsService) {}

  /**
   * Scan all documents in the workspace for databases
   *
   * @param workspaceId - The workspace ID for cache key
   * @param forceRefresh - Force a fresh scan, ignoring cache
   * @returns Array of documents containing databases
   */
  async scanWorkspace(
    workspaceId: string,
    forceRefresh = false
  ): Promise<DocWithDatabases[]> {
    // Check cache first
    if (!forceRefresh) {
      const cached = scanCache.get(workspaceId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }

    const results: DocWithDatabases[] = [];

    // Get all doc records from the docs service
    const docRecords = this.docsService.list.docs$.value;

    for (const docRecord of docRecords) {
      const docId = docRecord.id;

      // Skip trash documents
      if (docRecord.trash$.value) {
        continue;
      }

      try {
        const databases = await this.scanDocForDatabases(docId);

        if (databases.length > 0) {
          // Get doc title
          const docTitle = docRecord.title$.value || 'Untitled';

          results.push({
            docId,
            docTitle,
            databases,
          });
        }
      } catch (error) {
        // Log error but continue scanning other docs
        console.warn(`Failed to scan doc ${docId} for databases:`, error);
      }
    }

    // Update cache
    scanCache.set(workspaceId, {
      data: results,
      timestamp: Date.now(),
    });

    return results;
  }

  /**
   * Scan a single document for database blocks
   *
   * @param docId - The document ID to scan
   * @returns Array of database info found in the document
   */
  async scanDocForDatabases(docId: string): Promise<DatabaseInfo[]> {
    const databases: DatabaseInfo[] = [];
    let release: (() => void) | null = null;

    try {
      const docRef = this.docsService.open(docId);
      release = docRef.release;

      // Wait for the document to be ready
      await docRef.doc.waitForSyncReady();

      const bsDoc = docRef.doc.blockSuiteDoc;

      // Find all database blocks
      const databaseBlocks = bsDoc.getBlocksByFlavour('affine:database');

      for (const block of databaseBlocks) {
        const dbModel = block.model as DatabaseBlockModel;

        // Extract database name from title or use default
        const name = this.extractDatabaseName(dbModel) || 'Untitled Database';

        // Extract view information
        const views = this.extractViews(dbModel);

        databases.push({
          blockId: block.id,
          name,
          views,
        });
      }
    } finally {
      if (release) {
        release();
      }
    }

    return databases;
  }

  /**
   * Extract the database name from the model
   */
  private extractDatabaseName(dbModel: DatabaseBlockModel): string {
    // Try to get title from props
    const props = dbModel.props as any;

    if (props?.title) {
      return String(props.title);
    }

    // Try to get from the first column header or other metadata
    if (props?.columns && Array.isArray(props.columns)) {
      // Use the database's implicit name if available
    }

    return 'Untitled Database';
  }

  /**
   * Extract view information from the database model
   */
  private extractViews(dbModel: DatabaseBlockModel): DatabaseViewInfo[] {
    const views: DatabaseViewInfo[] = [];
    const props = dbModel.props as any;

    if (props?.views && Array.isArray(props.views)) {
      for (const view of props.views) {
        views.push({
          id: view.id || '',
          name: view.name || this.getDefaultViewName(view.mode || view.type),
          type: view.mode || view.type || 'table',
        });
      }
    }

    // If no views found, add a default table view
    if (views.length === 0) {
      views.push({
        id: 'default',
        name: 'Table View',
        type: 'table',
      });
    }

    return views;
  }

  /**
   * Get a default view name based on view type
   */
  private getDefaultViewName(type: string): string {
    switch (type) {
      case 'table':
        return 'Table View';
      case 'kanban':
        return 'Kanban View';
      case 'gallery':
        return 'Gallery View';
      default:
        return `${type.charAt(0).toUpperCase() + type.slice(1)} View`;
    }
  }

  /**
   * Clear the cache for a specific workspace
   */
  clearCache(workspaceId: string): void {
    scanCache.delete(workspaceId);
  }

  /**
   * Clear all cached data
   */
  clearAllCache(): void {
    scanCache.clear();
  }

  /**
   * Search databases by name
   *
   * @param workspaceId - The workspace ID
   * @param searchTerm - The search term to filter by
   * @returns Filtered array of documents with matching databases
   */
  async searchDatabases(
    workspaceId: string,
    searchTerm: string
  ): Promise<DocWithDatabases[]> {
    const allDocs = await this.scanWorkspace(workspaceId);

    if (!searchTerm.trim()) {
      return allDocs;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();

    return allDocs
      .map(doc => {
        // Check if doc title matches
        const docTitleMatches = doc.docTitle
          .toLowerCase()
          .includes(lowerSearchTerm);

        // Filter databases that match the search term
        const matchingDatabases = doc.databases.filter(
          db =>
            db.name.toLowerCase().includes(lowerSearchTerm) ||
            db.views.some(v => v.name.toLowerCase().includes(lowerSearchTerm))
        );

        // Include doc if title matches or has matching databases
        if (docTitleMatches) {
          return doc; // Return all databases if doc title matches
        } else if (matchingDatabases.length > 0) {
          return {
            ...doc,
            databases: matchingDatabases,
          };
        }

        return null;
      })
      .filter((doc): doc is DocWithDatabases => doc !== null);
  }
}

/**
 * Create a workspace database scanner instance
 */
export function createWorkspaceDatabaseScanner(
  docsService: DocsService
): WorkspaceDatabaseScanner {
  return new WorkspaceDatabaseScanner(docsService);
}
