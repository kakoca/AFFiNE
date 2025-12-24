import { style } from '@vanilla-extract/css';

export const container = style({
  width: '800px',
  maxWidth: '90vw',
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
});

export const viewport = style({
  flex: 1,
  padding: '24px',
  overflow: 'auto',
});

export const content = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
});

export const section = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
});

export const sectionTitle = style({
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--affine-text-primary-color)',
  margin: 0,
});

export const blockList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
});

export const blockItem = style({
  border: '1px solid var(--affine-border-color)',
  borderRadius: '8px',
  padding: '12px',
  backgroundColor: 'var(--affine-background-secondary-color)',
});

export const blockAddition = style({
  borderLeft: '4px solid var(--affine-success-color)',
  backgroundColor: 'var(--affine-success-color-04)',
});

export const blockModification = style({
  borderLeft: '4px solid var(--affine-warning-color)',
  backgroundColor: 'var(--affine-warning-color-04)',
});

export const blockDeletion = style({
  borderLeft: '4px solid var(--affine-error-color)',
  backgroundColor: 'var(--affine-error-color-04)',
});

export const blockHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
});

export const blockType = style({
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
});

export const blockId = style({
  fontSize: '11px',
  color: 'var(--affine-text-secondary-color)',
  fontFamily: 'monospace',
});

export const blockDiff = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
});

export const blockBefore = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
});

export const blockAfter = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
});

export const blockSingle = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
});

export const diffLabel = style({
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--affine-text-secondary-color)',
});

export const blockContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '8px',
  backgroundColor: 'var(--affine-background-primary-color)',
  borderRadius: '4px',
});

export const blockFlavour = style({
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--affine-text-primary-color)',
  fontFamily: 'monospace',
});

export const blockProps = style({
  fontSize: '11px',
  color: 'var(--affine-text-secondary-color)',
  fontFamily: 'monospace',
  margin: 0,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  maxHeight: '200px',
  overflow: 'auto',
});

export const emptyState = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '48px',
  color: 'var(--affine-text-secondary-color)',
  fontSize: '14px',
});

export const actions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  padding: '16px 24px',
  borderTop: '1px solid var(--affine-border-color)',
});
