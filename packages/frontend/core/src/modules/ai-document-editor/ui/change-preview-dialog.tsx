import { Button, Modal, Scrollable } from '@affine/component';
import { useService } from '@toeverything/infra';
import { useCallback, useState } from 'react';

import { ChangePreviewService } from '../services/change-preview';
import type { ChangePreview, PreviewBlock } from '../types';
import * as styles from './change-preview-dialog.css';

export interface ChangePreviewDialogProps {
  preview: ChangePreview;
  open: boolean;
  onApprove: () => void;
  onReject: () => void;
  onModify?: () => void;
  onClose: () => void;
}

/**
 * ChangePreviewDialog displays a preview of proposed document changes
 *
 * Features:
 * - Display additions, modifications, and deletions
 * - Approve/reject/modify actions
 * - Integration with ChangePreviewService
 * - Visual diff display
 *
 * Requirements: 7.1, 7.2, 7.5, 11.7
 */
export const ChangePreviewDialog = ({
  preview,
  open,
  onApprove,
  onReject,
  onModify,
  onClose,
}: ChangePreviewDialogProps) => {
  const changePreviewService = useService(ChangePreviewService);
  const [isApplying, setIsApplying] = useState(false);

  const handleApprove = useCallback(async () => {
    setIsApplying(true);
    try {
      await changePreviewService.applyChanges(preview.docId, preview);
      onApprove();
    } catch (error) {
      console.error('Failed to apply changes:', error);
      // In a production app, we'd show a toast notification here
    } finally {
      setIsApplying(false);
    }
  }, [changePreviewService, preview, onApprove]);

  const handleReject = useCallback(async () => {
    await changePreviewService.discardPreview(preview.id);
    onReject();
  }, [changePreviewService, preview.id, onReject]);

  return (
    <Modal
      open={open}
      onOpenChange={open => {
        if (!open) {
          onClose();
        }
      }}
      contentOptions={{
        className: styles.container,
      }}
      title="Preview Changes"
      description="Review the proposed changes before applying them to your document"
    >
      <Scrollable.Root>
        <Scrollable.Viewport className={styles.viewport}>
          <div className={styles.content}>
            {/* Additions Section */}
            {preview.additions.length > 0 && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  Additions ({preview.additions.length})
                </h3>
                <div className={styles.blockList}>
                  {preview.additions.map((block, index) => (
                    <PreviewBlockItem
                      key={`addition-${index}`}
                      block={block}
                      type="addition"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Modifications Section */}
            {preview.modifications.length > 0 && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  Modifications ({preview.modifications.length})
                </h3>
                <div className={styles.blockList}>
                  {preview.modifications.map((block, index) => (
                    <PreviewBlockItem
                      key={`modification-${index}`}
                      block={block}
                      type="modification"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Deletions Section */}
            {preview.deletions.length > 0 && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  Deletions ({preview.deletions.length})
                </h3>
                <div className={styles.blockList}>
                  {preview.deletions.map((block, index) => (
                    <PreviewBlockItem
                      key={`deletion-${index}`}
                      block={block}
                      type="deletion"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No changes message */}
            {preview.additions.length === 0 &&
              preview.modifications.length === 0 &&
              preview.deletions.length === 0 && (
                <div className={styles.emptyState}>
                  <p>No changes to preview</p>
                </div>
              )}
          </div>
        </Scrollable.Viewport>
        <Scrollable.Scrollbar />
      </Scrollable.Root>

      {/* Action buttons */}
      <div className={styles.actions}>
        <Button
          onClick={() => {
            handleReject().catch((err: unknown) => {
              console.error('Error in handleReject:', err);
            });
          }}
          disabled={isApplying}
          variant="secondary"
          data-testid="preview-reject-button"
        >
          Reject
        </Button>
        {onModify && (
          <Button
            onClick={onModify}
            disabled={isApplying}
            variant="secondary"
            data-testid="preview-modify-button"
          >
            Modify
          </Button>
        )}
        <Button
          onClick={() => {
            handleApprove().catch((err: unknown) => {
              console.error('Error in handleApprove:', err);
            });
          }}
          disabled={isApplying}
          variant="primary"
          data-testid="preview-approve-button"
        >
          {isApplying ? 'Applying...' : 'Approve'}
        </Button>
      </div>
    </Modal>
  );
};

/**
 * PreviewBlockItem displays a single block change in the preview
 */
interface PreviewBlockItemProps {
  block: PreviewBlock;
  type: 'addition' | 'modification' | 'deletion';
}

const PreviewBlockItem = ({ block, type }: PreviewBlockItemProps) => {
  const getTypeClass = () => {
    switch (type) {
      case 'addition':
        return styles.blockAddition;
      case 'modification':
        return styles.blockModification;
      case 'deletion':
        return styles.blockDeletion;
      default:
        return '';
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'addition':
        return 'Added';
      case 'modification':
        return 'Modified';
      case 'deletion':
        return 'Deleted';
      default:
        return '';
    }
  };

  const renderBlockContent = (snapshot: any) => {
    if (!snapshot) return null;

    // Simple rendering of block content
    // In a production app, this would be more sophisticated
    return (
      <div className={styles.blockContent}>
        <div className={styles.blockFlavour}>{snapshot.flavour}</div>
        {snapshot.props && (
          <pre className={styles.blockProps}>
            {JSON.stringify(snapshot.props, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  return (
    <div className={`${styles.blockItem} ${getTypeClass()}`}>
      <div className={styles.blockHeader}>
        <span className={styles.blockType}>{getTypeLabel}</span>
        <span className={styles.blockId}>{block.blockId}</span>
      </div>

      {type === 'modification' && (
        <div className={styles.blockDiff}>
          <div className={styles.blockBefore}>
            <div className={styles.diffLabel}>Before:</div>
            {renderBlockContent(block.before)}
          </div>
          <div className={styles.blockAfter}>
            <div className={styles.diffLabel}>After:</div>
            {renderBlockContent(block.after)}
          </div>
        </div>
      )}

      {type === 'addition' && (
        <div className={styles.blockSingle}>
          {renderBlockContent(block.after)}
        </div>
      )}

      {type === 'deletion' && (
        <div className={styles.blockSingle}>
          {renderBlockContent(block.before)}
        </div>
      )}
    </div>
  );
};
