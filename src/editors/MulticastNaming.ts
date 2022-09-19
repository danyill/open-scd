import {
  css,
  html,
  LitElement,
  property,
  state,
  TemplateResult,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

import '@material/mwc-formfield';
import '@material/mwc-radio';

import './multicastNaming/ied-list.js';
// import './publisher/report-control-editor.js';
// import './publisher/gse-control-editor.js';
// import './publisher/sampled-value-control-editor.js';
// import './publisher/data-set-editor.js';

/** An editor [[`plugin`]] to configure `Report`, `GOOSE`, `SampledValue` control blocks and its `DataSet` */
export default class TPMulticastNaming extends LitElement {
  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  doc!: XMLDocument;

  @state()
  @property({ attribute: false })
  messageType = 'GOOSE';
  // messageType: 'GOOSE' | 'SampledValue';

  render(): TemplateResult {
    return html`
      <div class="plugin">
        <div class="message-type-selector">
          <mwc-formfield label="GOOSE"
            ><mwc-radio
              value="GOOSE"
              ?checked=${this.messageType === 'GOOSE'}
              @checked=${() => (this.messageType = 'GOOSE')}
            ></mwc-radio></mwc-formfield
          ><mwc-formfield label="SampledValue"
            ><mwc-radio
              value="SampledValue"
              ?checked=${this.messageType === 'SampledValue'}
              @checked=${() => (this.messageType = 'SampledValue')}
            ></mwc-radio
          ></mwc-formfield>
          <div class="container">
            <div class="ied-list column">
              <ied-list class="row" .doc=${this.doc}></ied-list>
              </div>
            <div class="details column">
              <h2>blah blah blah</h2>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static styles = css`

    :host {
      width: 100vw;
    }

    .container {
      display: flex;
      padding: 8px 6px 16px;
      height: calc(100vh - 200px);
    }

    .column {
      margin: 0px 6px 0px;
      min-width: 300px;
      height: 100%;
      overflow-y: auto;
    }

    .ied-list {
      width:400px;
    }

    .message-type-selector {
      margin: 4px 8px 8px;
      background-color: var(--mdc-theme-surface);
      width: calc(100% - 16px);
      justify-content: space-around;
    }
  `;
}
