import {
  css,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
} from 'lit-element';

import './subscription/fcda-binding-list.js';
import './subscription/later-binding/ext-ref-later-binding-list.js';
import './subscription/later-binding/ext-ref-later-binding-list-subscriber.js';

/** An editor [[`plugin`]] for Subscribe Later Binding (GOOSE). */
export default class GooseSubscribeLaterBindingPlugin extends LitElement {
  @property({ attribute: false })
  doc!: XMLDocument;

  @query('div.container')
  containerElement!: Element;

  @property({ attribute: false })
  subscriberView = false;

  protected firstUpdated(): void {
    this.addEventListener('change-view', () => {
      this.subscriberView = !this.subscriberView;
    });
  }

  render(): TemplateResult {
    if (this.subscriberView) {
      console.log('We are the subscriber view');
      return html`<div class="container" ?subscriberview=${this.subscriberView}>
        <fcda-binding-list
          class="column"
          controlTag="GSEControl"
          .subscriberview="${this.subscriberView}"
          .includeLaterBinding="${true}"
          .doc="${this.doc}"
        >
        </fcda-binding-list>
        <extref-later-binding-list-subscriber
          class="column"
          controlTag="GSEControl"
          .doc="${this.doc}"
        ></extref-later-binding-list-subscriber>
      </div>`;
    }
    console.log('we are the publisher view');
    return html`<div class="container" ?subscriberview=${this.subscriberView}>
      <fcda-binding-list
        class="column"
        controlTag="GSEControl"
        .subscriberview="${this.subscriberView}"
        .includeLaterBinding="${true}"
        .doc="${this.doc}"
      >
      </fcda-binding-list>
      <extref-later-binding-list
        class="column"
        controlTag="GSEControl"
        .includeLaterBinding="${true}"
        .doc="${this.doc}"
      ></extref-later-binding-list>
    </div>`;
  }

  static styles = css`
    :host {
      width: 100vw;
    }

    .container {
      display: flex;
      padding: 8px 6px 16px;
      height: calc(100vh - 136px);
      flex: auto;
    }

    .container:not(subscriberview) {
      flex-direction: row;
    }

    .container[subscriberview] {
      flex-direction: row-reverse;
    }

    .container[subscriberview] .column {
      flex: auto 1 1;
    }

    .container[subscriberview] fcda-binding-list.column {
      flex: auto 2 1;
    }

    .column {
      flex: 50%;
      margin: 0px 6px 0px;
      min-width: 300px;
      height: 100%;
      overflow-y: auto;
    }
  `;
}
