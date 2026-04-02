import {
  type StoreExtensionContext,
  StoreExtensionProvider,
} from '@blocksuite/affine-ext-loader';
import { DatabaseReferenceBlockSchemaExtension } from '@blocksuite/affine-model';

export class DatabaseReferenceStoreExtension extends StoreExtensionProvider {
  override name = 'affine-database-reference-block';

  override setup(context: StoreExtensionContext) {
    super.setup(context);
    context.register(DatabaseReferenceBlockSchemaExtension);
  }
}
