import { html, LitElement } from 'lit-element';
import { get } from 'lit-translate';

import { SingleSelectedEvent } from '@material/mwc-list/mwc-list-foundation';

import {
  findControlBlocks,
  identity,
  isPublic,
  newWizardEvent,
  selector,
  Wizard,
  WizardAction,
  WizardActor,
  WizardInput,
} from '../../foundation.js';

import { controlBlockIcons } from '../../icons.js';
import { editClientLNsWizard } from '../../wizards/reportcontrolblock.js';
import { editExtRefsWizard } from '../../wizards/controlwithiedname.js';
import { createClientLnWizard } from '../../wizards/clientln.js';

export function openCommunicationMappingWizard(
  root: XMLDocument | Element
): WizardActor {
  return () => [() => communicationMappingWizard(root)];
}

export function getSinkReferences(root: Document | Element): Element[] {
  if (root instanceof Element && root.tagName === 'IED')
    return Array.from(root.ownerDocument.getElementsByTagName('ClientLN'))
      .filter(isPublic)
      .filter(
        clientLn =>
          clientLn.getAttribute('iedName') === root.getAttribute('name') ||
          clientLn.closest('IED') === root
      );

  return Array.from(root.getElementsByTagName('ClientLN')).filter(isPublic);
}

export function getSourceReferences(root: Document | Element): Element[] {
  return Array.from(root.getElementsByTagName('ExtRef'))
    .filter(isPublic)
    .filter(element => element.getAttribute('iedName'));
}

export function openCreateConnection(doc: Document): WizardActor {
  return (inputs: WizardInput[], wizard: Element): WizardAction[] => {
    return [() => createClientLnWizard(doc)];
  };
}

export function communicationMappingWizard(
  root: XMLDocument | Element
): Wizard {
  const connections = new Map<string, Element[]>();
  const sourceRefs = getSourceReferences(root);
  const sinkRefs = getSinkReferences(root);

  sinkRefs
    .filter(element => element.tagName === 'ClientLN')
    .forEach(element => {
      const controlBlock = element.parentElement!.parentElement!;
      const iedName = element.getAttribute('iedName');
      const key =
        identity(controlBlock) + ' | ' + controlBlock.tagName + ' | ' + iedName;
      if (!connections.has(key)) connections.set(key, []);
      connections.get(key)?.push(element);
    });

  sourceRefs.forEach(element => {
    const iedName = element.closest('IED')?.getAttribute('name') ?? '';
    const controlBlocks = findControlBlocks(element);
    controlBlocks.forEach(controlBlock => {
      const key =
        identity(controlBlock) + ' | ' + controlBlock.tagName + ' | ' + iedName;
      if (!connections.has(key)) connections.set(key, []);
      connections.get(key)?.push(element);
    });
    if (controlBlocks.size === 0) {
      const key = ' |  | ' + iedName;
      if (!connections.has(key)) connections.set(key, []);
      connections.get(key)?.push(element);
    }
  });

  return [
    {
      title: get('commMap.title'),
      primary: {
        icon: 'add',
        label: get('commMap.connectCB', { CbType: get('Report') }),
        action: openCreateConnection(
          root instanceof XMLDocument ? root : root.ownerDocument
        ),
      },
      content: [
        html`<filtered-list
          >${Array.from(connections.keys()).map(key => {
            const elements = connections.get(key)!;
            const [cbId, cbTag, sinkIED] = key.split(' | ');
            const cbElement = root.querySelector(selector(cbTag, cbId));
            const [_, sourceIED, controlBlock] = cbId.match(/^(.+)>>(.*)$/)!;

            return html`<mwc-list-item
              twoline
              graphic="icon"
              hasMeta
              @click="${(evt: SingleSelectedEvent) => {
                evt.target!.dispatchEvent(
                  newWizardEvent(
                    cbTag === 'ReportControl'
                      ? editClientLNsWizard(elements, root)
                      : editExtRefsWizard(elements, cbElement)
                  )
                );
                evt.target!.dispatchEvent(newWizardEvent());
              }}"
            >
              <span
                >${sourceIED}
                <mwc-icon style="--mdc-icon-size: 1em;">trending_flat</mwc-icon>
                ${sinkIED}</span
              >
              <span slot="secondary">${controlBlock}</span>
              <span slot="meta" style="padding-left: 10px"
                >${connections.get(key)!.length}</span
              >
              <mwc-icon slot="graphic">${controlBlockIcons[cbTag]}</mwc-icon>
            </mwc-list-item>`;
          })}</filtered-list
        >`,
      ],
    },
  ];
}
