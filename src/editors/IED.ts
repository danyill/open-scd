import {
  css,
  html,
  LitElement,
  property,
  PropertyValues,
  state,
  TemplateResult,
} from 'lit-element';
import { translate } from 'lit-translate';
import { nothing } from 'lit-html';

import '@material/mwc-list/mwc-check-list-item';
import '@material/mwc-list/mwc-radio-list-item';

import '../oscd-filter-button.js';
import { SelectedItemsChangedEvent } from '../oscd-filter-button.js';

import './ied/ied-container.js';
import './ied/element-path.js';

import {
  compareNames,
  getDescriptionAttribute,
  getNameAttribute,
} from '../foundation.js';
import { Nsdoc } from '../foundation/nsdoc.js';
import { getIcon } from '../icons/icons.js';

/** An editor [[`plugin`]] for editing the `IED` section. */
export default class IedPlugin extends LitElement {
  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  @property()
  doc!: XMLDocument;

  @property({ type: Number })
  editCount = -1;

  /** All the nsdoc files that are being uploaded via the settings. */
  @property()
  nsdoc!: Nsdoc;

  @state()
  selectedIEDs: string[] = [];

  @state()
  selectedLNClasses: string[] = [];

  @state()
  private get iedList(): Element[] {
    return this.doc
      ? Array.from(this.doc.querySelectorAll(':root > IED')).sort((a, b) =>
          compareNames(a, b)
        )
      : [];
  }

  @state()
  private get lnClassList(): string[][] {
    const currentIed = this.selectedIed;
    const uniqueLNClassList: string[] = [];
    if (currentIed) {
      return Array.from(currentIed.querySelectorAll('LN0, LN'))
        .filter(element => element.hasAttribute('lnClass'))
        .filter(element => {
          const lnClass = element.getAttribute('lnClass') ?? '';
          if (uniqueLNClassList.includes(lnClass)) {
            return false;
          }
          uniqueLNClassList.push(lnClass);
          return true;
        })
        .sort((a, b) => {
          const aLnClass = a.getAttribute('lnClass') ?? '';
          const bLnClass = b.getAttribute('lnClass') ?? '';

          return aLnClass.localeCompare(bLnClass);
        })
        .map(element => {
          const lnClass = element.getAttribute('lnClass');
          const label = this.nsdoc.getDataDescription(element).label;
          return [lnClass, label];
        }) as string[][];
    }
    return [];
  }

  @state()
  private get selectedIed(): Element | undefined {
    // When there is no IED selected, or the selected IED has no parent (IED has been removed)
    // select the first IED from the List.
    if (this.selectedIEDs.length >= 1) {
      const iedList = this.iedList;
      return iedList.find(element => {
        const iedName = getNameAttribute(element);
        return this.selectedIEDs[0] === iedName;
      });
    }
    return undefined;
  }

  lNClassListOpenedOnce = false;

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);

    // When the document is updated, we reset the selected IED if it no longer exists
    const isDocumentUpdated =
      _changedProperties.has('doc') ||
      _changedProperties.has('editCount') ||
      _changedProperties.has('nsdoc');

    if (isDocumentUpdated) {
      // if the IED exists, retain selection
      const iedExists = this.doc?.querySelector(
        `IED[name="${this.selectedIEDs[0]}"]`
      );

      if (iedExists) return;

      this.selectedIEDs = [];
      this.selectedLNClasses = [];
      this.lNClassListOpenedOnce = false;

      const iedList = this.iedList;
      if (iedList.length > 0) {
        const iedName = getNameAttribute(iedList[0]);
        if (iedName) {
          this.selectedIEDs = [iedName];
        }
      }
      this.selectedLNClasses = this.lnClassList.map(
        lnClassInfo => lnClassInfo[0]
      );
    }
  }

  render(): TemplateResult {
    const iedList = this.iedList;
    if (iedList.length > 0) {
      return html`<section>
        <div class="header">
          <h1>${translate('filters')}:</h1>

          <oscd-filter-button
            id="iedFilter"
            icon="developer_board"
            .header=${translate('iededitor.iedSelector')}
            @selected-items-changed="${(e: SelectedItemsChangedEvent) => {
              const equalArrays = <T>(first: T[], second: T[]): boolean => {
                return (
                  first.length === second.length &&
                  first.every((val, index) => val === second[index])
                );
              };

              const selectionChanged = !equalArrays(
                this.selectedIEDs,
                e.detail.selectedItems
              );

              if (!selectionChanged) {
                return;
              }

              this.lNClassListOpenedOnce = false;
              this.selectedIEDs = e.detail.selectedItems;
              this.selectedLNClasses = this.lnClassList.map(
                lnClassInfo => lnClassInfo[0]
              );
              this.requestUpdate('selectedIed');
            }}"
          >
            ${iedList.map(ied => {
              const name = getNameAttribute(ied);
              const descr = getDescriptionAttribute(ied);
              const type = ied.getAttribute('type');
              const manufacturer = ied.getAttribute('manufacturer');
              return html` <mwc-radio-list-item
                value="${name}"
                ?twoline="${type && manufacturer}"
                ?selected="${this.selectedIEDs.includes(name ?? '')}"
              >
                ${name} ${descr ? html` (${descr})` : html``}
                <span slot="secondary">
                  ${type} ${type && manufacturer ? html`&mdash;` : nothing}
                  ${manufacturer}
                </span>
              </mwc-radio-list-item>`;
            })}
          </oscd-filter-button>

          <oscd-filter-button
            id="lnClassesFilter"
            multi="true"
            .header="${translate('iededitor.lnFilter')}"
            @selected-items-changed="${(e: SelectedItemsChangedEvent) => {
              let selectedItems = e.detail.selectedItems;
              const nothingSelected = selectedItems.length === 0;
              if (nothingSelected) {
                selectedItems = this.lnClassList.map(
                  lnClassInfo => lnClassInfo[0]
                );
              }

              this.selectedLNClasses = selectedItems;
              this.requestUpdate('selectedIed');
              this.lNClassListOpenedOnce = true;
            }}"
          >
            <span slot="icon">${getIcon('lNIcon')}</span>
            ${this.lnClassList.map(lnClassInfo => {
              const value = lnClassInfo[0];
              const label = lnClassInfo[1];
              return html`<mwc-check-list-item
                value="${value}"
                ?selected="${this.lNClassListOpenedOnce &&
                this.selectedLNClasses.includes(value)}"
              >
                ${label}
              </mwc-check-list-item>`;
            })}
          </oscd-filter-button>

          <element-path class="elementPath"></element-path>
        </div>

        <ied-container
          .editCount=${this.editCount}
          .doc=${this.doc}
          .element=${this.selectedIed}
          .selectedLNClasses=${this.selectedLNClasses}
          .nsdoc=${this.nsdoc}
        ></ied-container>
      </section>`;
    }
    return html`<h1>
      <span style="color: var(--base1)">${translate('iededitor.missing')}</span>
    </h1>`;
  }

  static styles = css`
    :host {
      width: 100vw;
    }

    section {
      padding: 8px 12px 16px;
    }

    .header {
      display: flex;
    }

    h1 {
      color: var(--mdc-theme-on-surface);
      font-family: 'Roboto', sans-serif;
      font-weight: 300;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      margin: 0px;
      line-height: 48px;
      padding-left: 0.3em;
    }

    .elementPath {
      margin-left: auto;
      padding-right: 12px;
    }
  `;
}
