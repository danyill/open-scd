import {
  css,
  customElement,
  html,
  LitElement,
  property,
  state,
  TemplateResult,
} from 'lit-element';
import { nothing, SVGTemplateResult } from 'lit-html';
import { translate } from 'lit-translate';

import '@material/mwc-icon';
import '@material/mwc-list';
import '@material/mwc-list/mwc-list-item';

import {
  getDescriptionAttribute,
  getNameAttribute,
  identity,
  newWizardEvent,
} from '../../foundation.js';
import { gooseIcon, smvIcon } from '../../icons/icons.js';
import { wizards } from '../../wizards/wizard-library.js';

import {
  ExtRefSelectionChangedEvent,
  getFcdaSubtitleValue,
  getFcdaTitleValue,
  newFcdaSelectEvent,
  styles,
  SubscriptionChangedEvent,
} from './foundation.js';
import {
  getSubscribedExtRefElements,
  unsupportedExtRefElement,
} from './later-binding/foundation.js';

type controlTag = 'SampledValueControl' | 'GSEControl';

type iconLookup = Record<controlTag, SVGTemplateResult>;

/**
 * A sub element for showing all Goose/Sampled Value Controls.
 * A control can be edited using the standard wizard.
 * And when selecting a FCDA Element a custom event is fired, so other list can be updated.
 */
@customElement('fcda-binding-list')
export class FcdaBindingList extends LitElement {
  @property()
  doc!: XMLDocument;
  @property()
  controlTag!: controlTag;
  @property()
  includeLaterBinding!: boolean;
  @property({ attribute: true })
  subscriberview!: boolean;

  @state()
  private extRefCounters = new Map();

  // The selected elements when a FCDA Line is clicked.
  private selectedControlElement: Element | undefined;
  private selectedFcdaElement: Element | undefined;
  private selectedExtRefElement: Element | undefined;

  private iconControlLookup: iconLookup = {
    SampledValueControl: smvIcon,
    GSEControl: gooseIcon,
  };

  constructor() {
    super();

    this.resetSelection = this.resetSelection.bind(this);
    parent.addEventListener('open-doc', this.resetSelection);

    const parentDiv = this.closest('.container');
    if (parentDiv) {
      this.resetExtRefCount = this.resetExtRefCount.bind(this);
      parentDiv.addEventListener('subscription-changed', this.resetExtRefCount);

      this.updateExtRefSelection = this.updateExtRefSelection.bind(this);
      parentDiv.addEventListener(
        'extref-selection-changed',
        this.updateExtRefSelection
      );
    }
  }

  private getControlElements(): Element[] {
    if (this.doc) {
      return Array.from(this.doc.querySelectorAll(`LN0 > ${this.controlTag}`));
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
      );
    }
    return [];
  }

  private resetExtRefCount(event: SubscriptionChangedEvent): void {
    console.log('received SubscriptionChangedEvent');
    if (!this.subscriberview) {
      this.resetSelection();
    }
    if (event.detail.control && event.detail.fcda) {
      const controlBlockFcdaId = `${identity(event.detail.control)} ${identity(
        event.detail.fcda
      )}`;
      this.extRefCounters.delete(controlBlockFcdaId);
    }
  }

  private updateExtRefSelection(event: ExtRefSelectionChangedEvent): void {
    if (event.detail.extRefElement) {
      this.selectedExtRefElement = event.detail.extRefElement;
      // TODO: can we do better??
      this.requestUpdate();
    }
  }

  private getExtRefCount(
    fcdaElement: Element,
    controlElement: Element
  ): number {
    const controlBlockFcdaId = `${identity(controlElement)} ${identity(
      fcdaElement
    )}`;
    if (!this.extRefCounters.has(controlBlockFcdaId)) {
      const extRefCount = getSubscribedExtRefElements(
        <Element>this.doc.getRootNode(),
        this.controlTag,
        fcdaElement,
        controlElement!,
        this.includeLaterBinding
      ).length;
      this.extRefCounters.set(controlBlockFcdaId, extRefCount);
    }
    return this.extRefCounters.get(controlBlockFcdaId);
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
    this.selectedControlElement = controlElement;
    this.selectedFcdaElement = fcdaElement;
    this.dispatchEvent(
      newFcdaSelectEvent(this.selectedControlElement, this.selectedFcdaElement)
    );
  }

  renderFCDA(controlElement: Element, fcdaElement: Element): TemplateResult {
    const fcdaCount = this.getExtRefCount(fcdaElement, controlElement);
    return html`<mwc-list-item
      graphic="large"
      ?hasMeta=${fcdaCount !== 0}
      ?disabled=${this.subscriberview &&
      unsupportedExtRefElement(
        this.selectedExtRefElement,
        fcdaElement,
        controlElement
      )}
      twoline
      class="subitem"
      @click=${() => {
        this.onFcdaSelect(controlElement, fcdaElement);
      }}
      value="${identity(controlElement)}
             ${identity(fcdaElement)}"
    >
      <span>${getFcdaTitleValue(fcdaElement)}</span>
      <span slot="secondary">${getFcdaSubtitleValue(fcdaElement)}</span>
      <mwc-icon slot="graphic">subdirectory_arrow_right</mwc-icon>
      ${fcdaCount !== 0 ? html`<span slot="meta">${fcdaCount}</span>` : nothing}
    </mwc-list-item>`;
  }

  renderTitle(): TemplateResult {
    return html`<h1>
      ${translate(`subscription.${this.controlTag}.controlBlockList.title`)}
      ${!this.subscriberview && this.includeLaterBinding
        ? html`<mwc-icon-button
            icon="alt_route"
            title="${translate(
              `subscription.laterBinding.switchControlBlockView`
            )}"
            @click=${() =>
              this.dispatchEvent(
                new Event('change-view', { bubbles: true, composed: true })
              )}
          ></mwc-icon-button>`
        : nothing}
    </h1>`;
  }

  render(): TemplateResult {
    const controlElements = this.getControlElements();
    return html` <section tabindex="0">
      ${controlElements.length > 0
        ? html`${this.renderTitle()}
            <filtered-list ?activatable=${!this.subscriberview}>
              ${controlElements.map(controlElement => {
                const fcdaElements = this.getFcdaElements(controlElement);
                return html`
                  <mwc-list-item
                    noninteractive
                    graphic="icon"
                    twoline
                    hasMeta
                    value="
                        ${identity(controlElement)}${fcdaElements
                      .map(
                        fcdaElement => `
                        ${getFcdaTitleValue(fcdaElement)}
                        ${getFcdaSubtitleValue(fcdaElement)}
                        ${identity(fcdaElement)}`
                      )
                      .join('')}"
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
                    <mwc-icon slot="graphic"
                      >${this.iconControlLookup[this.controlTag]}</mwc-icon
                    >
                  </mwc-list-item>
                  <li divider role="separator"></li>
                  ${fcdaElements.map(fcdaElement =>
                    this.renderFCDA(controlElement, fcdaElement)
                  )}
                `;
              })}
            </filtered-list>`
        : html`${this.renderTitle()}
            <h3>
              ${translate(
                `subscription.${this.controlTag}.controlBlockList.noControlBlockFound`
              )}
            </h3>`}
    </section>`;
  }

  static styles = css`
    ${styles}

    h3 {
      color: var(--mdc-theme-on-surface);
      font-family: 'Roboto', sans-serif;
      font-weight: 300;
      margin: 4px 8px 16px;
      padding-left: 0.3em;
    }

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
