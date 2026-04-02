import { style } from '@vanilla-extract/css';

/**
 * CSS styles for DatabasePickerModal
 *
 * Follows AFFiNE design system patterns
 * Requirements: 11.7
 */

export const container = style({
  width: '600px',
  maxWidth: '90vw',
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
  padding: 0,
});

export const header = style({
  padding: '16px 20px',
  borderBottom: '1px solid var(--affine-border-color)',
});

export const title = style({
  fontSize: '18px',
  fontWeight: 600,
  color: 'var(--affine-text-primary-color)',
  margin: 0,
});

export const description = style({
  fontSize: '14px',
  color: 'var(--affine-text-secondary-color)',
  marginTop: '4px',
});

export const searchContainer = style({
  padding: '12px 20px',
  borderBottom: '1px solid var(--affine-border-color)',
});

export const searchInput = style({
  width: '100%',
});

export const content = style({
  flex: 1,
  overflow: 'auto',
  padding: '12px 0',
  minHeight: '300px',
  maxHeight: '400px',
});

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '48px 24px',
  color: 'var(--affine-text-secondary-color)',
  textAlign: 'center',
});

export const emptyIcon = style({
  fontSize: '48px',
  marginBottom: '16px',
  opacity: 0.5,
});

export const emptyText = style({
  fontSize: '14px',
  lineHeight: '20px',
});

export const docGroup = style({
  marginBottom: '8px',
});

export const docHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 20px',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--affine-text-secondary-color)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
});

export const docIcon = style({
  width: '16px',
  height: '16px',
  flexShrink: 0,
});

export const docTitle = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const databaseList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  paddingLeft: '20px',
  paddingRight: '20px',
});

export const databaseItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 12px',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  ':hover': {
    backgroundColor: 'var(--affine-hover-color)',
  },
});

export const databaseItemSelected = style({
  backgroundColor: 'var(--affine-hover-color)',
  outline: '2px solid var(--affine-primary-color)',
  outlineOffset: '-2px',
});

export const databaseIcon = style({
  width: '20px',
  height: '20px',
  flexShrink: 0,
  color: 'var(--affine-icon-color)',
});

export const databaseInfo = style({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
});

export const databaseName = style({
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--affine-text-primary-color)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const databaseMeta = style({
  fontSize: '12px',
  color: 'var(--affine-text-secondary-color)',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

export const viewBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 6px',
  borderRadius: '4px',
  backgroundColor: 'var(--affine-background-secondary-color)',
  fontSize: '11px',
  fontWeight: 500,
});

export const viewSelector = style({
  marginLeft: 'auto',
  flexShrink: 0,
});

export const viewSelectorButton = style({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  color: 'var(--affine-text-secondary-color)',
  backgroundColor: 'transparent',
  border: '1px solid var(--affine-border-color)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  ':hover': {
    backgroundColor: 'var(--affine-hover-color)',
    borderColor: 'var(--affine-primary-color)',
  },
});

export const viewSelectorDropdown = style({
  minWidth: '120px',
});

export const viewOption = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  cursor: 'pointer',
  ':hover': {
    backgroundColor: 'var(--affine-hover-color)',
  },
});

export const viewOptionSelected = style({
  backgroundColor: 'var(--affine-hover-color)',
});

export const footer = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  padding: '16px 20px',
  borderTop: '1px solid var(--affine-border-color)',
});

export const loadingContainer = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '48px',
});
