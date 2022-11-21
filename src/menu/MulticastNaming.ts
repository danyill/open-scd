import {
  css,
  html,
  LitElement,
  property,
  query,
  state,
  TemplateResult,
} from 'lit-element';
import { translate } from 'lit-translate';
import { classMap } from 'lit-html/directives/class-map';

import '@material/mwc-dialog';
import '@material/mwc-formfield';
import '@material/mwc-radio';

import { Dialog } from '@material/mwc-dialog';

import './multicastNaming/control-list.js';

/** A menu [[`plugin`]] to apply a naming convention to multicast GOOSE and SMV traffic */
export default class MulticastNamingPlugin extends LitElement {
  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  @property({ attribute: false })
  doc!: XMLDocument;

  @query('mwc-dialog')
  dialog!: Dialog;

  @state()
  private publisherGOOSE = true;
  @state()
  private publisherSMV = true;
  @state()
  private protection1 = true;
  @state()
  private protection2 = true;

  async run(): Promise<void> {
    this.dialog.open = true;
  }

  render(): TemplateResult {
    return html`
    <mwc-dialog class="multicast-content" heading="${translate(
      'multicastNaming.heading'
    )}"
    <div class="multicast-naming-type-selector">
        <mwc-formfield label="GOOSE"
          ><mwc-checkbox
            value="GOOSE"
            ?checked=${this.publisherSMV}
            @checked=${() => (this.publisherSMV = !this.publisherSMV)}
          ></mwc-checkbox></mwc-formfield
        ><mwc-formfield label="SampledValue"
          ><mwc-checkbox
            value="SampledValue"
            ?checked=${this.publisherGOOSE}
            @checked=${() => (this.publisherGOOSE = !this.publisherGOOSE)}
          ></mwc-checkbox></mwc-formfield
        >
        <mwc-formfield label="Prot 1"
          ><mwc-checkbox ?checked=${true} @checked=${() =>
      (this.protection1 = !this.protection1)}></mwc-checkbox
        ></mwc-formfield>
        <mwc-formfield label="Prot 2"
          ><mwc-checkbox ?checked=${false} @checked=${() =>
      (this.protection2 = !this.protection2)}></mwc-checkbox
        ></mwc-formfield>
      </div>
      </div>
      <control-list
        .doc=${this.doc}
        ?publisherGOOSE=${this.publisherGOOSE}
        ?publisherSMV=${this.publisherSMV}
        ?protection1=${this.protection1}
        ?protection2=${this.protection2}
        ></control-list>
      <mwc-button
      outlined
      icon="drive_file_rename_outline"
      class="renameButton"
      label="Rename GOOSE and SMV"
      slot="primaryAction"
      >
      </mwc-button>
      <mwc-button
      slot="secondaryAction"
      dialogAction="close"
      label="${translate('close')}"
      style="--mdc-theme-primary: var(--mdc-theme-error)"
    ></mwc-button>
      </mwc-dialog>
      `;
  }

  static styles = css`
    .hidden {
      display: none;
    }

    mwc-dialog {
      --mdc-dialog-max-height: 80vh;
    }

    .publishertypeselector {
      margin: 4px 8px 8px;
      background-color: var(--mdc-theme-surface);
      width: calc(100% - 16px);
      justify-content: space-around;
    }
  `;
}
