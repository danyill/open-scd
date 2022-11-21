import {
  css,
  customElement,
  html,
  LitElement,
  property,
  state,
  query,
  TemplateResult,
} from 'lit-element';
import { translate } from 'lit-translate';

import '@material/mwc-button';
import '@material/mwc-icon-button';
import '@material/mwc-list/mwc-list-item';
import { Button } from '@material/mwc-button';

// import './data-set-element-editor.js';
// import './gse-control-element-viewer.js';
import '../../filtered-list.js';

import { FilteredList } from '../../filtered-list.js';

import { gooseIcon, smvIcon } from '../../icons/icons.js';
import { compareNames, identity } from '../../foundation.js';
import { styles } from './foundation.js';

import { SCLTag } from '../../foundation.js';

const cbNameMapping = {
  GOOSE: <SCLTag>'GSEControl',
  SampledValue: <SCLTag>'SampledValueControl',
};

function isEven(num: number): boolean {
  return num % 2 === 0;
}

// need a unit test
function selectProtections(iedName: string, protection: string): boolean {
  const protectionNumber = iedName.split('_').slice(-1)[0] ?? 'None';
  if (protection.includes('1') && !isEven(parseInt(protectionNumber[1]))) {
    return true;
  }
  if (protection.includes('2')  && isEven(parseInt(protectionNumber[1]))) {
    return true;
  }
  return false;
}

function selectControlBlockTypes(goose: boolean, smv: boolean): string {
  return `${goose ? 'GSEControl': ''}${goose && smv ? ',' : ''}${smv ? 'SampledValueControl': ''}`
}

@customElement('control-list')
export class ControlList extends LitElement {
  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  doc!: XMLDocument;

  @property({type: Boolean})
  publisherGOOSE!: boolean;

  @property({type: Boolean})
  publisherSMV!: boolean;

  @property({type: Boolean})
  protection1!: boolean;

  @property({type: Boolean})
  protection2!: boolean;

  @query('.selectionlist') selectionList!: FilteredList;
  @query('mwc-button') selectGSEControlButton!: Button;

  renderSelectionList(): TemplateResult {
    const selectorString = selectControlBlockTypes(this.publisherGOOSE, this.publisherSMV)
    const protectionSelection = `${this.protection1 ? '1' : ''}${this.protection2 ? '2' : ''}`

    if (this.publisherGOOSE === false && this.publisherSMV === false) return html`<filtered-list multi class="selection-list"></filtered-list>`
    
    return html`<filtered-list multi class="selection-list"
      >${Array.from(this.doc.querySelectorAll('IED'))
        .filter(
          ied =>
            ied.querySelector(selectorString) !== null
        )
        .filter(ied => selectProtections(ied.getAttribute('name')!, protectionSelection))
        .sort(compareNames)
        .flatMap(ied => {
          const iedItem = html`<mwc-list-item
              class="listitem header"
              noninteractive
              graphic="icon"
              value="${Array.from(
                ied.querySelectorAll(selectorString)
              )
                .map(element => {
                  const id = identity(element) as string;
                  return typeof id === 'string' ? id : '';
                })
                .join(' ')}"
            >
              <span>${ied.getAttribute('name')}</span>
              <mwc-icon slot="graphic">developer_board</mwc-icon>
            </mwc-icon-button>
            </mwc-list-item>
            <li divider role="separator"></li>`;

          const controls = Array.from(
            ied.querySelectorAll(selectorString)
          ).map(
            controlElement =>
              html`<mwc-check-list-item
                hasMeta
                twoline
                value="${identity(controlElement)}"
                graphic="icon"
              >
                <span>${controlElement.getAttribute('name')}</span
                ><span slot="secondary">${identity(controlElement)}</span>
                <mwc-icon slot="graphic"
                  >${controlElement.tagName === 'GSEControl'
                    ? gooseIcon
                    : smvIcon}</mwc-icon
                >
                <mwc-icon-button slot="meta" icon="edit"></mwc-icon-button>
              </mwc-check-list-item>`
          );

          return [iedItem, ...controls];
        })}</filtered-list
    > `;
  }

  render(): TemplateResult {
    if (!this.doc) return html``;
    return html` <div class="content">${this.renderSelectionList()}</div>`;
  }

  static styles = css`
    selection-list,
    prot-type {
      display: block;
      min-width: 600px;
    }

    .content {
      max-width: 800px;
      max-height: 60vh;
    }
    ${styles}
  `;
}
