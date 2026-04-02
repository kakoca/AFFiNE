import { DatabaseReferenceBlockComponent } from './database-reference-block.js';

export function effects() {
  customElements.define(
    'affine-database-reference',
    DatabaseReferenceBlockComponent
  );
}
