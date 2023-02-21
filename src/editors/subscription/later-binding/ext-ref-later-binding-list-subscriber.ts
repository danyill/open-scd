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
import { repeat } from 'lit-html/directives/repeat.js';
import { get, translate } from 'lit-translate';

import {
  createUpdateAction,
  Delete,
  findControlBlocks,
  findFCDAs,
  getDescriptionAttribute,
  getNameAttribute,
  identity,
  newActionEvent,
} from '../../../foundation.js';

import {
  getExistingSupervision,
  styles,
  updateExtRefElement,
  serviceTypes,
  instantiateSubscriptionSupervision,
  removeSubscriptionSupervision,
  FcdaSelectEvent,
  newSubscriptionChangedEvent,
  canRemoveSubscriptionSupervision,
  getOrderedIeds,
} from '../foundation.js';

import {
  fcdaSpecification,
  inputRestriction,
  isSubscribed,
  getFcdaSrcControlBlockDescription,
} from './foundation.js';

function getExtRefId(extRefElement: Element): string {
  return `${identity(extRefElement.parentElement)} ${extRefElement.getAttribute(
    'intAddr'
  )}`;
}

/**
 * A sub element for showing all Ext Refs from a FCDA Element.
 * The List reacts on a custom event to know which FCDA Element was selected and updated the view.
 */
@customElement('extref-later-binding-list-subscriber')
export class ExtRefLaterBindingListHey extends LitElement {
  @property({ attribute: false })
  doc!: XMLDocument;
  @property()
  controlTag!: 'SampledValueControl' | 'GSEControl';
  @property({ attribute: true })
  subscriberview!: boolean;

  @state()
  private extRefsData = new Map();

  selectedPublisherControlElement: Element | undefined;
  selectedPublisherFcdaElement: Element | undefined;
  selectedPublisherIedElement: Element | undefined;
  currentSelectedExtRefElement: Element | undefined;

  serviceTypeLookup = {
    GSEControl: 'GOOSE',
    SampledValueControl: 'SMV',
  };

  constructor() {
    super();

    const parentDiv = this.closest('.container');
    if (parentDiv) {
      this.onFcdaSelectEvent = this.onFcdaSelectEvent.bind(this);
      parentDiv.addEventListener('fcda-select', this.onFcdaSelectEvent);
    }
  }

  private async onFcdaSelectEvent(event: FcdaSelectEvent) {
    this.selectedPublisherControlElement = event.detail.control;
    this.selectedPublisherFcdaElement = event.detail.fcda;

    console.log('received onFcdaSelectEvent');
    // Retrieve the IED Element to which the FCDA belongs.
    // These ExtRef Elements will be excluded.
    this.selectedPublisherIedElement = this.selectedPublisherFcdaElement
      ? this.selectedPublisherFcdaElement.closest('IED') ?? undefined
      : undefined;

    if (
      this.currentSelectedExtRefElement &&
      !isSubscribed(this.currentSelectedExtRefElement)
    ) {
      this.subscribe(this.currentSelectedExtRefElement);

      const newData = this.getExtRefData(this.currentSelectedExtRefElement);
      if (newData)
        this.extRefsData.set(
          getExtRefId(this.currentSelectedExtRefElement),
          newData
        );

      this.currentSelectedExtRefElement = undefined;
      this.selectedPublisherIedElement = undefined;
      this.selectedPublisherControlElement = undefined;
      this.selectedPublisherFcdaElement = undefined;
    }
  }

  /**
   * Check data consistency of source `FCDA` and sink `ExtRef` based on
   * `ExtRef`'s `pLN`, `pDO`, `pDA` and `pServT` attributes.
   * Consistent means `CDC` and `bType` of both ExtRef and FCDA is equal.
   * In case
   *  - `pLN`, `pDO`, `pDA` or `pServT` attributes are not present, allow subscribing
   *  - no CDC or bType can be extracted, do not allow subscribing
   *
   * @param extRef - The `ExtRef` Element to check against
   */
  private unsupportedExtRefElement(extRef: Element): boolean {
    // Vendor does not provide data for the check
    if (
      !extRef.hasAttribute('pLN') ||
      !extRef.hasAttribute('pDO') ||
      !extRef.hasAttribute('pDA') ||
      !extRef.hasAttribute('pServT')
    )
      return false;

    // Not ready for any kind of subscription
    if (!this.selectedPublisherFcdaElement) return true;

    const fcda = fcdaSpecification(this.selectedPublisherFcdaElement);
    const input = inputRestriction(extRef);

    if (fcda.cdc === null && input.cdc === null) return true;
    if (fcda.bType === null && input.bType === null) return true;
    if (
      serviceTypes[this.selectedPublisherControlElement?.tagName ?? ''] !==
      extRef.getAttribute('pServT')
    )
      return true;

    return fcda.cdc !== input.cdc || fcda.bType !== input.bType;
  }

