import { LitElement, property } from 'lit-element';

const FILE_EXTENSION_LENGTH = 3;

export function stripExtensionFromName(docName: string): string {
  let name = docName;
  // Check if the name includes a file extension, if the case remove it.
  if (
    name.length > FILE_EXTENSION_LENGTH &&
    name.lastIndexOf('.') == name.length - (FILE_EXTENSION_LENGTH + 1)
  ) {
    name = name.substring(0, name.lastIndexOf('.'));
  }
  return name;
}

/**
 * Menu item to create a CSV File containing MAC address data for GSE and SMV data
 */
export default class ExportIEDMulticastAddressesPlugin extends LitElement {
  @property() doc!: XMLDocument;
  @property() docName!: string;

  async run(): Promise<void> {
    const csvLines: string[][] = [];
    // header
    csvLines.push([
      'iedName',
      'type',
      'cbName',
      'ldInst',
      'apName',
      'MAC-Address',
      'APPID',
      'VLAN-PRIORITY',
      'VLAN-ID',
      'MinTime',
      'MaxTime',
    ]);
    // content
    this.doc
      .querySelectorAll(
        ':scope > Communication > SubNetwork > ConnectedAP > GSE, SMV'
      )
      .forEach(commElement => {
        const iedName =
          commElement.parentElement?.getAttribute('iedName') ?? '';
        const type = commElement.tagName
        const cbName = commElement.getAttribute('cbName') ?? '';
        const ldInst = commElement.getAttribute('ldInst') ?? '';
        const apName = commElement.parentElement?.getAttribute('apName') ?? '';
        const mac =
          commElement.querySelector('Address > P[type="MAC-Address"]')
            ?.textContent ?? '';
        const appId =
          commElement.querySelector('Address > P[type="APPID"]')?.textContent ??
          '';
        const vlanPriority =
          commElement.querySelector('Address > P[type="VLAN-PRIORITY"]')
            ?.textContent ?? '';
        const vlanId =
          commElement.querySelector('Address > P[type="VLAN-ID"]')
            ?.textContent ?? '';
        const minTime = commElement.querySelector('MinTime')?.textContent ?? '';
        const maxTime = commElement.querySelector('MaxTime')?.textContent ?? '';
        csvLines.push([
          iedName,
          type,
          cbName,
          ldInst,
          apName,
          mac,
          appId,
          vlanPriority,
          vlanId,
          minTime,
          maxTime,
        ].map(val => `"${val}"`));
      });

    const content: string[] = [];
    csvLines.forEach(lineData => content.push(lineData.join(',')));

    const fileContent = content.join('\n');

    const blob = new Blob([fileContent], {
      type: 'text/csv',
    });

    // Push the data back to the user.
    const a = document.createElement('a');
    a.download = stripExtensionFromName(this.docName) + '-ied-params.csv';
    a.href = URL.createObjectURL(blob);
    a.dataset.downloadurl = ['text/csv', a.download, a.href].join(':');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 5000);
  }
}
