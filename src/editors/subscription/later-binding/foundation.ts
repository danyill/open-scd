import { get } from 'lit-translate';

import {
  createUpdateAction,
  Delete,
  findFCDAs,
  getSclSchemaVersion,
  newActionEvent,
} from '../../../foundation.js';

import {
  canRemoveSubscriptionSupervision,
  instantiateSubscriptionSupervision,
  newSubscriptionChangedEvent,
  removeSubscriptionSupervision,
  serviceTypes,
  updateExtRefElement,
} from '../foundation.js';

function dataAttributeSpecification(
  anyLn: Element,
  doName: string,
  daName: string
): { cdc: string | null; bType: string | null } {
  const doc = anyLn.ownerDocument;
  const lNodeType = doc.querySelector(
    `LNodeType[id="${anyLn.getAttribute('lnType')}"]`
  );

  const doNames = doName.split('.');
  let leaf: Element | null | undefined = lNodeType;
  for (const doName of doNames) {
    const dO: Element | null | undefined = leaf?.querySelector(
      `DO[name="${doName}"], SDO[name="${doName}"]`
    );
    leaf = doc.querySelector(`DOType[id="${dO?.getAttribute('type')}"]`);
  }
  if (!leaf || !leaf.getAttribute('cdc')) return { cdc: null, bType: null };

  const cdc = leaf.getAttribute('cdc')!;

  const daNames = daName.split('.');
  for (const daName of daNames) {
    const dA: Element | null | undefined = leaf?.querySelector(
      `DA[name="${daName}"], BDA[name="${daName}"]`
    );
    leaf =
      daNames.indexOf(daName) < daNames.length - 1
        ? doc.querySelector(`DAType[id="${dA?.getAttribute('type')}"]`)
        : dA;
  }
  if (!leaf || !leaf.getAttribute('bType')) return { cdc, bType: null };

  const bType = leaf.getAttribute('bType')!;

  return { bType, cdc };
}

/**
 * @param fcda - Data attribute reference in a data set
 * @returns Data objects `CDC` and data attributes `bType`
 */
export function fcdaSpecification(fcda: Element): {
  cdc: string | null;
  bType: string | null;
} {
  const [doName, daName] = ['doName', 'daName'].map(attr =>
    fcda.getAttribute(attr)
  );
  if (!doName || !daName) return { cdc: null, bType: null };

  const ied = fcda.closest('IED');

  const anyLn = Array.from(
    ied?.querySelectorAll(
      `LDevice[inst="${fcda.getAttribute(
        'ldInst'
      )}"] > LN, LDevice[inst="${fcda.getAttribute('inst')}"] LN0`
    ) ?? []
  ).find(anyLn => {
    return (
      (anyLn.getAttribute('prefix') ?? '') ===
        (fcda.getAttribute('prefix') ?? '') &&
      (anyLn.getAttribute('lnClass') ?? '') ===
        (fcda.getAttribute('lnClass') ?? '') &&
      (anyLn.getAttribute('inst') ?? '') === (fcda.getAttribute('lnInst') ?? '')
    );
  });
  if (!anyLn) return { cdc: null, bType: null };

  return dataAttributeSpecification(anyLn, doName, daName);
}

/**
 * Edition 2 and later SCL files allow to restrict subscription on
 * later binding type inputs (`ExtRef` elements) based on a `CDC` and
 * basic type `bType`.
 * @param extRef - A later binding type input in the sink IED
 * @returns data objects `CDC` and data attribute basic type `bType` or `null`
 */
export function inputRestriction(extRef: Element): {
  cdc: string | null;
  bType: string | null;
} {
  const [pLN, pDO, pDA] = ['pLN', 'pDO', 'pDA'].map(attr =>
    extRef.getAttribute(attr)
  );
  if (!pLN || !pDO || !pDA) return { cdc: null, bType: null };

  const anyLns = Array.from(
    extRef
      .closest('IED')
      ?.querySelectorAll(`LN[lnClass="${pLN}"],LN0[lnClass="${pLN}"]`) ?? []
  );

  for (const anyLn of anyLns) {
    const dataSpec = dataAttributeSpecification(anyLn, pDO, pDA);
    if (dataSpec.cdc !== null && dataSpec.bType !== null) return dataSpec;
  }

  return { cdc: null, bType: null };
}