  /**
   * Unsubscribing means removing a list of attributes from the ExtRef Element.
   *
   * @param extRefElement - The Ext Ref Element to clean from attributes.
   */
  private unsubscribe(extRefElement: Element): void {
    const updateAction = createUpdateAction(extRefElement, {
      intAddr: extRefElement.getAttribute('intAddr'),
      iedName: null,
      ldInst: null,
      prefix: null,
      lnClass: null,
      lnInst: null,
      doName: null,
      daName: null,
      serviceType: null,
      srcLDInst: null,
      srcPrefix: null,
      srcLNClass: null,
      srcLNInst: null,
      srcCBName: null,
    });

    const subscriberIed = extRefElement.closest('IED') || undefined;
    const removeSubscriptionActions: Delete[] = [];
    const controlBlock =
      Array.from(findControlBlocks(extRefElement))[0] ?? undefined;
    if (canRemoveSubscriptionSupervision(extRefElement))
      removeSubscriptionActions.push(
        ...removeSubscriptionSupervision(controlBlock, subscriberIed)
      );

    this.dispatchEvent(
      newActionEvent({
        title: get(`subscription.disconnect`),
        actions: [updateAction, ...removeSubscriptionActions],
      })
    );
    const fcdaElements = findFCDAs(extRefElement);
    this.dispatchEvent(
      newSubscriptionChangedEvent(
        controlBlock,
        fcdaElements.length !== 0 ? fcdaElements[0] : undefined
      )
    );
  }

  /**
   * Subscribing means copying a list of attributes from the FCDA Element (and others) to the ExtRef Element.
   *
   * @param extRefElement - The Ext Ref Element to add the attributes to.
   */
  private subscribe(extRefElement: Element): void {
    if (
      !this.selectedPublisherIedElement ||
      !this.selectedPublisherFcdaElement ||
      !this.selectedPublisherControlElement!
    ) {
      return;
    }

    const updateAction = updateExtRefElement(
      extRefElement,
      this.selectedPublisherControlElement,
      this.selectedPublisherFcdaElement
    );

    const subscriberIed = extRefElement.closest('IED') || undefined;
    const supervisionActions = instantiateSubscriptionSupervision(
      this.selectedPublisherControlElement,
      subscriberIed
    );

    this.dispatchEvent(
      newActionEvent({
        title: get(`subscription.connect`),
        actions: [updateAction, ...supervisionActions],
      })
    );
    this.dispatchEvent(
      newSubscriptionChangedEvent(
        this.selectedPublisherControlElement,
        this.selectedPublisherFcdaElement
      )
    );
  }

  private getExtRefElementsByIED(ied: Element): Element[] {
    const addrPath = function (e: Element) {
      return `${identity(e.parentElement)}${e.getAttribute('intAddr') ?? ''}`;
    };
    return Array.from(ied.querySelectorAll('ExtRef'))
      .filter(
        extRefElement =>
          (extRefElement.hasAttribute('intAddr') &&
            !extRefElement.hasAttribute('serviceType')) ||
          extRefElement.getAttribute('serviceType') ===
            this.serviceTypeLookup[this.controlTag]
      )
      .sort((a, b) => {
        return addrPath(a).localeCompare(addrPath(b));
      });
  }

  private renderTitle(): TemplateResult {
    return html`<h1>
      ${translate(`subscription.laterBinding.extRefList.title`)}
      <mwc-icon-button
        icon="alt_route"
        title="${translate(`subscription.laterBinding.extRefList.switchView`)}"
        @click=${() =>
          this.dispatchEvent(
            new Event('change-view', { bubbles: true, composed: true })
          )}
      ></mwc-icon-button>
    </h1>`;
  }

  private renderExtRefElement(extRefElement: Element): TemplateResult {
    const supervisionNode = getExistingSupervision(extRefElement);
    return html` <mwc-list-item
      graphic="large"
      ?hasMeta=${supervisionNode !== null}
      twoline
      @click=${() => this.unsubscribe(extRefElement)}
      value="${identity(extRefElement)}"
    >
      <span>
        ${extRefElement.getAttribute('intAddr')}
        ${getDescriptionAttribute(extRefElement)
          ? html` (${getDescriptionAttribute(extRefElement)})`
          : nothing}
      </span>
      <span slot="secondary"
        >${identity(extRefElement.parentElement)}${supervisionNode !== null
          ? ` (${identity(supervisionNode)})`
          : ''}</span
      >
      <mwc-icon slot="graphic">link</mwc-icon>
      ${supervisionNode !== null
        ? html`<mwc-icon title="${identity(supervisionNode)}" slot="meta"
            >monitor_heart</mwc-icon
          >`
        : nothing}
    </mwc-list-item>`;
  }

