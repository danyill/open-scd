import { LitElement, html, TemplateResult, property, css } from 'lit-element';
import { translate, get } from 'lit-translate';

import { styles } from './ied/foundation.js';

import './ied/substation-viewer.js';

/** An editor [[`plugin`]] for editing the `Substation` section. */
export default class IedPlugin extends LitElement {
  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  @property()
  doc!: XMLDocument;

  render(): TemplateResult {
    if (!this.doc?.querySelector('IED'))
      return html`<h1>
        <span style="color: var(--base1)"
          >${translate('substation.missing')}</span
        >
        <mwc-fab extended icon="add" label="${get('import.ied')}"></mwc-fab>
      </h1>`;
    return html`
      ${Array.from(this.doc.querySelectorAll(':root > Substation') ?? []).map(
        substation =>
          html`<substation-viewer .element=${substation}></substation-viewer>`
      )}
    `;
  }

  static styles = css`
    ${styles}

    mwc-fab {
      position: fixed;
      bottom: 32px;
      right: 32px;
    }

    :host {
      width: 100vw;
    }
  `;
}