/**
 * Simple function to check if the attribute of the Left Side has the same value as the attribute of the Right Element.
 *
 * @param leftElement   - The Left Element to check against.
 * @param rightElement  - The Right Element to check.
 * @param attributeName - The name of the attribute to check.
 */
export function sameAttributeValue(
  leftElement: Element | undefined,
  rightElement: Element | undefined,
  attributeName: string
): boolean {
  return (
    (leftElement?.getAttribute(attributeName) ?? '') ===
    (rightElement?.getAttribute(attributeName) ?? '')
  );
}

/**
 * Simple function to check if the attribute of the Left Side has the same value as the attribute of the Right Element.
 *
 * @param leftElement        - The Left Element to check against.
 * @param leftAttributeName  - The name of the attribute (left) to check against.
 * @param rightElement       - The Right Element to check.
 * @param rightAttributeName - The name of the attribute (right) to check.
 */
export function sameAttributeValueDiffName(
  leftElement: Element | undefined,
  leftAttributeName: string,
  rightElement: Element | undefined,
  rightAttributeName: string
): boolean {
  return (
    (leftElement?.getAttribute(leftAttributeName) ?? '') ===
    (rightElement?.getAttribute(rightAttributeName) ?? '')
  );
}

/**
 * If needed check version specific attributes against FCDA Element.
 *
 * @param controlTag     - Indicates which type of control element.
 * @param controlElement - The Control Element to check against.
 * @param extRefElement  - The Ext Ref Element to check.
 */
function checkEditionSpecificRequirements(
  controlTag: 'SampledValueControl' | 'GSEControl',
  controlElement: Element | undefined,
  extRefElement: Element
): boolean {
  // For 2003 Edition no extra check needed.
  if (getSclSchemaVersion(extRefElement.ownerDocument) === '2003') {
    return true;
  }

  const lDeviceElement = controlElement?.closest('LDevice') ?? undefined;
  const lnElement = controlElement?.closest('LN0') ?? undefined;

  // For the 2007B and 2007B4 Edition we need to check some extra attributes.
  return (
    (extRefElement.getAttribute('serviceType') ?? '') ===
      serviceTypes[controlTag] &&
    sameAttributeValueDiffName(
      extRefElement,
      'srcLDInst',
      lDeviceElement,
      'inst'
    ) &&
    sameAttributeValueDiffName(
      extRefElement,
      'scrPrefix',
      lnElement,
      'prefix'
    ) &&
    sameAttributeValueDiffName(
      extRefElement,
      'srcLNClass',
      lnElement,
      'lnClass'
    ) &&
    sameAttributeValueDiffName(extRefElement, 'srcLNInst', lnElement, 'inst') &&
    sameAttributeValueDiffName(
      extRefElement,
      'srcCBName',
      controlElement,
      'name'
    )
  );
}

/**
 * Check if specific attributes from the ExtRef Element are the same as the ones from the FCDA Element
 * and also if the IED Name is the same. If that is the case this ExtRef subscribes to the selected FCDA
 * Element.
 *
 * @param controlTag     - Indicates which type of control element.
 * @param controlElement - The Control Element to check against.
 * @param fcdaElement    - The FCDA Element to check against.
 * @param extRefElement  - The Ext Ref Element to check.
 */
export function isSubscribedTo(
  controlTag: 'SampledValueControl' | 'GSEControl',
  controlElement: Element | undefined,
  fcdaElement: Element | undefined,
  extRefElement: Element
): boolean {
  return (
    extRefElement.getAttribute('iedName') ===
      fcdaElement?.closest('IED')?.getAttribute('name') &&
    sameAttributeValue(fcdaElement, extRefElement, 'ldInst') &&
    sameAttributeValue(fcdaElement, extRefElement, 'prefix') &&
    sameAttributeValue(fcdaElement, extRefElement, 'lnClass') &&
    sameAttributeValue(fcdaElement, extRefElement, 'lnInst') &&
    sameAttributeValue(fcdaElement, extRefElement, 'doName') &&
    sameAttributeValue(fcdaElement, extRefElement, 'daName') &&
    checkEditionSpecificRequirements(controlTag, controlElement, extRefElement)
  );
}

/**
 * Check if the ExtRef is already subscribed to a FCDA Element.
 *
 * @param extRefElement - The Ext Ref Element to check.
 */
