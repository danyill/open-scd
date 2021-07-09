import {
  css,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from 'lit-element';

import { attachedIeds, renderIedContainer, styles } from './foundation.js';

import './ied-editor.js';
import './voltage-level-viewer.js';

/** [[`Substation`]] plugin viewer for read-only `Substation` sections. */
@customElement('substation-viewer')
export class SubstationViewer extends LitElement {
  /** The edited `Element`, a common property to render all Substation subeditors. */
  @property({ attribute: false })
  element!: Element;

  /** [[element | `element.name`]] */
  @property({ type: String })
  get name(): string {
    return this.element.getAttribute('name') ?? '';
  }
  /** [[element | `element.desc`]] */
  @property({ type: String })
  get desc(): string | null {
    return this.element.getAttribute('desc');
  }

  renderHeader(): TemplateResult {
    return html`
      <h1>
        ${this.name} ${this.desc === null ? '' : html`&mdash;`} ${this.desc}
      </h1>
    `;
  }

  render(): TemplateResult {
    return html`
      <section tabindex="0">
        ${this.renderHeader()} ${renderIedContainer(this.element)}
        ${Array.from(
          this.element.ownerDocument.querySelectorAll(
            ':root > Substation > VoltageLevel'
          )
        ).map(
          voltageLevel =>
            html`<voltage-level-viewer
              .element=${voltageLevel}
            ></voltage-level-viewer>`
        )}
      </section>
    `;
  }

  static styles = css`
    ${styles}

    section {
      overflow: hidden;
    }

    :host {
      width: 100vw;
    }
  `;
}
