import {
  css,
  html,
  LitElement,
  property,
  query,
  state,
  TemplateResult,
} from 'lit-element';
import { nothing, Template } from 'lit-html';
import { get, translate } from 'lit-translate';

import '@material/mwc-list/mwc-check-list-item';
import '@material/dialog';
import '@material/mwc-button';
import { Dialog } from '@material/mwc-dialog';
import { List } from '@material/mwc-list';
import { ListItemBase } from '@material/mwc-list/mwc-list-item-base';

import '../filtered-list.js';
import {
  createElement,
  identity,
  isPublic,
  newActionEvent,
  newLogEvent,
  newPendingStateEvent,
  selector,
  SimpleAction,
} from '../foundation.js';

function uniqueTemplateIedName(doc: XMLDocument, ied: Element): string {
  const [manufacturer, type] = ['manufacturer', 'type'].map(attr =>
    ied.getAttribute(attr)
  );
  const nameCore =
    manufacturer || type
      ? `${manufacturer ?? ''}${type ? '_' + type : ''}`
      : 'TEMPLATE_IED';

  const siblingNames = Array.from(doc.querySelectorAll('IED'))
    .filter(isPublic)
    .map(child => child.getAttribute('name') ?? child.tagName);
  if (!siblingNames.length) return nameCore + '_001';

  let newName = '';
  for (let i = 0; i < siblingNames.length + 1; i++) {
    const newDigit = (i + 1).toString().padStart(3, '0');
    newName = nameCore + '_' + newDigit;

    if (!siblingNames.includes(newName)) return newName;
  }

  return newName;
}

/**
 * Transfer namespaces from one element to another
 * @param destElement - Element to transfer namespaces to
 * @param sourceElement  - Element to transfer namespaces from
 */
function updateNamespaces(destElement: Element, sourceElement: Element) {
  Array.prototype.slice
    .call(sourceElement.attributes)
    .filter(attr => attr.name.startsWith('xmlns:'))
    .filter(attr => !destElement.hasAttribute(attr.name))
    .forEach(attr => {
      destElement.setAttributeNS(
        'http://www.w3.org/2000/xmlns/',
        attr.name,
        attr.value
      );
    });
}

function getSubNetwork(elements: Element[], element: Element): Element {
  const existElement = elements.find(
    item => item.getAttribute('name') === element.getAttribute('name')
  );
  return existElement ? existElement : <Element>element.cloneNode(false);
}

function addCommunicationElements(
  ied: Element,
  doc: XMLDocument
): SimpleAction[] {
  const actions = [];

  const oldCommunicationElement = doc.querySelector(':root > Communication');

  const communication = oldCommunicationElement
    ? oldCommunicationElement
    : createElement(doc, 'Communication', {});

  if (!oldCommunicationElement)
    actions.push({
      new: {
        parent: doc.querySelector(':root')!,
        element: communication,
      },
    });

  const connectedAPs = Array.from(
    ied.ownerDocument.querySelectorAll(
      `:root > Communication > SubNetwork > ConnectedAP[iedName="${ied.getAttribute(
        'name'
      )}"]`
    )
  );

  const createdSubNetworks: Element[] = [];

  connectedAPs.forEach(connectedAP => {
    const newSubNetwork = <Element>connectedAP.parentElement!;
    const oldSubNetworkMatch = communication.querySelector(
      `:root > Communication > SubNetwork[name="${newSubNetwork.getAttribute(
        'name'
      )}"]`
    );

    const subNetwork = oldSubNetworkMatch
      ? oldSubNetworkMatch
      : getSubNetwork(createdSubNetworks, newSubNetwork);
    const element = <Element>connectedAP.cloneNode(true);

    if (!oldSubNetworkMatch && !createdSubNetworks.includes(subNetwork)) {
      actions.push({
        new: {
          parent: communication,
          element: subNetwork,
        },
      });
      createdSubNetworks.push(subNetwork);
    }

    actions.push({
      new: {
        parent: subNetwork,
        element,
      },
    });
  });

  return actions;
}

