import { useService } from '@toeverything/infra';
import { useCallback, useEffect, useState } from 'react';

import { DatabaseReferenceService } from '../services/database-reference';
import type { DatabasePickerOpenEventDetail } from '../slash-commands/database-reference-command';
import { DatabasePickerModal } from './database-picker-modal';

/**
 * DatabasePickerContainer manages the database picker modal state
 *
 * This component:
 * - Listens for the 'affine:open-database-picker' custom event
 * - Opens the DatabasePickerModal when triggered
 * - Handles database reference insertion using DatabaseReferenceService
 * - Manages modal state and cleanup
 *
 * Requirements: 12.6, 12.7
 */
export const DatabasePickerContainer = () => {
  const databaseReferenceService = useService(DatabaseReferenceService);

  const [isOpen, setIsOpen] = useState(false);
  const [targetDocId, setTargetDocId] = useState<string | null>(null);
  const [insertPosition, setInsertPosition] = useState<{
    type: 'before' | 'after';
    referenceId: string;
  } | null>(null);

  // Listen for the custom event to open the picker
  useEffect(() => {
    const handleOpenPicker = (
      event: CustomEvent<DatabasePickerOpenEventDetail>
    ) => {
      const { insertPosition } = event.detail;

      // Get the current document ID from the block's store
      // The std object contains the store which has the document
      const std = event.detail.std;
      const docId = std?.store?.id;

      if (docId) {
        setTargetDocId(docId);
        setInsertPosition(insertPosition);
        setIsOpen(true);
      } else {
        console.error('Could not determine target document ID');
      }
    };

    // Add event listener to document
    document.addEventListener(
      'affine:open-database-picker',
      handleOpenPicker as EventListener
    );

    return () => {
      document.removeEventListener(
        'affine:open-database-picker',
        handleOpenPicker as EventListener
      );
    };
  }, []);

  // Handle modal close
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTargetDocId(null);
    setInsertPosition(null);
  }, []);

  // Handle database reference insertion
  const handleInsert = useCallback(
    (sourceDocId: string, sourceDatabaseId: string, viewId?: string) => {
      if (!targetDocId) {
        console.error('No target document ID set');
        return;
      }

      // Use void to handle the promise without blocking
      (async () => {
        try {
          // Use DatabaseReferenceService to create the reference
          await databaseReferenceService.createReference(
            targetDocId,
            sourceDocId,
            sourceDatabaseId,
            viewId,
            insertPosition
          );

          // Close the modal on success
          handleClose();
        } catch (error) {
          console.error('Failed to create database reference:', error);
          // The modal will remain open so the user can try again
        }
      })().catch(error => {
        console.error('Unexpected error in handleInsert:', error);
      });
    },
    [targetDocId, insertPosition, databaseReferenceService, handleClose]
  );

  // Don't render if no target document
  if (!targetDocId) {
    return null;
  }

  return (
    <DatabasePickerModal
      open={isOpen}
      onClose={handleClose}
      onInsert={handleInsert}
      targetDocId={targetDocId}
      insertPosition={insertPosition || undefined}
    />
  );
};

export default DatabasePickerContainer;
