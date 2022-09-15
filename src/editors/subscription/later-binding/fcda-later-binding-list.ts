import {
  css,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  state,
  TemplateResult,
} from 'lit-element';
import { nothing } from 'lit-html';
import { translate } from 'lit-translate';

import '@material/mwc-icon';
import '@material/mwc-list';
import '@material/mwc-list/mwc-list-item';

import {
  compareNames,
  getDescriptionAttribute,
  getNameAttribute,
  identity,
  newWizardEvent,
} from '../../../foundation.js';
import { smvIcon } from '../../../icons/icons.js';
import { wizards } from '../../../wizards/wizard-library.js';

import { styles } from '../foundation.js';
import { isPublic } from '../../../foundation.js';

import { getFcdaTitleValue, newFcdaSelectEvent } from './foundation.js';

/**
 * A sub element for showing all Goose/Sampled Value Controls.
 * A control can be edited using the standard wizard.
 * And when selecting a FCDA Element a custom event is fired, so other list can be updated.
 */
@customElement('fcda-later-binding-list')
export class FCDALaterBindingList extends LitElement {
  @property({ attribute: false })
  doc!: XMLDocument;
  @property()
  controlTag!: 'SampledValueControl' | 'GSEControl';

  // The selected Elements when a FCDA Line is clicked.
  @state()
  selectedControlElement: Element | undefined;
  @state()
  selectedFcdaElement: Element | undefined;

  @property({ attribute: false })
  fcdaCount = new Map();

  constructor() {
    super();

    this.resetSelection = this.resetSelection.bind(this);
    parent.addEventListener('open-doc', this.resetSelection);
  }

  private getControlElements(): Element[] {
    if (this.doc) {
      return Array.from(
        this.doc.querySelectorAll(`LN0 > ${this.controlTag}`)
      ).sort((a, b) => compareNames(`${identity(a)}`, `${identity(b)}`));
    }
    return [];
  }

  private getFcdaElements(controlElement: Element): Element[] {
    const lnElement = controlElement.parentElement;
    if (lnElement) {
      return Array.from(
        lnElement.querySelectorAll(
          `:scope > DataSet[name=${controlElement.getAttribute(
            'datSet'
          )}] > FCDA`
        )
      ).sort((a, b) => compareNames(`${identity(a)}`, `${identity(b)}`));
    }
    return [];
  }

  private indexFCDAs() {
    // index each fcda to display the count promptly
    const controlElements = this.getControlElements();
    let fcdas: Element[] = [];
    controlElements.forEach(controlElement => {
      fcdas = fcdas.concat(...this.getFcdaElements(controlElement));
    });

    fcdas.forEach(fcda => {
      this.fcdaCount.set(identity(fcda), this.countExtRefUsageOfFCDA(fcda));
    });
  }

  /**
   * Counts usage of an IEDs FCDA defined within a dataset within ExtRefs in a project SCL file.
   * @param fcdaElement - an FCDA element from a dataset.
   * @returns the number of times this FCDA is used in ExtRefs in the project.
   */
  private countExtRefUsageOfFCDA(fcdaElement: Element): number {
    const iedName = fcdaElement.closest('IED')?.getAttribute('name') ?? null;
    const [ldInst, prefix, lnClass, lnInst, doName, daName] = [
      'ldInst',
      'prefix',
      'lnClass',
      'lnInst',
      'doName',
      'daName',
    ].map(attr => fcdaElement.getAttribute(attr));
    return Array.from(
      this.doc.querySelectorAll(
        `Inputs > ExtRef[iedName="${iedName}"][ldInst="${ldInst}"][prefix="${prefix}"][lnClass="${lnClass}"][lnInst="${lnInst}"][doName="${doName}"][daName="${daName}"]`
      )
    ).filter(isPublic).length;
  }

  /**
   * Display the number of ExtRefs used for a given FCDA
   * @param fcdaElement - an SCL FCDA element from a dataset.
   * @returns a count of mappings otherwise returns zero
   */
  private getExtRefUsageCount(fcdaElement: Element): number {
    return this.fcdaCount.get(identity(fcdaElement)) || 0;
  }

  private openEditWizard(controlElement: Element): void {
    const wizard = wizards[this.controlTag].edit(controlElement);
    if (wizard) this.dispatchEvent(newWizardEvent(wizard));
  }

  private resetSelection(): void {
    this.selectedControlElement = undefined;
    this.selectedFcdaElement = undefined;
  }

  private onFcdaSelect(controlElement: Element, fcdaElement: Element) {
    this.resetSelection();

    this.selectedControlElement = controlElement;
    this.selectedFcdaElement = fcdaElement;
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);

    // update index
    this.indexFCDAs();

    // When the document is updated, we will fire the event again.
    if (
      _changedProperties.has('doc') ||
      _changedProperties.has('selectedControlElement') ||
      _changedProperties.has('selectedFcdaElement')
    ) {
      this.dispatchEvent(
        newFcdaSelectEvent(
          this.selectedControlElement,
          this.selectedFcdaElement
        )
      );
    }
  }

  renderFCDA(controlElement: Element, fcdaElement: Element): TemplateResult {
    // carry out indexing if not existing
    if (this.fcdaCount.size === 0) {
      this.indexFCDAs();
    }
    const fcdaCount = this.getExtRefUsageCount(fcdaElement) 
    const fcdaCountHtml = fcdaCount !== 0 ? html`<span slot="meta">${fcdaCount}</span>` : ''
    return html`<mwc-list-item
      graphic="large"
      hasMeta
      twoline
      class="subitem"
      @click=${() => this.onFcdaSelect(controlElement, fcdaElement)}
      value="${identity(controlElement)} ${identity(fcdaElement)}"
    >
      <span>${getFcdaTitleValue(fcdaElement)}</span>
      <span slot="secondary">
        ${fcdaElement.getAttribute('ldInst')}${fcdaElement.hasAttribute(
          'ldInst'
        ) && fcdaElement.hasAttribute('prefix')
          ? html`/`
          : nothing}${fcdaElement.getAttribute('prefix')}
        ${fcdaElement.getAttribute('lnClass')}
        ${fcdaElement.getAttribute('lnInst')}
      </span>
      <mwc-icon slot="graphic">subdirectory_arrow_right</mwc-icon>
      ${fcdaCountHtml}
    </mwc-list-item>`;
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
                const fcdaElements = this.getFcdaElements(controlElement);
                return html`
                  <mwc-list-item
                    noninteractive
                    graphic="icon"
                    twoline
                    hasMeta
                    value="${identity(controlElement)} ${fcdaElements
                      .map(fcdaElement => identity(fcdaElement) as string)
                      .join(' ')}"
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
                    <mwc-icon slot="graphic">${smvIcon}</mwc-icon>
                  </mwc-list-item>
                  <li divider role="separator"></li>
                  ${fcdaElements.map(fcdaElement =>
                    this.renderFCDA(controlElement, fcdaElement)
                  )}
                `;
              })}
            </filtered-list>`
        : html`<h1>
            ${translate(
              `subscription.laterBinding.${this.controlTag}.controlBlockList.noControlBlockFound`
            )}
          </h1>`}
    </section>`;
  }

  static styles = css`
    ${styles}

    mwc-list-item.hidden[noninteractive] + li[divider] {
      display: none;
    }

    mwc-list-item {
      --mdc-list-item-meta-size: 48px;
    }

    .interactive {
      pointer-events: all;
    }

    .subitem {
      padding-left: var(--mdc-list-side-padding, 16px);
    }
  `;
}