function hasConnectionToIed(type: Element, ied: Element): boolean {
  const data: Element = type.parentElement!;
  const id = type.getAttribute('id');

  if (!data || !id) return false;

  if (type.tagName === 'EnumType')
    return Array.from(
      data.querySelectorAll(
        `DOType > DA[type="${id}"],DAType > BDA[type="${id}"]`
      )
    ).some(typeChild => hasConnectionToIed(typeChild.parentElement!, ied));

  if (type.tagName === 'DAType')
    return Array.from(
      data.querySelectorAll(
        `DOType > DA[type="${id}"],DAType > BDA[type="${id}"]`
      )
    ).some(typeChild => hasConnectionToIed(typeChild.parentElement!, ied));

  if (type.tagName === 'DOType')
    return Array.from(
      data.querySelectorAll(
        `LNodeType > DO[type="${id}"], DOType > SDO[type="${id}"]`
      )
    ).some(typeChild => hasConnectionToIed(typeChild.parentElement!, ied));

  return Array.from(ied.getElementsByTagName('LN0'))
    .concat(Array.from(ied.getElementsByTagName('LN')))
    .some(anyln => anyln.getAttribute('lnType') === id);
}

function addEnumType(
  ied: Element,
  enumType: Element,
  parent: Element
): SimpleAction | undefined {
  if (!hasConnectionToIed(enumType, ied)) return;

  const existEnumType = parent.querySelector(
    `EnumType[id="${enumType.getAttribute('id')}"]`
  );
  if (existEnumType && enumType.isEqualNode(existEnumType)) return;

  if (existEnumType) {
    // There is an `id` conflict in the project that must be resolved by
    // concatenating the IED name with the id
    const data: Element = enumType.parentElement!;
    const idOld = enumType.getAttribute('id');
    const idNew = ied.getAttribute('name')! + idOld;
    enumType.setAttribute('id', idNew);

    data
      .querySelectorAll(
        `DOType > DA[type="${idOld}"],DAType > BDA[type="${idOld}"]`
      )
      .forEach(type => type.setAttribute('type', idNew));
  }

  return {
    new: {
      parent,
      element: enumType,
    },
  };
}

function addDAType(
  ied: Element,
  daType: Element,
  parent: Element
): SimpleAction | undefined {
  if (!hasConnectionToIed(daType, ied)) return;

  const existDAType = parent.querySelector(
    `DAType[id="${daType.getAttribute('id')}"]`
  );
  if (existDAType && daType.isEqualNode(existDAType)) return;

  if (existDAType) {
    // There is an `id` conflict in the project that must be resolved by
    // concatenating the IED name with the id
    const data: Element | null = daType.parentElement!;
    const idOld = daType.getAttribute('id');
    const idNew = ied.getAttribute('name')! + idOld;
    daType.setAttribute('id', idNew);

    data
      .querySelectorAll(
        `DOType > DA[type="${idOld}"],DAType > BDA[type="${idOld}"]`
      )
      .forEach(type => type.setAttribute('type', idNew));
  }

  return {
    new: {
      parent,
      element: daType,
    },
  };
}

function addDOType(
  ied: Element,
  doType: Element,
  parent: Element
): SimpleAction | undefined {
  if (!hasConnectionToIed(doType, ied)) return;

  const existDOType = parent.querySelector(
    `DOType[id="${doType.getAttribute('id')}"]`
  );
  if (existDOType && doType.isEqualNode(existDOType)) return;

  if (existDOType) {
    // There is an `id` conflict in the project that must be resolved by
    // concatenating the IED name with the id
    const data: Element = doType.parentElement!;
    const idOld = doType.getAttribute('id');
    const idNew = ied.getAttribute('name')! + idOld;
    doType.setAttribute('id', idNew);

    data
      .querySelectorAll(
        `LNodeType > DO[type="${idOld}"], DOType > SDO[type="${idOld}"]`
      )
      .forEach(type => type.setAttribute('type', idNew));
  }

  return {
    new: {
      parent,
      element: doType,
    },
  };
}

function addLNodeType(
  ied: Element,
  lNodeType: Element,
  parent: Element
): SimpleAction | undefined {
  if (!hasConnectionToIed(lNodeType, ied)) return;

  const existLNodeType = parent.querySelector(
    `LNodeType[id="${lNodeType.getAttribute('id')}"]`
  );
  if (existLNodeType && lNodeType.isEqualNode(existLNodeType)) return;

  if (existLNodeType) {
    // There is an `id` conflict in the project that must be resolved by
    // concatenating the IED name with the id
    const idOld = lNodeType.getAttribute('id')!;
    const idNew = ied.getAttribute('name')!.concat(idOld);
    lNodeType.setAttribute('id', idNew);

    Array.from(
      ied.querySelectorAll(`LN0[lnType="${idOld}"],LN[lnType="${idOld}"]`)
    )
      .filter(isPublic)
      .forEach(ln => ln.setAttribute('lnType', idNew));
  }

  return {
    new: {
      parent,
      element: lNodeType,
    },
  };
}

