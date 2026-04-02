import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine/ext-loader';
import { FrameworkProvider } from '@toeverything/infra';
import { z } from 'zod';

import { DatabaseReferenceSlashMenuExtension } from '../../../modules/ai-document-editor/extensions';

const optionsSchema = z.object({
  framework: z.instanceof(FrameworkProvider).optional(),
});

type DatabaseReferenceViewOptions = z.infer<typeof optionsSchema>;

/**
 * View extension that registers the Database Reference slash menu option.
 * This allows users to insert database references via the "/" slash command.
 */
export class DatabaseReferenceViewExtension extends ViewExtensionProvider<DatabaseReferenceViewOptions> {
  override name = 'affine-database-reference-view-extension';

  override schema = optionsSchema;

  override setup(
    context: ViewExtensionContext,
    options?: DatabaseReferenceViewOptions
  ) {
    super.setup(context, options);

    // Register the slash menu extension for page and edgeless scopes
    if (context.scope === 'edgeless' || context.scope === 'page') {
      context.register([DatabaseReferenceSlashMenuExtension]);
    }
  }
}
