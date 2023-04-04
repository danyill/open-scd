import '@material/dialog';
import '@material/mwc-button';
import { Dialog } from '@material/mwc-dialog';
import {
  css,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
} from 'lit-element';
import '@material/mwc-textfield';
import 'ace-custom-element';
import AceEditor from 'ace-custom-element';

import objectInspect from 'object-inspect';
import { translate } from 'lit-translate';
import { TextArea } from '@material/mwc-textarea';
/* ... */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reduceArgs = (formattedList: any[], arg: any) => [
  ...formattedList,
  objectInspect(arg),
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatArgs = (args: any[]) => args.reduce(reduceArgs, []).join(' ');

/**
 * Menu item to create a CSV File containing MAC address data for GSE and SMV data
 */
export default class InteractiveConsole extends LitElement {
  @property()
  doc!: XMLDocument;

  @property() docName!: string;

  @query('mwc-dialog')
  dialog!: Dialog;

  @query('#output')
  console!: AceEditor;

  @query('#input')
  codeRef!: AceEditor;

  fLog = '';

  fError = '';

  protected runCode(): void {
    this.fLog = '';
    this.fError = '';
    // const originalConsoleLogger = console.log;
    // const originalConsoleError = console.error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log = (...args: any[]) => {
      const formattedLog = formatArgs(args);
      this.fLog += '\n' + `${formattedLog}`;
      // originalConsoleLogger.call(console, ...args);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.error = (...args: any[]) => {
      const formattedError = formatArgs(args);
      this.fError += '\n' + `${formattedError}`;
      // originalConsoleError.call(console, ...args);
    };

    if (this.codeRef.value === null) return;
    const code = this.codeRef.value ?? '';
    if (code.length < 1) return;
    try {
      new Function(
        'doc',
        `;
      ${code}`
      )(this.doc);
    } catch (e) {
      console.error(e);
    }

    this.requestUpdate();

    this.console.value = `
    ${this.fLog}
  ${this.fError}`;
  }

  async run(): Promise<void> {
    this.dialog.open = true;
  }

  private renderDialog(): TemplateResult {
    return html`
    <mwc-dialog heading="Interactive Console">
    <h3>Input</h3>
    <ace-editor  id="input" 
    base-path="/public/ace"
    wrap
    soft-tabs
    style="width: 30vw; height: 50vh; font-size: 18px;"
    theme="ace/theme/solarized_light"
    mode="ace/mode/javascript"
  ></ace-editor>
  
  <h3>Output</h3>
  <ace-editor  id="output" 
  base-path="/public/ace"
  wrap
  soft-tabs
  style="width: 30vw; height: 50vh; font-size: 18px;"
  theme="ace/theme/solarized_light"
  mode="ace/mode/javascript"
></ace-editor>
  
  <mwc-button
  label="Run"
  slot="primaryAction"
  icon="add"
  @click=${this.runCode}
></mwc-button>
    <mwc-button
    slot="secondaryAction"
    dialogAction="close"
    label="${translate('close')}"
    style="--mdc-theme-primary: var(--mdc-theme-error)"
  ></mwc-button>
  </mwc-dialog>
    `;
  }

  render(): TemplateResult {
    if (!this.doc) return html``;

    return this.renderDialog();
  }

  static styles = css`
    mwc-dialog {
      width: 80vw;
    }

    mwc-textarea {
      width: 80vw;
      height: 20vw;
    }
  `;
}

//

// function makePath(fcda) {
//   bits = ['ldInst', 'prefix', 'lnClass', 'lnInst', 'doName', 'daName']
//   const [ldInst, prefix, lnClass, lnInst, doName, daName] = bits.map(bit => fcda.getAttribute(bit))
//   return `${ldInst}/${prefix ? prefix: ''}${lnClass}${lnInst ? lnInst : ''}/${doName}${daName ? `.${daName}` : ''}`
// }

// function res(){
//  doc.querySelectorAll('DataSet').forEach(ds => {
//    console.log(ds.getAttribute('name'))
//    ds.querySelectorAll('FCDA').forEach(fcda=>{
//      console.log(makePath(fcda))
//    })
//  })

// }

// res()

// console.log(doc)

// const ieds = Array.from(doc.querySelectorAll('IED'))

// ieds.forEach(ied => console.log(ied.getAttribute('name')))


// TODO:
// Make editor plugin
// Move to OpenSCD core
// Put input and output left and right
// Ctrl+S to format/beautify
// Look at the property inspector case problem.
// https://www.bayanbennett.com/posts/how-does-mdn-intercept-console-log-devlog-003/