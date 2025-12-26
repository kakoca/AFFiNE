import { DatabaseReferenceBlockSchemaExtension } from '@blocksuite/affine-model';
import { BlockStdScope } from '@blocksuite/std';

export function effects() {
  customElements.define(
    'affine-database-reference',
    // @ts-expect-error - dynamic import
    () =>
      import('./database-reference-block.js').then(
        m => m.DatabaseReferenceBlockComponent
      )
  );

  BlockStdScope.mount(DatabaseReferenceBlockSchemaExtension);
}
