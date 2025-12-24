import { css } from 'lit';

export const databaseReferenceBlockStyles = css`
  .affine-database-reference-container {
    width: 100%;
    margin: 8px 0;
    border: 1px solid var(--affine-border-color);
    border-radius: 8px;
    padding: 16px;
    background: var(--affine-background-primary-color);
  }

  .affine-database-reference-container:hover {
    border-color: var(--affine-primary-color);
  }
`;