function addDataTypeTemplates(ied: Element, doc: XMLDocument): SimpleAction[] {
  const actions: (SimpleAction | undefined)[] = [];

  const dataTypeTemplates = doc.querySelector(':root > DataTypeTemplates')
    ? doc.querySelector(':root > DataTypeTemplates')!
    : createElement(doc, 'DataTypeTemplates', {});

  if (!dataTypeTemplates.parentElement) {
    actions.push({
      new: {
        parent: doc.querySelector('SCL')!,
        element: dataTypeTemplates,
      },
    });
  }

  ied.ownerDocument
    .querySelectorAll(':root > DataTypeTemplates > LNodeType')
    .forEach(lNodeType =>
      actions.push(addLNodeType(ied, lNodeType, dataTypeTemplates!))
    );

  ied.ownerDocument
    .querySelectorAll(':root > DataTypeTemplates > DOType')
    .forEach(doType =>
      actions.push(addDOType(ied, doType, dataTypeTemplates!))
    );

  ied.ownerDocument
    .querySelectorAll(':root > DataTypeTemplates > DAType')
    .forEach(daType =>
      actions.push(addDAType(ied, daType, dataTypeTemplates!))
    );

  ied.ownerDocument
    .querySelectorAll(':root > DataTypeTemplates > EnumType')
    .forEach(enumType =>
      actions.push(addEnumType(ied, enumType, dataTypeTemplates!))
    );

  return <SimpleAction[]>actions.filter(item => item !== undefined);
}

function isIedNameUnique(ied: Element, doc: Document): boolean {
  const existingIedNames = Array.from(doc.querySelectorAll(':root > IED')).map(
    ied => ied.getAttribute('name')!
  );
  const importedIedName = ied.getAttribute('name')!;

  if (existingIedNames.includes(importedIedName)) return false;

  return true;
}

function resetSelection(dialog: Dialog): void {
  (
    (dialog.querySelector('filtered-list') as List).selected as ListItemBase[]
  ).forEach(item => (item.selected = false));
}

export default class ImportTemplateIedPlugin extends LitElement {
  @property({ attribute: false })
  doc!: XMLDocument;

  @state()
  importDocs?: XMLDocument[] = [];

  @query('#importTemplateIED-plugin-input') pluginFileUI!: HTMLInputElement;
  @query('mwc-dialog') dialog!: Dialog;

  @property({ attribute: false })
  inputSelected = false;

  async run(): Promise<void> {
    this.pluginFileUI.click();
  }

  async docUpdate(): Promise<void> {
    await ((this.getRootNode() as ShadowRoot).host as LitElement)
      .updateComplete;
  }

  private importTemplateIED(ied: Element): void {
    if (ied.getAttribute('name') === 'TEMPLATE') {
      const newIedName = uniqueTemplateIedName(this.doc, ied);

      ied.setAttribute('name', newIedName);

      Array.from(
        ied.ownerDocument.querySelectorAll(
          ':root > Communication > SubNetwork > ConnectedAP[iedName="TEMPLATE"]'
        )
      ).forEach(connectedAp => connectedAp.setAttribute('iedName', newIedName));
    }

    if (!isIedNameUnique(ied, this.doc)) {
      this.dispatchEvent(
        newLogEvent({
          kind: 'error',
          title: get('importTemplate.log.nouniqueied', {
            name: ied.getAttribute('name')!,
          }),
        })
      );
      return;
    }

    // This doesn't provide redo/undo capability as it is not using the Editing
    // action API. To use it would require us to cache the full SCL file in
    // OpenSCD as it is now which could use significant memory.
    // TODO: In open-scd core update this to allow including in undo/redo.
    updateNamespaces(
      this.doc.documentElement,
      ied.ownerDocument.documentElement
    );

    const dataTypeTemplateActions = addDataTypeTemplates(ied, this.doc);
    const communicationActions = addCommunicationElements(ied, this.doc);
    const actions = communicationActions.concat(dataTypeTemplateActions);
    actions.push({
      new: {
        parent: this.doc!.querySelector(':root')!,
        element: ied,
      },
    });

    this.dispatchEvent(
      newActionEvent({
        title: get('editing.import', { name: ied.getAttribute('name')! }),
        actions,
      })
    );
  }

