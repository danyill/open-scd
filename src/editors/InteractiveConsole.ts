'use strict';

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

import { styles } from './templates/foundation.js';

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

    this.console.value = `${this.fLog}
  ${this.fError}`;
  }

  render(): TemplateResult {
    if (!this.doc) return html``;

    let defaultInput = `const ieds = doc.querySelectorAll('IED');

    ieds.forEach((ied) => {
      const name = ied.getAttribute('name');
      // console.log(name);
    });
    
    const headers = [
      'ldInst',
      'prefix',
      'lnClass',
      'lnInst',
      'doName',
      'daName',
      'fc',
    ];
    
    doc.querySelectorAll('DataSet').forEach((ds) => {
      const iedName = ds.closest('IED')?.getAttribute('name');
      if (iedName) console.log(iedName);
    
      const dsName = ds.getAttribute('dsName');
      if (dsName) console.log(dsName);
    
      ds.querySelectorAll('FCDA').forEach((fcda) => {
        const [ldInst, prefix, lnClass, lnInst, doName, daName, fc] = headers.map(
          (attr) => fcda.getAttribute(attr) ?? ''
        );
    
        const name = #~{ldInst}/~{prefix}~{lnClass}~{lnInst}/~{doName}~{
          daName ? #.~{daName}# : ##
        }#;
        console.log(#~{name}, ~{fc}#);
      });
    });
    `;
    defaultInput = defaultInput.replace(/#/g, '`').replace(/~/g, '$');

    return html`
      <section>
        <div class="column">
          <h2>Javascript Input</h3>
          <ace-editor
            id="input"
            base-path="/public/ace"
            wrap
            soft-tabs
            style="font-size: 18px;"
            theme="ace/theme/solarized_light"
            mode="ace/mode/javascript"
            value="${defaultInput}"
          ></ace-editor>
          <mwc-button
            outlined
            label="Run"
            slot="primaryAction"
            icon="play"
            @click=${this.runCode}
          ></mwc-button>
        </div>
        <div class="column">
          <h2>Console Output</h3>
          <ace-editor
            id="output"
            base-path="/public/ace"
            wrap
            soft-tabs
            style="font-size: 18px;"
            theme="ace/theme/solarized_light"
            mode="ace/mode/javascript"
          ></ace-editor>
        </div>
      </section>
    `;
  }

  static styles = css`
    ${styles}

    :host {
      width: 100vw;
      height: 100vh;
    }

    #input {
      width: 100%;
      height: 70vh;
    }

    #output {
      width: 100%;
      height: 73vh;
    }

    section {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      padding: 20px;
    }

    .column {
      display: flex;
      flex: 1;
      flex-direction: column;
      justify-content: space-between;
    }
  `;
}

// TODO:
// Make editor plugin
// Move to OpenSCD core
// Put input and output left and right
// Ctrl+S to format/beautify
// Look at the property inspector case problem.
// https://www.bayanbennett.com/posts/how-does-mdn-intercept-console-log-devlog-003/

// Remove Update Create Move

// send off events

// https://github.com/ajaxorg/ace/issues/4060
// Uncaught DOMException: Failed to execute 'importScripts' on 'WorkerGlobalScope': The script at 'http://localhost:8080/public/ace/worker-javascript.js' failed to load. snowpack