export function isSubscribed(extRefElement: Element): boolean {
  return (
    extRefElement.hasAttribute('iedName') &&
    extRefElement.hasAttribute('ldInst') &&
    extRefElement.hasAttribute('lnClass') &&
    extRefElement.hasAttribute('lnInst') &&
    extRefElement.hasAttribute('doName') &&
    extRefElement.hasAttribute('daName')
  );
}

export function getExtRefElements(
  rootElement: Element,
  fcdaElement: Element | undefined,
  includeLaterBinding: boolean
): Element[] {
  return Array.from(rootElement.querySelectorAll('ExtRef'))
    .filter(
      element =>
        (includeLaterBinding && element.hasAttribute('intAddr')) ||
        (!includeLaterBinding && !element.hasAttribute('intAddr'))
    )
    .filter(element => element.closest('IED') !== fcdaElement?.closest('IED'));
}

export function getSubscribedExtRefElements(
  rootElement: Element,
  controlTag: 'SampledValueControl' | 'GSEControl',
  fcdaElement: Element | undefined,
  controlElement: Element | undefined,
  includeLaterBinding: boolean
): Element[] {
  return getExtRefElements(
    rootElement,
    fcdaElement,
    includeLaterBinding
  ).filter(extRefElement =>
    isSubscribedTo(controlTag, controlElement, fcdaElement, extRefElement)
  );
}

