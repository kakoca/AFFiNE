import {
  DatabaseBlockDataSource,
  DatabaseSelection,
} from '@blocksuite/affine-block-database';
import { CaptionedBlockComponent } from '@blocksuite/affine-components/caption';
import { toast } from '@blocksuite/affine-components/toast';
import type {
  DatabaseBlockModel,
  DatabaseReferenceBlockModel,
} from '@blocksuite/affine-model';
import {
  DataViewRootUILogic,
  type DataViewSelection,
  type DataViewWidget,
  type DataViewWidgetProps,
  defineUniComponent,
  lazy,
  renderUniLit,
} from '@blocksuite/data-view';
import { widgetPresets } from '@blocksuite/data-view/widget-presets';
import { computed, signal } from '@preact/signals-core';
import { html } from 'lit';
import { state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { databaseReferenceBlockStyles } from './styles.js';

export class DatabaseReferenceBlockComponent extends CaptionedBlockComponent<DatabaseReferenceBlockModel> {
  static override styles = databaseReferenceBlockStyles;

  @state()
  private accessor _dataSource: DatabaseBlockDataSource | null = null;

  @state()
  private accessor _error: string | null = null;

  @state()
  private accessor _loading = true;

  private readonly dataSource = lazy(() => this._dataSource);

  private readonly viewSelection$ = computed(() => {
    const databaseSelection = this.selection.value.find(
      (selection): selection is DatabaseSelection => {
        if (selection.blockId !== this.blockId) {
          return false;
        }
        return selection instanceof DatabaseSelection;
      }
    );
    return databaseSelection?.viewSelection;
  });

  private readonly virtualPadding$ = signal(0);

  private readonly setSelection = (
    selection: DataViewSelection | undefined
  ) => {
    if (selection) {
      getSelection()?.removeAllRanges();
    }
    this.selection.setGroup(
      'note',
      selection
        ? [
            new DatabaseSelection({
              blockId: this.blockId,
              viewSelection: selection,
            }),
          ]
        : []
    );
  };

  private readonly headerWidget: DataViewWidget = defineUniComponent(
    (props: DataViewWidgetProps) => {
      const sourceInfo = html`
        <div
          style=${styleMap({
            fontSize: '12px',
            color: 'var(--affine-text-secondary-color)',
            marginBottom: '8px',
            padding: '4px 8px',
            background: 'var(--affine-background-secondary-color)',
            borderRadius: '4px',
          })}
        >
          Referenced Database
        </div>
      `;

      return html`
        <div>
          ${sourceInfo}
          <div style=${styleMap({ marginBottom: '8px' })}>
            ${renderUniLit(widgetPresets.viewBar, props)}
          </div>
          ${renderUniLit(widgetPresets.quickSettingBar, props)}
        </div>
      `;
    }
  );

  private readonly dataViewRootLogic = lazy(() => {
    if (!this._dataSource) {
      return null;
    }

    return new DataViewRootUILogic({
      virtualPadding$: this.virtualPadding$,
      bindHotkey: hotkeys => {
        return {
          dispose: this.host.event.bindHotkey(hotkeys, {
            blockId: this.blockId,
          }),
        };
      },
      handleEvent: (name, handler) => {
        return {
          dispose: this.host.event.add(name, handler, {
            blockId: this.blockId,
          }),
        };
      },
      selection$: this.viewSelection$,
      setSelection: this.setSelection,
      dataSource: this._dataSource,
      headerWidget: this.headerWidget,
      onDrag: () => () => {}, // Disable drag for references
      clipboard: this.std.clipboard,
      notification: {
        toast: message => {
          toast(this.host, message);
        },
      },
      eventTrace: () => {},
      detailPanelConfig: {
        openDetailPanel: () => Promise.resolve(),
      },
    });
  });

  private async loadSourceDatabase() {
    try {
      this._loading = true;
      this._error = null;

      const { sourceDocId, sourceDatabaseId, viewId } = this.model.props;

      if (!sourceDocId || !sourceDatabaseId) {
        this._error = 'Invalid database reference: missing source information';
        this._loading = false;
        return;
      }

      // For now, we only support references within the same document
      // Cross-document references would require integration with the AFFiNE workspace layer
      const currentDoc = this.doc;

      if (sourceDocId !== currentDoc.id) {
        this._error = 'Cross-document references are not yet supported';
        this._loading = false;
        return;
      }

      // Get the source database block from the current document
      const sourceBlock = currentDoc.getBlock(sourceDatabaseId);

      if (!sourceBlock || sourceBlock.flavour !== 'affine:database') {
        this._error = 'Source database not found or invalid';
        this._loading = false;
        return;
      }

      const dbModel = sourceBlock.model as DatabaseBlockModel;
      this._dataSource = new DatabaseBlockDataSource(dbModel);

      // If a specific view is requested, set it as current
      if (viewId && this._dataSource.viewManager.viewGet(viewId)) {
        this._dataSource.viewManager.setCurrentView(viewId);
      }

      this._loading = false;
      this.requestUpdate();
    } catch (error) {
      console.error('Failed to load source database:', error);
      this._error =
        error instanceof Error ? error.message : 'Failed to load database';
      this._loading = false;
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this.contentEditable = 'false';
    this.loadSourceDatabase().catch((err: unknown) => {
      console.error('Error loading source database:', err);
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
  }

  override renderBlock() {
    if (this._loading) {
      return html`
        <div class="affine-database-reference-container">
          <div
            style=${styleMap({
              padding: '20px',
              textAlign: 'center',
              color: 'var(--affine-text-secondary-color)',
            })}
          >
            Loading database...
          </div>
        </div>
      `;
    }

    if (this._error) {
      return html`
        <div class="affine-database-reference-container">
          <div
            style=${styleMap({
              padding: '20px',
              textAlign: 'center',
              color: 'var(--affine-error-color)',
              background: 'var(--affine-background-error-color)',
              borderRadius: '4px',
            })}
          >
            Error: ${this._error}
          </div>
        </div>
      `;
    }

    if (!this._dataSource || !this.dataViewRootLogic.value) {
      return html`
        <div class="affine-database-reference-container">
          <div
            style=${styleMap({
              padding: '20px',
              textAlign: 'center',
              color: 'var(--affine-text-secondary-color)',
            })}
          >
            No database available
          </div>
        </div>
      `;
    }

    return html`
      <div class="affine-database-reference-container" contenteditable="false">
        ${this.dataViewRootLogic.value.render()}
      </div>
    `;
  }

  override accessor useZeroWidth = true;
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-database-reference': DatabaseReferenceBlockComponent;
  }
}
