import { style } from '@vanilla-extract/css';

export const inputContainer = style({
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  padding: '12px',
  borderTop: '1px solid var(--affine-border-color)',
});

export const input = style({
  flex: 1,
  minHeight: '40px',
});

export const submitButton = style({
  padding: '8px 16px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: 'var(--affine-primary-color)',
  color: 'white',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'opacity 0.2s',
  
  ':hover': {
    opacity: 0.9,
  },
  
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});