  private async importTemplateIEDs(): Promise<void> {
    const selectedItems = <ListItemBase[]>(
      (<List>this.dialog.querySelector('filtered-list')).selected
    );

    // const ieds = selectedItems
    //   .map(item => {
    //     return this.importDoc!.querySelector(selector('IED', item.value));
    //   })
    //   .filter(ied => ied) as Element[];

    //   resetSelection(this.dialog);
    //   this.dialog.close();

    //   for (const ied of ieds) {
    //     this.importTemplateIED(ied);
    //     await this.docUpdate();
    //   }
  }

  public prepareImport(templateDoc: Document): void {
    if (!templateDoc) {
      this.dispatchEvent(
        newLogEvent({
          kind: 'error',
          title: get('importTemplate.log.loaderror'),
        })
      );
      return;
    }

    if (templateDoc.querySelector('parsererror')) {
      this.dispatchEvent(
        newLogEvent({
          kind: 'error',
          title: get('importTemplate.log.parsererror'),
        })
      );
      return;
    }

    const ied = templateDoc.querySelector(':root > IED[name="TEMPLATE"]');
    if (!ied) {
      this.dispatchEvent(
        newLogEvent({
          kind: 'error',
          title: get('importTemplate.log.missingied'),
        })
      );
      return;
    }
  }

  /** Loads the file `event.target.files[0]` into [[`src`]] as a `blob:...`. */
  protected async onLoadFiles(event: Event): Promise<void> {
    const files = Array.from(
      (<HTMLInputElement | null>event.target)?.files ?? []
    );

    const promises = files.map(async file => {
      const templateDoc = new DOMParser().parseFromString(
        await file.text(),
        'application/xml'
      );
      this.importDocs!.push(templateDoc);

      return this.prepareImport(templateDoc);
    });

    new Promise<void>((resolve, reject) =>
      Promise.allSettled(promises).then(
        () => resolve(),
        () => reject()
      )
    ).then(() => {
      this.inputSelected = false;
      this.render();
      this.dialog.show();
    });
  }

  protected renderInput(): TemplateResult {
    this.inputSelected = true;
    return html`<input multiple @change=${(event: Event) => {
      this.onLoadFiles(event);
      (<HTMLInputElement>event.target).value = '';
    }} id="importTemplateIED-plugin-input" accept=".icd" type="file"></input>`;
  }

  protected renderIcdListItem(doc: Document): TemplateResult {
    const templateIed = doc?.querySelector(':root > IED[name="TEMPLATE"]');
    const [
      manufacturer,
      type,
      desc,
      configVersion,
      originalSclVersion,
      originalSclRevision,
      originalSclRelease,
    ] = [
      'manufacturer',
      'type',
      'desc',
      'configVersion',
      'originalSclVersion',
      'originalSclRevision',
      'originalSclRelease',
    ].map(attr => templateIed?.getAttribute(attr));

    const firstLine = [manufacturer, type].filter(val => val !== null).join(' - ');

    const schemaInformation = [originalSclVersion, originalSclRevision, originalSclRelease]
      .filter(val => val !== null)
      .join('');
      
    const secondLine = [desc, configVersion, schemaInformation]
      .filter(val => val !== null)
      .join(' - ');


    return html`<mwc-list-item twoline value="${firstLine} ${secondLine}"
      >${firstLine}
      <span class="secondLine" slot="secondary">${secondLine}</span>
      <mwc-textfield
        required
        class="templateCount"
        placeholder="1"
        min="0"
        type="number"
        value="1"
        size="3"
        maxLength="3"
      ></mwc-textfield>
    </mwc-list-item>`;
  }

  protected renderIedSelection(): TemplateResult {
    return html`<mwc-dialog>
      <filtered-list>
        ${this.importDocs!.map(doc => {
          this.renderIcdListItem(doc);
        })}
      </filtered-list>
      <mwc-button
        dialogAction="close"
        label="${translate('close')}"
        slot="secondaryAction"
        style="--mdc-theme-primary: var(--mdc-theme-error)"
      ></mwc-button>
      <mwc-button
        label="IEDs"
        slot="primaryAction"
        icon="add"
        @click=${this.importTemplateIEDs}
      ></mwc-button>
    </mwc-dialog>`;
  }

  render(): TemplateResult {
    return this.inputSelected
      ? html`${this.renderIedSelection()}${this.renderInput()}`
      : html`${this.renderInput()}`;
  }

  static styles = css`
    input {
      width: 0;
      height: 0;
      opacity: 0;
    }

    mwc-list-item {
      display: flex;
    }

    mwc-textfield {
      align-items: center;
      padding-left: 150px;
      width: 200px;
      overflow: visible;
    }

    .secondLine {
      max-width: 100 px;
      overflow: visible;
    }
  `;
}
