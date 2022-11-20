import {
  css,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from 'lit-element';
import { nothing } from 'lit-html';
import { translate } from 'lit-translate';

import '@material/mwc-icon';
import '@material/mwc-list/mwc-list-item';

import '../../filtered-list.js';
// import { getNameAttribute } from '../../foundation.js';
import { getOrderedIeds, newIEDSelectEvent, styles } from './foundation.js';

import { wizards } from '../../wizards/wizard-library.js';

import {
  compareNames,
  getDescriptionAttribute,
  getNameAttribute,
  identity,
  newWizardEvent,
} from '../../foundation.js';

let selectedIed: Element | undefined;

function onOpenDocResetSelectedGooseMsg() {
  selectedIed = undefined;
}
addEventListener('open-doc', onOpenDocResetSelectedGooseMsg);

@customElement('ied-list')
export class IedList extends LitElement {
  @property()
  doc!: XMLDocument;

  @property()
  controlTag = 'GSEControl';

  private onIedSelect(element: Element): void {
    selectedIed = element;
    this.dispatchEvent(newIEDSelectEvent(selectedIed));
  }

  protected updated(): void {
    this.dispatchEvent(newIEDSelectEvent(selectedIed));
  }

  private getControlElements(): Element[] {
    if (this.doc) {
      return Array.from(
        this.doc.querySelectorAll(`LN0 > ${this.controlTag}`)
      ).sort((a, b) => compareNames(`${identity(a)}`, `${identity(b)}`));
    }
    return [];
  }

  private openEditWizard(controlElement: Element): void {
    const wizard = wizards['GSEControl'].edit(controlElement);
    if (wizard) this.dispatchEvent(newWizardEvent(wizard));
  }

  render(): TemplateResult {
    const controlElements = this.getControlElements();
    return html` <section tabindex="0">
      ${controlElements.length > 0
        ? html`<h1>
              ${translate(
                `subscription.laterBinding.${this.controlTag}.controlBlockList.title`
              )}
            </h1>
            <filtered-list activatable>
              ${controlElements.map(controlElement => {
                return html`
                  <mwc-list-item
                    noninteractive
                    graphic="icon"
                    twoline
                    hasMeta
                    value="${identity(controlElement)}"
                  >
                    <mwc-icon-button
                      slot="meta"
                      icon="edit"
                      class="interactive"
                      @click=${() => this.openEditWizard(controlElement)}
                    ></mwc-icon-button>
                    <span
                      >${getNameAttribute(controlElement)}
                      ${getDescriptionAttribute(controlElement)
                        ? html`${getDescriptionAttribute(controlElement)}`
                        : nothing}</span
                    >
                    <span slot="secondary">${identity(controlElement)}</span>
                    <mwc-icon slot="graphic">smvIcon</mwc-icon>
                  </mwc-list-item>
                `;
              })}
            </filtered-list>`
        : html`<h1>
            ${translate(
              `subscription.laterBinding.${this.controlTag}.controlBlockList.noControlBlockFound`
            )}
          </h1>`}
    </section>`;
    // return html` <section tabindex="0">
    //   <h1>${translate('multicastNaming.title')}</h1>
    //   <filtered-list multi>
    //     ${getOrderedIeds(this.doc).map(
    //       ied =>
    //         html`
    //           <mwc-check-list-item
    //             @click=${() => this.onIedSelect(ied)}
    //             graphic="icon"
    //           >
    //             <span>${getNameAttribute(ied)}</span>
    //             <mwc-icon slot="graphic">developer_board</mwc-icon>
    //           </mwc-check-list-item>
    //         `
    //     )}
    //   </filtered-list>
    //   <mwc-button
    //     outlined
    //     icon="drive_file_rename_outline"
    //     class="renameButton"
    //     label="Rename GOOSE and SMV"
    //     }}
    //   ></mwc-button
    //   >
    // </section>`;
  }

  static styles = css`
    ${styles}
  `;
}