export function getFcdaSrcControlBlockDescription(
  extRefElement: Element
): string {
  const [srcPrefix, srcLDInst, srcLNClass, srcCBName] = [
    'srcPrefix',
    'srcLDInst',
    'srcLNClass',
    'srcCBName',
  ].map(name => extRefElement.getAttribute(name));
  // QUESTION: Maybe we don't need srcLNClass ?
  return `${
    srcPrefix ? srcPrefix + ' ' : ''
  }${srcLDInst} / ${srcLNClass} ${srcCBName}`;
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
 * @param fcdaElement - The SCL `FCDA` element within the DataSet
 * @param controlElement - The control element associated with the `FCDA` `DataSet`
 */
export function unsupportedExtRefElement(
  extRef: Element | undefined,
  fcdaElement: Element | undefined,
  controlElement: Element | undefined
): boolean {
  if (!extRef) return false;
  // Vendor does not provide data for the check
  if (
    !extRef.hasAttribute('pLN') ||
    !extRef.hasAttribute('pDO') ||
    !extRef.hasAttribute('pDA') ||
    !extRef.hasAttribute('pServT')
  )
    return false;

  // Not ready for any kind of subscription
  if (!fcdaElement) return true;

  const fcda = fcdaSpecification(fcdaElement);
  const input = inputRestriction(extRef);

  if (fcda.cdc === null && input.cdc === null) return true;
  if (fcda.bType === null && input.bType === null) return true;
  if (
    serviceTypes[controlElement?.tagName ?? ''] !==
    extRef.getAttribute('pServT')
  )
    return true;

  return fcda.cdc !== input.cdc || fcda.bType !== input.bType;
}

const serviceTypeControlBlockTags: Partial<Record<string, string[]>> = {
  GOOSE: ['GSEControl'],
  SMV: ['SampledValueControl'],
  Report: ['ReportControl'],
  NONE: ['LogControl', 'GSEControl', 'SampledValueControl', 'ReportControl'],
};

export function findControlBlock(extRef: Element): Element {
  const fcdas = findFCDAs(extRef);
  const cbTags =
    serviceTypeControlBlockTags[extRef.getAttribute('serviceType') ?? 'NONE'] ??
    [];
  const controlBlocks = new Set(
    fcdas.flatMap(fcda => {
      const dataSet = fcda.parentElement!;
      const dsName = dataSet.getAttribute('name') ?? '';
      const anyLN = dataSet.parentElement!;
      return cbTags
        .flatMap(tag => Array.from(anyLN.getElementsByTagName(tag)))
        .filter(cb => {
          if (extRef.getAttribute('srcCBName')) {
            const ln = cb.closest('LN0')!;
            const lnClass = ln.getAttribute('lnClass');
            const lnPrefix = ln.getAttribute('prefix') ?? '';
            const lnInst = ln.getAttribute('inst');

            const ld = ln.closest('LDevice')!;
            const ldInst = ld.getAttribute('inst');
            const cbName = cb.getAttribute('name');

            return (
              extRef.getAttribute('srcCBName') === cbName &&
              (extRef.getAttribute('srcLNInst') ?? '') === lnInst &&
              (extRef.getAttribute('srcLNClass') ?? 'LLN0') === lnClass &&
              (extRef.getAttribute('srcPrefix') ?? '') === lnPrefix &&
              (extRef.getAttribute('srcLDInst') ??
                extRef.getAttribute('ldInst')) === ldInst
            );
          }
          return cb.getAttribute('datSet') === dsName;
        });
    })
  );
  console.log('cb', controlBlocks, controlBlocks.size);
  return controlBlocks.values().next().value;
}

export function findFCDA(
  extRef: Element,
  controlBlock: Element
): Element | null {
  if (extRef.tagName !== 'ExtRef' || extRef.closest('Private')) return null;

  const [iedName, ldInst, prefix, lnClass, lnInst, doName, daName] = [
    'iedName',
    'ldInst',
    'prefix',
    'lnClass',
    'lnInst',
    'doName',
    'daName',
  ].map(name => extRef.getAttribute(name));
  const ied = Array.from(extRef.ownerDocument.getElementsByTagName('IED')).find(
    element =>
      element.getAttribute('name') === iedName && !element.closest('Private')
  );
  if (!ied) return null;

  const dataSetRef = controlBlock.getAttribute('datSet');

  const candidateFCDAs = Array.from(ied.getElementsByTagName('FCDA'))
    .filter(item => !item.closest('Private'))
    .filter(
      fcda =>
        (fcda.getAttribute('ldInst') ?? '') === (ldInst ?? '') &&
        (fcda.getAttribute('prefix') ?? '') === (prefix ?? '') &&
        (fcda.getAttribute('lnClass') ?? '') === (lnClass ?? '') &&
        (fcda.getAttribute('lnInst') ?? '') === (lnInst ?? '') &&
        (fcda.getAttribute('doName') ?? '') === (doName ?? '') &&
        (fcda.getAttribute('daName') ?? '') === (daName ?? '') &&
        fcda.parentElement?.getAttribute('name') === dataSetRef
    );

  console.log('fcda', candidateFCDAs, candidateFCDAs.length);
  return candidateFCDAs[0];
}

/**
 * Unsubscribing means removing a list of attributes from the ExtRef Element.
 *
 * @param extRef - The Ext Ref Element to clean from attributes.
 * @param eventElement - The element from which to initiate events.
 */
export function unsubscribe(extRef: Element, eventElement: HTMLElement): void {
  const updateAction = createUpdateAction(extRef, {
    intAddr: extRef.getAttribute('intAddr'),
    desc: extRef.getAttribute('desc'),
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

  const subscriberIed = extRef.closest('IED') || undefined;

  const removeSubscriptionActions: Delete[] = [];
  const controlBlock = findControlBlock(extRef);
  const fcdaElement = findFCDA(extRef, controlBlock);

  if (canRemoveSubscriptionSupervision(extRef))
    removeSubscriptionActions.push(
      ...removeSubscriptionSupervision(controlBlock, subscriberIed)
    );

  eventElement.dispatchEvent(
    newActionEvent({
      title: get(`subscription.disconnect`),
      actions: [updateAction, ...removeSubscriptionActions],
    })
  );

  eventElement.dispatchEvent(
    newSubscriptionChangedEvent(controlBlock, fcdaElement ?? undefined)
  );
}

/**
 * Subscribing means adding a list of attributes from the ExtRef Element and
 * instantiating a supervision element as required.
 * TODO: Add additional controls for supervision instantiation -- preferred LN or inst
 * or whether to re-use existing supervisions
 *
 * @param extRef - The ExtRef SCL element to bind to.
 * @param control - The GSEControl/SampledValueControl SCL referenced by the associated FCDA.
 * @param fcda - The FCDA SCL element that is being bound during subscription.
 * @param eventElement - The element from which to initiate events.
 */
export function subscribe(
  extRef: Element,
  control: Element,
  fcda: Element,
  eventTarget: HTMLElement
): void {
  const updateAction = updateExtRefElement(extRef, control, fcda);

  const subscriberIed = extRef.closest('IED') || undefined;
  const supervisionActions = instantiateSubscriptionSupervision(
    control,
    subscriberIed
  );

  eventTarget.dispatchEvent(
    newActionEvent({
      title: get(`subscription.connect`),
      actions: [updateAction, ...supervisionActions],
    })
  );

  eventTarget.dispatchEvent(newSubscriptionChangedEvent(control, fcda));
}
