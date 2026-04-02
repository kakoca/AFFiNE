import { Button, Input, Loading, Modal, Scrollable } from '@affine/component';
import { useService } from '@toeverything/infra';
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DocsService } from '../../doc';
import { WorkspaceService } from '../../workspace';
import type {
  DatabaseInfo,
  DocWithDatabases,
} from '../utils/workspace-database-scanner';
import { createWorkspaceDatabaseScanner } from '../utils/workspace-database-scanner';
import * as styles from './database-picker-modal.css';

/**
 * Props for the DatabasePickerModal component
 */
export interface DatabasePickerModalProps {
  open: boolean;
  onClose: () => void;
  onInsert: (
    sourceDocId: string,
    sourceDatabaseId: string,
    viewId?: string
  ) => void;
  targetDocId: string;
  insertPosition?: {
    type: 'before' | 'after';
    referenceId: string;
  };
}

/**
 * Selected database state
 */
interface SelectedDatabase {
  docId: string;
  databaseId: string;
  viewId?: string;
}

/**
 * DatabasePickerModal allows users to select a database from the workspace
 *
 * Features:
 * - Searchable list of pages with databases
 * - Group databases by source document
 * - Show database name and available view types
 * - View selector dropdown (optional)
 * - Cancel and Insert buttons
 *
 * Requirements: 12.2, 12.3, 12.4, 12.5
 */
export const DatabasePickerModal = ({
  open,
  onClose,
  onInsert,
}: DatabasePickerModalProps) => {
  const docsService = useService(DocsService);
  const workspaceService = useService(WorkspaceService);

  const [searchTerm, setSearchTerm] = useState('');
  const [docsWithDatabases, setDocsWithDatabases] = useState<
    DocWithDatabases[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDatabase, setSelectedDatabase] =
    useState<SelectedDatabase | null>(null);
  const [isInserting, setIsInserting] = useState(false);

  // Create scanner instance
  const scanner = useMemo(
    () => createWorkspaceDatabaseScanner(docsService),
    [docsService]
  );

  // Load databases when modal opens
  useEffect(() => {
    if (!open) {
      return;
    }

    const loadDatabases = async () => {
      setIsLoading(true);
      try {
        const workspaceId = workspaceService.workspace.id;
        const results = await scanner.scanWorkspace(workspaceId);
        setDocsWithDatabases(results);
      } catch (error) {
        console.error('Failed to scan workspace for databases:', error);
        setDocsWithDatabases([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDatabases().catch(error => {
      console.error('Unexpected error loading databases:', error);
    });
  }, [open, scanner, workspaceService.workspace.id]);

  // Filter databases based on search term
  const filteredDocs = useMemo(() => {
    if (!searchTerm.trim()) {
      return docsWithDatabases;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();

    return docsWithDatabases
      .map(doc => {
        const docTitleMatches = doc.docTitle
          .toLowerCase()
          .includes(lowerSearchTerm);

        const matchingDatabases = doc.databases.filter(
          db =>
            db.name.toLowerCase().includes(lowerSearchTerm) ||
            db.views.some(v => v.name.toLowerCase().includes(lowerSearchTerm))
        );

        if (docTitleMatches) {
          return doc;
        } else if (matchingDatabases.length > 0) {
          return { ...doc, databases: matchingDatabases };
        }

        return null;
      })
      .filter((doc): doc is DocWithDatabases => doc !== null);
  }, [docsWithDatabases, searchTerm]);

  // Handle database selection
  const handleSelectDatabase = useCallback(
    (docId: string, databaseId: string, viewId?: string) => {
      setSelectedDatabase({ docId, databaseId, viewId });
    },
    []
  );

  // Handle view selection for a database
  const handleSelectView = useCallback(
    (docId: string, databaseId: string, viewId: string) => {
      setSelectedDatabase({ docId, databaseId, viewId });
    },
    []
  );

  // Handle insert button click
  const handleInsert = useCallback(() => {
    if (!selectedDatabase) {
      return;
    }

    setIsInserting(true);
    try {
      onInsert(
        selectedDatabase.docId,
        selectedDatabase.databaseId,
        selectedDatabase.viewId
      );
      onClose();
    } catch (error) {
      console.error('Failed to insert database reference:', error);
    } finally {
      setIsInserting(false);
    }
  }, [selectedDatabase, onInsert, onClose]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setSelectedDatabase(null);
    setSearchTerm('');
    onClose();
  }, [onClose]);

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCancel();
      } else if (event.key === 'Enter' && selectedDatabase) {
        handleInsert();
      }
    },
    [handleCancel, handleInsert, selectedDatabase]
  );

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedDatabase(null);
      setSearchTerm('');
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) {
          handleCancel();
        }
      }}
      contentOptions={{
        className: styles.container,
        onKeyDown: handleKeyDown,
      }}
      withoutCloseButton
    >
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Insert Database Reference</h2>
        <p className={styles.description}>
          Select a database from your workspace to insert as a reference
        </p>
      </div>

      {/* Search */}
      <div className={styles.searchContainer}>
        <Input
          className={styles.searchInput}
          placeholder="Search databases..."
          value={searchTerm}
          onChange={setSearchTerm}
          autoFocus
          data-testid="database-picker-search"
        />
      </div>

      {/* Content */}
      <Scrollable.Root>
        <Scrollable.Viewport className={styles.content}>
          {isLoading ? (
            <div className={styles.loadingContainer}>
              <Loading />
            </div>
          ) : filteredDocs.length === 0 ? (
            <EmptyState searchTerm={searchTerm} />
          ) : (
            filteredDocs.map(doc => (
              <DocDatabaseGroup
                key={doc.docId}
                doc={doc}
                selectedDatabase={selectedDatabase}
                onSelectDatabase={handleSelectDatabase}
                onSelectView={handleSelectView}
              />
            ))
          )}
        </Scrollable.Viewport>
        <Scrollable.Scrollbar />
      </Scrollable.Root>

      {/* Footer */}
      <div className={styles.footer}>
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={isInserting}
          data-testid="database-picker-cancel"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleInsert}
          disabled={!selectedDatabase || isInserting}
          data-testid="database-picker-insert"
        >
          {isInserting ? 'Inserting...' : 'Insert'}
        </Button>
      </div>
    </Modal>
  );
};

