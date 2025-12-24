import {
  BlockModel,
  BlockSchemaExtension,
  defineBlockSchema,
} from '@blocksuite/store';

export type DatabaseReferenceBlockProps = {
  sourceDocId: string;
  sourceDatabaseId: string;
  viewId?: string;
};

export class DatabaseReferenceBlockModel extends BlockModel<DatabaseReferenceBlockProps> {}

export const DatabaseReferenceBlockSchema = defineBlockSchema({
  flavour: 'affine:database-reference',
  props: (): DatabaseReferenceBlockProps => ({
    sourceDocId: '',
    sourceDatabaseId: '',
    viewId: undefined,
  }),
  metadata: {
    version: 1,
    role: 'content',
    parent: ['affine:note'],
    children: [],
  },
  toModel: () => new DatabaseReferenceBlockModel(),
});

export const DatabaseReferenceBlockSchemaExtension =
  BlockSchemaExtension(DatabaseReferenceBlockSchema);
