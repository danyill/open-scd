import {
  css,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
} from 'lit-element';
import { translate } from 'lit-translate';

import '@material/mwc-dialog';
import '@material/mwc-formfield';
import '@material/mwc-button';
import '@material/mwc-icon-button';
import '@material/mwc-list/mwc-list-item';

import { Dialog } from '@material/mwc-dialog';
import { List, MWCListIndex } from '@material/mwc-list';

import '../filtered-list.js';

import { gooseIcon, smvIcon } from '../icons/icons.js';
import { compareNames, identity } from '../foundation.js';

// type commType = Partial<Record<'GSE' | 'SMV', string>>

type system = 'P1' | 'P2'

type macAddrs = Partial<Record<system, () => string>>

type commType = Partial<Record<'GSE'|'SMV', macAddrs>>

type p1mac = Record<system, macAddrs>

type MacObject = 
  Record<commType,p1mac>
;

  // var stuff: Record<'P1'|'P2', () => string> = {};

const gseMAC = {
  P1: { min: 0x010ccd010000, max: 0x010ccd0100ff },
  P2: { min: 0x010ccd010100, max: 0x010ccd0101ff },
};

const smvMAC = {
  P1: { min: 0x010ccd040000, max: 0x010ccd0400ff },
  P2: { min: 0x010ccd040100, max: 0x010ccd0401ff },
};

function convertToMac(mac: number): string {
  const str = 0 + mac.toString(16).toUpperCase();
  const arr = str.match(/.{1,2}/g)!;
  return arr?.join('-');
}

function macRange(min: number, max: number): string[] {
  return Array(max - min)
    .fill(1)
    .map((_, i) => convertToMac(min + i));
}

/**
 * @param doc - project xml document
 * @param serviceType - SampledValueControl (SMV) or GSEControl (GSE)
 * @returns a function generating increasing unused `MAC-Address` within `doc` on subsequent invocations
 */
export function macAddressGenerator(
  doc: XMLDocument,
  serviceType: 'SMV' | 'GSE',
  protectionType: '1' | '2',
  ignoreMACs: string[]
): () => string {
  const macs = new Set(
    Array.from(
      doc.querySelectorAll(`${serviceType} > Address > P[type="MAC-Address"]`)
    ).map(macs => macs.textContent!)
  );

  let range: string[] = [];
  if (serviceType === 'GSE')
    range =
      protectionType === '1'
        ? macRange(gseMAC.P1.min, gseMAC.P1.max)
        : macRange(gseMAC.P2.min, gseMAC.P2.max);
  else if (serviceType === 'SMV')
    range =
      protectionType === '1'
        ? macRange(smvMAC.P1.min, smvMAC.P1.max)
        : macRange(smvMAC.P2.min, smvMAC.P2.max);

  range = range.filter(mac => !ignoreMACs.includes(mac));

  return () => {
    const uniqueMAC = range.find(mac => !macs.has(mac));
    if (uniqueMAC) macs.add(uniqueMAC);
    return uniqueMAC ?? '';
  };
}

function isEven(num: number): boolean {
  return num % 2 === 0;
}

function getProtectionNumber(iedName: string): string {
  const protectionNumber = iedName.split('_')?.slice(-1)[0] ?? 'None';
  if (isEven(parseInt(protectionNumber[1]))) {
    return '2';
  }
  return '1';
}

function selectProtections(iedName: string, protection: string): boolean {
  const protectionNumber = iedName.split('_')?.slice(-1)[0] ?? 'None';
  if (protection.includes('1') && !isEven(parseInt(protectionNumber[1]))) {
    return true;
  }
  if (protection.includes('2') && isEven(parseInt(protectionNumber[1]))) {
    return true;
  }
  return false;
}

function selectControlBlockTypes(goose: boolean, smv: boolean): string {
  return `${goose ? 'GSE' : ''}${goose && smv ? ',' : ''}${smv ? 'SMV' : ''}`;
}