/**
 * Empty state component
 */
const EmptyState = ({ searchTerm }: { searchTerm: string }) => (
  <div className={styles.emptyState}>
    <div className={styles.emptyIcon}>📊</div>
    <div className={styles.emptyText}>
      {searchTerm ? (
        <>
          No databases found matching "<strong>{searchTerm}</strong>"
        </>
      ) : (
        <>No databases found in your workspace</>
      )}
    </div>
  </div>
);

/**
 * Document group with its databases
 */
interface DocDatabaseGroupProps {
  doc: DocWithDatabases;
  selectedDatabase: SelectedDatabase | null;
  onSelectDatabase: (
    docId: string,
    databaseId: string,
    viewId?: string
  ) => void;
  onSelectView: (docId: string, databaseId: string, viewId: string) => void;
}

const DocDatabaseGroup = ({
  doc,
  selectedDatabase,
  onSelectDatabase,
  onSelectView,
}: DocDatabaseGroupProps) => {
  return (
    <div className={styles.docGroup}>
      <div className={styles.docHeader}>
        <span className={styles.docIcon}>📄</span>
        <span className={styles.docTitle}>{doc.docTitle}</span>
      </div>
      <div className={styles.databaseList}>
        {doc.databases.map(database => (
          <DatabaseItem
            key={database.blockId}
            docId={doc.docId}
            database={database}
            isSelected={
              selectedDatabase?.docId === doc.docId &&
              selectedDatabase?.databaseId === database.blockId
            }
            selectedViewId={
              selectedDatabase?.docId === doc.docId &&
              selectedDatabase?.databaseId === database.blockId
                ? selectedDatabase.viewId
                : undefined
            }
            onSelect={onSelectDatabase}
            onSelectView={onSelectView}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Individual database item
 */
interface DatabaseItemProps {
  docId: string;
  database: DatabaseInfo;
  isSelected: boolean;
  selectedViewId?: string;
  onSelect: (docId: string, databaseId: string, viewId?: string) => void;
  onSelectView: (docId: string, databaseId: string, viewId: string) => void;
}

const DatabaseItem = ({
  docId,
  database,
  isSelected,
  selectedViewId,
  onSelect,
  onSelectView,
}: DatabaseItemProps) => {
  const [showViewSelector, setShowViewSelector] = useState(false);

  const handleClick = useCallback(() => {
    // Select with the first view by default
    const defaultViewId =
      database.views.length > 0 ? database.views[0].id : undefined;
    onSelect(docId, database.blockId, defaultViewId);
  }, [docId, database.blockId, database.views, onSelect]);

  const handleViewClick = useCallback(
    (e: React.MouseEvent, viewId: string) => {
      e.stopPropagation();
      onSelectView(docId, database.blockId, viewId);
      setShowViewSelector(false);
    },
    [docId, database.blockId, onSelectView]
  );

  const toggleViewSelector = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowViewSelector(prev => !prev);
  }, []);

  const getViewIcon = (type: string) => {
    switch (type) {
      case 'table':
        return '📋';
      case 'kanban':
        return '📊';
      case 'gallery':
        return '🖼️';
      default:
        return '📋';
    }
  };

  const selectedView = database.views.find(v => v.id === selectedViewId);

  return (
    <div
      className={`${styles.databaseItem} ${isSelected ? styles.databaseItemSelected : ''}`}
      onClick={handleClick}
      data-testid={`database-item-${database.blockId}`}
    >
      <span className={styles.databaseIcon}>📊</span>
      <div className={styles.databaseInfo}>
        <span className={styles.databaseName}>{database.name}</span>
        <div className={styles.databaseMeta}>
          {database.views.map(view => (
            <span key={view.id} className={styles.viewBadge}>
              {getViewIcon(view.type)} {view.name}
            </span>
          ))}
        </div>
      </div>

      {/* View selector for databases with multiple views */}
      {isSelected && database.views.length > 1 && (
        <div className={styles.viewSelector}>
          <button
            className={styles.viewSelectorButton}
            onClick={toggleViewSelector}
            data-testid="view-selector-button"
          >
            {selectedView
              ? `${getViewIcon(selectedView.type)} ${selectedView.name}`
              : 'Select View'}
            <span>▼</span>
          </button>

          {showViewSelector && (
            <div className={styles.viewSelectorDropdown}>
              {database.views.map(view => (
                <div
                  key={view.id}
                  className={`${styles.viewOption} ${view.id === selectedViewId ? styles.viewOptionSelected : ''}`}
                  onClick={e => handleViewClick(e, view.id)}
                  data-testid={`view-option-${view.id}`}
                >
                  {getViewIcon(view.type)} {view.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DatabasePickerModal;
