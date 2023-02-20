import {
  css,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  query,
  state,
  TemplateResult,
} from 'lit-element';

import { noChange, nothing } from 'lit-html';
import { cache } from 'lit-html/directives/cache.js';
import { repeat } from 'lit-html/directives/repeat.js';
import { get, translate } from 'lit-translate';

import {
  cloneElement,
  createUpdateAction,
  Delete,
  findControlBlocks,
  findFCDAs,
  getDescriptionAttribute,
  getNameAttribute,
  identity,
  newActionEvent,
  selector,
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
  getExtRefElements,
  getSubscribedExtRefElements,
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
  @property()
  includeLaterBinding!: boolean;
  @property()
  publisherView!: boolean;

  @state()
  currentSelectedControlElement: Element | undefined;
  @state()
  currentSelectedFcdaElement: Element | undefined;
  @state()
  currentIedElement: Element | undefined;

  @state()
  private extRefsData = new Map();

  @property({
    attribute: false,
    // FIXME: Force not updating
    hasChanged() {
      return false;
    },
  })
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
    this.currentSelectedControlElement = event.detail.control;
    this.currentSelectedFcdaElement = event.detail.fcda;

    console.log('received onFcdaSelectEvent');
    // Retrieve the IED Element to which the FCDA belongs.
    // These ExtRef Elements will be excluded.
    this.currentIedElement = this.currentSelectedFcdaElement
      ? this.currentSelectedFcdaElement.closest('IED') ?? undefined
      : undefined;

    if (
      !this.publisherView &&
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
      // this.extRefsData = this.extRefsData.set(
      //   getExtRefId(this.currentSelectedExtRefElement),
      //   this.getExtRefData(this.currentSelectedExtRefElement)
      // );

      // IMPORTANT: Endless update loop will occur if this line is removed!
      this.currentSelectedExtRefElement = undefined;
      this.currentIedElement = undefined;
      this.currentSelectedControlElement = undefined;
      this.currentSelectedFcdaElement = undefined;
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
    if (!this.currentSelectedFcdaElement) return true;

    const fcda = fcdaSpecification(this.currentSelectedFcdaElement);
    const input = inputRestriction(extRef);

    if (fcda.cdc === null && input.cdc === null) return true;
    if (fcda.bType === null && input.bType === null) return true;
    if (
      serviceTypes[this.currentSelectedControlElement?.tagName ?? ''] !==
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
    // const clonedExtRefElement = cloneElement(extRefElement, {

    // });
    const updateAction = createUpdateAction(extRefElement, {
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

    // const replaceAction = {
    //   old: { element: extRefElement },
    //   new: { element: clonedExtRefElement },
    // };

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
      !this.currentIedElement ||
      !this.currentSelectedFcdaElement ||
      !this.currentSelectedControlElement!
    ) {
      return;
    }

    const updateAction = updateExtRefElement(
      extRefElement,
      this.currentSelectedControlElement,
      this.currentSelectedFcdaElement
    );

    // const replaceAction = {
    //   old: { element: extRefElement },
    //   new: {
    //     element: updateExtRefElement(
    //       extRefElement,
    //       this.currentSelectedControlElement,
    //       this.currentSelectedFcdaElement
    //     ),
    //   },
    // };

    const subscriberIed = extRefElement.closest('IED') || undefined;
    const supervisionActions = instantiateSubscriptionSupervision(
      this.currentSelectedControlElement,
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
        this.currentSelectedControlElement,
        this.currentSelectedFcdaElement
      )
    );
  }

  private getSubscribedExtRefElements(): Element[] {
    return getSubscribedExtRefElements(
      <Element>this.doc.getRootNode(),
      this.controlTag,
      this.currentSelectedFcdaElement,
      this.currentSelectedControlElement,
      true
    );
  }

  private getAvailableExtRefElements(): Element[] {
    return getExtRefElements(
      <Element>this.doc.getRootNode(),
      this.currentSelectedFcdaElement,
      true
    ).filter(
      extRefElement =>
        !isSubscribed(extRefElement) &&
        (!extRefElement.hasAttribute('serviceType') ||
          extRefElement.getAttribute('serviceType') ===
            this.serviceTypeLookup[this.controlTag])
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
      ${!this.publisherView && this.includeLaterBinding
        ? html`<mwc-icon-button
            icon="alt_route"
            title="${translate(
              `subscription.laterBinding.extRefList.switchView`
            )}"
            @click=${() =>
              this.dispatchEvent(
                new Event('change-view', { bubbles: true, composed: true })
              )}
          ></mwc-icon-button>`
        : nothing}
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

  private renderSubscribedExtRefs(): TemplateResult {
    const subscribedExtRefs = this.getSubscribedExtRefElements();
    return html`
      <mwc-list-item
        noninteractive
        value="${subscribedExtRefs
          .map(
            extRefElement =>
              getDescriptionAttribute(extRefElement) +
              ' ' +
              identity(extRefElement)
          )
          .join(' ')}"
      >
        <span>${translate('subscription.subscriber.subscribed')}</span>
      </mwc-list-item>
      <li divider role="separator"></li>
      ${subscribedExtRefs.length > 0
        ? html`${subscribedExtRefs.map(extRefElement =>
            this.renderExtRefElement(extRefElement)
          )}`
        : html`<mwc-list-item graphic="large" noninteractive>
            ${translate(
              'subscription.laterBinding.extRefList.noSubscribedExtRefs'
            )}
          </mwc-list-item>`}
    `;
  }

  private renderAvailableExtRefs(): TemplateResult {
    const availableExtRefs = this.getAvailableExtRefElements();
    return html`
      <mwc-list-item
        noninteractive
        value="${availableExtRefs
          .map(
            extRefElement =>
              getDescriptionAttribute(extRefElement) +
              ' ' +
              identity(extRefElement)
          )
          .join(' ')}"
      >
        <span>
          ${translate('subscription.subscriber.availableToSubscribe')}
        </span>
      </mwc-list-item>
      <li divider role="separator"></li>
      ${availableExtRefs.length > 0
        ? html`${availableExtRefs.map(
            extRefElement => html` <mwc-list-item
              graphic="large"
              ?disabled=${this.unsupportedExtRefElement(extRefElement)}
              twoline
              @click=${() => this.subscribe(extRefElement)}
              value="${identity(extRefElement)}"
            >
              <span>
                ${extRefElement.getAttribute('intAddr')}
                ${getDescriptionAttribute(extRefElement)
                  ? html` (${getDescriptionAttribute(extRefElement)})`
                  : nothing}
              </span>
              <span slot="secondary"
                >${identity(extRefElement.parentElement)}</span
              >
              <mwc-icon slot="graphic">link_off</mwc-icon>
            </mwc-list-item>`
          )}`
        : html`<mwc-list-item graphic="large" noninteractive>
            ${translate(
              'subscription.laterBinding.extRefList.noAvailableExtRefs'
            )}
          </mwc-list-item>`}
    `;
  }

  render(): TemplateResult {
    // if (this.doc) {
    return html` <section tabindex="0">
      ${(this.currentSelectedControlElement &&
        this.currentSelectedFcdaElement) ||
      !this.publisherView
        ? html`
            ${this.renderTitle()}
            <filtered-list ?activatable=${!this.publisherView}>
              ${this.publisherView
                ? html`${this.renderSubscribedExtRefs()}
                  ${this.renderAvailableExtRefs()}`
                : this.renderExtRefsByIED()}
            </filtered-list>
          `
        : html`${this.renderTitle()}
            <h3>
              ${translate('subscription.laterBinding.extRefList.noSelection')}
            </h3> `}
    </section>`;
    // }
    // return noChange;
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