/** A menu [[`plugin`]] to apply a naming convention to multicast GOOSE and SMV traffic */
export default class MulticastNamingPlugin extends LitElement {
  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  doc!: XMLDocument;

  @query('mwc-dialog')
  dialog!: Dialog;

  @property()
  publisherGOOSE = true;
  @property()
  publisherSMV = true;
  @property()
  protection1 = true;
  @property()
  protection2 = true;

  @property({ attribute: false })
  selectedControlItems: MWCListIndex | [] = [];

  @property({ type: Array })
  commElements: Element[] | [] = [];

  @query('.selection-list')
  cbList: List | undefined;

  async run(): Promise<void> {
    this.dialog.open = true;
    this.cbList?.addEventListener('selected', () => {
      this.selectedControlItems = this.cbList!.index;
    });
  }

  renderFilterButtons(): TemplateResult {
    return html`<div class="multicast-naming-type-selector">
      <mwc-formfield label="GOOSE"
        ><mwc-checkbox
          value="GOOSE"
          ?checked=${this.publisherGOOSE}
          @change=${() => (this.publisherGOOSE = !this.publisherGOOSE)}
        ></mwc-checkbox></mwc-formfield
      ><mwc-formfield label="Sampled Value"
        ><mwc-checkbox
          value="SampledValue"
          ?checked=${this.publisherSMV}
          @change=${() => (this.publisherSMV = !this.publisherSMV)}
        ></mwc-checkbox
      ></mwc-formfield>
      <mwc-formfield label="Prot 1"
        ><mwc-checkbox
          ?checked=${this.protection1}
          @change=${() => (this.protection1 = !this.protection1)}
        ></mwc-checkbox
      ></mwc-formfield>
      <mwc-formfield label="Prot 2"
        ><mwc-checkbox
          ?checked=${this.protection2}
          @change=${() => (this.protection2 = !this.protection2)}
        ></mwc-checkbox
      ></mwc-formfield>
    </div>`;
  }

