import { LitElement, html, TemplateResult, property, css } from 'lit-element';
import { translate, get } from 'lit-translate';
import { isPublic } from '../foundation.js';

import { styles } from './ied/foundation.js';

import './ied/substation-viewer.js';

function unreferencedIeds(doc: XMLDocument): Element[] {
  const ieds = Array.from(doc.querySelectorAll(':root > IED'));

  const unreferencedIeds: Element[] = [];

  ieds.forEach(ied => {
    const iedName = ied.getAttribute('name')!;
    if (
      Array.from(doc.querySelectorAll('LNode'))
        .filter(isPublic)
        .filter(lnode => lnode.getAttribute('iedName') === iedName).length === 0
    )
      unreferencedIeds.push(ied);
  });

  return unreferencedIeds;
}

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
      <div id="iedcontainer">
        ${unreferencedIeds(this.doc).map(
          ied => html`<ied-editor .element=${ied}></ied-editor>`
        )}
      </div>
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