  private getExtRefData(
    extRefElement: Element
  ): Record<string, unknown> | null {
    let subscriberFCDA: Element | undefined = undefined;
    let supervisionNode: Element | null = null;
    let controlBlockDescription: string | undefined = undefined;
    let supervisionDescription: string | undefined = undefined;

    const subscribed = isSubscribed(extRefElement);
    if (subscribed) {
      subscriberFCDA = findFCDAs(extRefElement).find(x => x !== undefined);
      supervisionNode = getExistingSupervision(extRefElement);
      controlBlockDescription =
        getFcdaSrcControlBlockDescription(extRefElement);
    }

    const ied = extRefElement.closest('IED');
    // removed a line

    if (supervisionNode) {
      supervisionDescription = (<string>identity(supervisionNode)).slice(
        ied!.getAttribute('name')!.length + 2
      );
    }

    const extRefData = {
      iedName: ied?.getAttribute('name') ?? 'unknown',
      supervisionNode: supervisionNode,
      isDisabled: this.unsupportedExtRefElement(extRefElement),
      description: getDescriptionAttribute(extRefElement),
      supervisionDescription: supervisionDescription,
      controlBlockDescription: controlBlockDescription,
      isSubscribed: subscribed,
      idSupervisionNode: identity(supervisionNode),
      idExtRefElement: identity(extRefElement),
      idSubscriberFCDA: subscriberFCDA ? identity(subscriberFCDA!) : '',
      subscriberFCDA: subscriberFCDA,
    };

    return extRefData;
  }

  private getCompleteExtRefDetails(
    extRefElement: Element
  ): Record<string, unknown> {
    const extRefId = `${identity(
      extRefElement.parentElement
    )} ${extRefElement.getAttribute('intAddr')}`;

    if (!this.extRefsData.has(extRefId)) {
      this.extRefsData.set(extRefId, this.getExtRefData(extRefElement));
    }
    return this.extRefsData.get(extRefId);
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);

    // When a new document is loaded we will reset the Map to clear old entries.
    if (_changedProperties.has('doc')) {
      this.extRefsData = new Map();
    }
  }

  private renderCompleteExtRefElement(extRefElement: Element): TemplateResult {
    const data = this.getCompleteExtRefDetails(extRefElement);

    return html`<mwc-list-item
      graphic="large"
      ?hasMeta=${data.supervisionNode !== null}
      ?disabled=${<boolean>data.isDisabled}
      twoline
      @click=${() => {
        this.currentSelectedExtRefElement = extRefElement;
        if (data.isSubscribed) this.unsubscribe(extRefElement);
      }}
      value="${data.idExtRefElement} ${data.idSupervisionNode ?? ''}"
    >
      <span>
        ${(<string>identity(extRefElement.parentElement)).slice(
          (<string>data.iedName).length + 2
        )}:
        ${extRefElement.getAttribute('intAddr')}
        ${data.isSubscribed && data.subscriberFCDA
          ? `⬌ ${data.idSubscriberFCDA ?? 'Unknown'}`
          : ''}
      </span>
      <span slot="secondary"
        >${getDescriptionAttribute(extRefElement)
          ? html` ${getDescriptionAttribute(extRefElement)}`
          : nothing}
        ${data.supervisionDescription || data.controlBlockDescription
          ? html`(${[data.controlBlockDescription, data.supervisionDescription]
              .filter(desc => desc !== undefined)
              .join(', ')})`
          : nothing}
      </span>
      <mwc-icon slot="graphic"
        >${data.isSubscribed ? 'link' : 'link_off'}</mwc-icon
      >
      ${(data.isSubscribed && data.supervisionNode) !== null
        ? html`<mwc-icon title="${<string>data.idSupervisionNode}" slot="meta"
            >monitor_heart</mwc-icon
          >`
        : nothing}
    </mwc-list-item>`;
  }

  private renderExtRefsByIED(): TemplateResult {
    return html`${repeat(
      getOrderedIeds(this.doc),
      i => identity(i),
      ied =>
        html`
          <mwc-list-item
            noninteractive
            graphic="icon"
            value="${Array.from(ied.querySelectorAll('ExtRef'))
              .map(extRef => {
                const data = this.getCompleteExtRefDetails(extRef);
                const supervisionId = data.idSupervisionNode;
                return `${
                  typeof data.idExtRef === 'string' ? data.idExtRef : ''
                } ${typeof supervisionId === 'string' ? supervisionId : ''} ${
                  data.idSubscriberFCDA ?? ''
                }`;
              })
              .join(' ')}"
          >
            <span>${getNameAttribute(ied)}</span>
            <mwc-icon slot="graphic">developer_board</mwc-icon>
          </mwc-list-item>
          <li divider role="separator"></li>
          ${repeat(
            Array.from(this.getExtRefElementsByIED(ied)),
            exId => identity(exId),
            extRef => this.renderCompleteExtRefElement(extRef)
          )} 
          </mwc-list-item>`
    )}`;
  }

  render(): TemplateResult {
    // if (this.doc) {
    return html` <section tabindex="0">
      ${this.renderTitle()}
      <filtered-list activatable>${this.renderExtRefsByIED()}</filtered-list>
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
  `;
}
