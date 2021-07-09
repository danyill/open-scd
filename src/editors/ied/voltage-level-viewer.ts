import {
  LitElement,
  TemplateResult,
  customElement,
  html,
  property,
  css,
} from 'lit-element';

import { renderIedContainer, styles } from './foundation.js';
import './bay-viewer.js';

/** [[`Substation`]] subeditor for a `VoltageLevel` element. */
@customElement('voltage-level-viewer')
export class VoltageLevelViewer extends LitElement {
  @property()
  element!: Element;

  @property()
  get name(): string {
    return this.element.getAttribute('name') ?? '';
  }
  @property()
  get desc(): string | null {
    return this.element.getAttribute('desc') ?? null;
  }
  @property()
  get voltage(): string | null {
    const V = this.element.querySelector(
      ':root > Substation > VoltageLevel > Voltage'
    );
    if (V === null) return null;
    const v = V.textContent ?? '';
    const m = V.getAttribute('multiplier');
    const u = m === null ? 'V' : ' ' + m + 'V';
    return v ? v + u : null;
  }

  renderHeader(): TemplateResult {
    return html`<h2>
      ${this.name} ${this.desc === null ? '' : html`&mdash;`} ${this.desc}
      ${this.voltage === null ? '' : html`(${this.voltage})`}
    </h2>`;
  }

  render(): TemplateResult {
    return html`<section tabindex="0">
      ${this.renderHeader()} ${renderIedContainer(this.element)}
      <div id="bayContainer">
        ${Array.from(
          this.element?.ownerDocument.querySelectorAll(
            ':root > Substation > VoltageLevel > Bay'
          ) ?? []
        ).map(bay => html`<bay-viewer .element=${bay}></bay-viewer>`)}
      </div>
    </section>`;
  }

  static styles = css`
    ${styles}

    section {
      background-color: var(--mdc-theme-on-primary);
    }

    #bayContainer {
      display: grid;
      grid-gap: 12px;
      padding: 8px 12px 16px;
      box-sizing: border-box;
      grid-template-columns: repeat(auto-fit, minmax(316px, auto));
    }

    @media (max-width: 387px) {
      #bayContainer {
        grid-template-columns: repeat(auto-fit, minmax(196px, auto));
      }
    }
  `;
}