  renderSelectionList(): TemplateResult {
    if (!this.doc) return html``;
    const noSelectedComms =
      this.publisherGOOSE === false && this.publisherSMV === false;

    const selectorString = selectControlBlockTypes(
      this.publisherGOOSE,
      this.publisherSMV
    );
    const protectionSelection = `${this.protection1 ? '1' : ''}${
      this.protection2 ? '2' : ''
    }`;
    this.commElements = [];
    return html`<filtered-list multi class="selection-list"
      >${Array.from(
        noSelectedComms
          ? this.doc.querySelectorAll('XYZZY')
          : this.doc.querySelectorAll('ConnectedAP')
      )
        .filter(ap => ap.querySelector(selectorString) !== null)
        .filter(ap =>
          selectProtections(ap.getAttribute('iedName')!, protectionSelection)
        )
        .sort(compareNames)
        .flatMap(ap => {
          const apItem = html`<mwc-list-item
              class="listitem header"
              noninteractive
              graphic="icon"
              value="${Array.from(ap.querySelectorAll(selectorString))
                .map(comm => {
                  const id = `${identity(comm)}` as string;
                  return typeof id === 'string' ? id : '';
                })
                .join(' ')}"
            >
              <span>${ap.getAttribute('iedName')} > ${ap.getAttribute(
            'apName'
          )}</span>
              <mwc-icon slot="graphic">developer_board</mwc-icon>
            </mwc-icon-button>
            </mwc-list-item>
            <li divider role="separator"></li>`;

          const currentComElements = Array.from(
            ap.querySelectorAll(selectorString)
          );
          this.commElements = [...this.commElements, ...currentComElements];
          const commUiElements = currentComElements.map(
            comm =>
              html`<mwc-check-list-item
                hasMeta
                twoline
                value="${comm.getAttribute(
                  'cbName'
                )} ${comm.parentElement!.getAttribute(
                  'iedName'
                )} ${comm.parentElement!.getAttribute('apName')} "
                graphic="icon"
              >
                <span>${comm.getAttribute('cbName')}</span
                ><span slot="secondary"
                  >${(<string>identity(comm))
                    .split(' ')
                    .slice(0, -1)
                    .join('')}</span
                >
                <mwc-icon slot="graphic"
                  >${comm.tagName === 'GSE' ? gooseIcon : smvIcon}</mwc-icon
                >
                <mwc-icon-button slot="meta" icon="edit"></mwc-icon-button>
              </mwc-check-list-item>`
          );

          return [apItem, ...commUiElements];
        })}</filtered-list
    >`;
  }

  updateCommElements(selectedCommElements: Element[]): void {
    console.log(selectedCommElements);
    const ignoreMACs = selectedCommElements.map(
      elem =>
        elem.querySelector('Address > P[type="MAC-Address"]')!.textContent ?? ''
    );
    const nextMac: MacObject = {
      GSE: {
        '1': macAddressGenerator(this.doc, 'GSE', '1', ignoreMACs),
        '2': macAddressGenerator(this.doc, 'GSE', '1', ignoreMACs),
      },
      SMV: {
        '1': macAddressGenerator(this.doc, 'SMV', '1', ignoreMACs),
        '2': macAddressGenerator(this.doc, 'SMV', '1', ignoreMACs),
      },
    };

    selectedCommElements.forEach(element => {
      const protNum = getProtectionNumber(
        element.closest('ConnectedAP')!.getAttribute('iedName')!
      );
      const usedMAC = (nextMac)[<system>(element.tagName)][protNum]();
      console.log(usedMAC);
      element.querySelector(`Address > P[type="MAC-Address"]`)!.textContent =
        usedMAC;
    });
  }

  renderButtons(): TemplateResult {
    const sizeSelectedItems = (<Set<number>>this.selectedControlItems).size;
    return html`<mwc-button
        outlined
        icon="drive_file_rename_outline"
        class="rename-button"
        label="Rename GOOSE and SMV (${sizeSelectedItems || '0'})"
        slot="primaryAction"
        ?disabled=${(<Set<number>>this.selectedControlItems).size === 0 ||
        (Array.isArray(this.selectedControlItems) &&
          !this.selectedControlItems.length)}
        @click=${() => {
          const selectedCommElements = Array.from(
            (<Set<number>>this.selectedControlItems).values()
          ).map(index => this.commElements[index]);
          this.updateCommElements(selectedCommElements);
        }}
      >
      </mwc-button>
      <mwc-button
        slot="secondaryAction"
        dialogAction="close"
        label="${translate('close')}"
        style="--mdc-theme-primary: var(--mdc-theme-error)"
      ></mwc-button>`;
  }

  render(): TemplateResult {
    return html`<mwc-dialog
      class="multicast-content"
      heading="${translate('multicastNaming.heading')}"
    >
      ${this.renderFilterButtons()} ${this.renderSelectionList()}
      ${this.renderButtons()}
    </mwc-dialog> `;
  }

  static styles = css`
    mwc-dialog {
      --mdc-dialog-max-height: 80vh;
    }

    .publishertypeselector {
      margin: 4px 8px 8px;
      background-color: var(--mdc-theme-surface);
      width: calc(100% - 16px);
      justify-content: space-around;
    }

    .content {
      max-width: 800px;
      max-height: 60vh;
    }

    .selectionlist {
      flex: 35%;
      margin: 4px 4px 4px 8px;
      background-color: var(--mdc-theme-surface);
      overflow-y: scroll;
    }

    .listitem.header {
      font-weight: 500;
    }

    @media (max-width: 599px) {
      .content {
        height: 100%;
      }

      .selectionlist {
        position: absolute;
        width: calc(100% - 32px);
        height: auto;
        top: 110px;
        left: 8px;
        background-color: var(--mdc-theme-surface);
        z-index: 1;
        box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
          0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
      }

      mwc-button {
        display: flex;
        margin: 4px 8px 8px;
      }
    }
  `;
}
