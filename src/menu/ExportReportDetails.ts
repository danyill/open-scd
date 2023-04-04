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
export default class ExportReportDetailsPlugin extends LitElement {
  @property() doc!: XMLDocument;
  @property() docName!: string;

  async run(): Promise<void> {
    const csvLines: string[][] = [];
    // header
    const headers = ['ldInst', 'prefix', 'lnClass', 'lnInst', 'doName', 'daName', 'fc']
    csvLines.push(headers);
    // content
    this.doc
      .querySelectorAll(
        ':scope > IED DataSet'
      )
      .forEach(ds => {
        csvLines.push([ds.getAttribute('name') ?? ''])
        ds.querySelectorAll('FCDA').forEach(fcda => {
          const [ldInst, prefix, lnClass, lnInst, doName, daName, fc] = headers.map(attr => fcda.getAttribute(attr) ?? '')

          const name = `${ldInst}/${prefix}${lnClass}${lnInst}/${doName}${daName ? `.${daName}` : ``}`
          csvLines.push([
            name,
            fc
          ].map(val => `"${val}"`));
        })
      })

    const content: string[] = [];
    csvLines.forEach(lineData => content.push(lineData.join(',')));

    const fileContent = content.join('\n');

    const blob = new Blob([fileContent], {
      type: 'text/csv',
    });

    // Push the data back to the user.
    const a = document.createElement('a');
    a.download = stripExtensionFromName(this.docName) + '-ied-report-params.csv';
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
