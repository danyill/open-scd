import {
  css,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from 'lit-element';
import { translate } from 'lit-translate';

import '@material/mwc-icon';
import '@material/mwc-list/mwc-list-item';

import '../../filtered-list.js';
import { getNameAttribute } from '../../foundation.js';
import { getOrderedIeds, newIEDSelectEvent, styles } from './foundation.js';

let selectedIed: Element | undefined;

function onOpenDocResetSelectedGooseMsg() {
  selectedIed = undefined;
}
addEventListener('open-doc', onOpenDocResetSelectedGooseMsg);

@customElement('ied-list')
export class IedList extends LitElement {
  @property()
  doc!: XMLDocument;

  private onIedSelect(element: Element): void {
    selectedIed = element;
    this.dispatchEvent(newIEDSelectEvent(selectedIed));
  }

  protected updated(): void {
    this.dispatchEvent(newIEDSelectEvent(selectedIed));
  }

  render(): TemplateResult {
    return html` <section tabindex="0">
      <h1>${translate('multicastNaming.title')}</h1>
      <filtered-list multi>
        ${getOrderedIeds(this.doc).map(
          ied =>
            html`
              <mwc-check-list-item
                @click=${() => this.onIedSelect(ied)}
                graphic="icon"
              >
                <span>${getNameAttribute(ied)}</span>
                <mwc-icon slot="graphic">developer_board</mwc-icon>
              </mwc-check-list-item>
            `
        )}
      </filtered-list>
      <mwc-button
        outlined
        icon="drive_file_rename_outline"
        class="renameButton"
        label="Rename GOOSE and SMV"
        }}
      ></mwc-button
      >
    </section>`;
  }

  static styles = css`
    ${styles}
  `;
}
