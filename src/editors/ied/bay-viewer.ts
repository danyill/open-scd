import {
  css,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from 'lit-element';
import { renderIedContainer, styles } from './foundation.js';

/** [[`SubstationEditor`]] subeditor for a `Bay` element. */
@customElement('bay-viewer')
export class BayViewer extends LitElement {
  @property({ attribute: false })
  element!: Element;

  @property({ type: String })
  get name(): string {
    return this.element.getAttribute('name') ?? '';
  }
  @property({ type: String })
  get desc(): string | null {
    return this.element.getAttribute('desc') ?? null;
  }

  renderHeader(): TemplateResult {
    return html`<h3>
      ${this.name} ${this.desc === null ? '' : html`&mdash;`} ${this.desc}
    </h3>`;
  }

  render(): TemplateResult {
    return html`<section tabindex="0">
      ${this.renderHeader()}${renderIedContainer(this.element)}
    </section> `;
  }

  static styles = css`
    ${styles}

    section {
      margin: 0px;
    }
  `;
}

/* #ceContainer {
      display: grid;
      grid-gap: 12px;
      padding: 12px;
      box-sizing: border-box;
      grid-template-columns: repeat(auto-fit, minmax(64px, auto));
    } */

/* <div id="ceContainer">
        ${Array.from(
          this.element?.querySelectorAll(
            ':root > Substation > VoltageLevel > Bay > ConductingEquipment'
          ) ?? []
        ).map(
          voltageLevel => html``
           html`<conducting-equipment-editor
              .element=${voltageLevel}
            ></conducting-equipment-editor>` 
            )}
            </div> */
