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
import { SingleSelectedEvent } from '@material/mwc-list/mwc-list-foundation.js';

const controlTag = 'GSEControl';

/** An editor [[`plugin`]] for Subscribe Later Binding (GOOSE). */
export default class GooseSubscribeLaterBindingPlugin extends LitElement {
  @property({ attribute: false })
  doc!: XMLDocument;

  @query('div.container')
  containerElement!: Element;

  @property({ type: Boolean })
  get subscriberView(): boolean {
    return (
      localStorage.getItem(`subscriber-later-binding-smv$change-view`) ===
        'true' ?? false
    );
  }

  set subscriberView(value: boolean) {
    const oldValue = this.subscriberView;
    localStorage.setItem(
      `subscriber-later-binding-smv$change-view`,
      `${value}`
    );
    this.requestUpdate('subscriberView', oldValue);
  }

  protected firstUpdated(): void {
    this.addEventListener('change-view', () => {
      this.subscriberView = !this.subscriberView;
      localStorage.setItem(
        'subscriber-later-binding-goose$change-view',
        `${this.subscriberView}`
      );
    });
  }

  renderExtRef(): TemplateResult {
    if (this.subscriberView) {
      return html`<extref-later-binding-list-subscriber
        class="column"
        controlTag="${controlTag}"
        .doc=${this.doc}
      ></extref-later-binding-list-subscriber>`;
    } else {
      return html`<extref-later-binding-list
        class="column"
        controlTag="${controlTag}"
        .doc=${this.doc}
        @selected=${(ev: SingleSelectedEvent) => {
          console.log(this, ev);
        }}
      ></extref-later-binding-list>`;
    }
  }

  render(): TemplateResult {
    return html`<div class="container" ?subscriberview=${this.subscriberView}>
      <fcda-binding-list
        class="column"
        controlTag="${controlTag}"
        ?subscriberview="${this.subscriberView}"
        ?includeLaterBinding=${true}
        .doc=${this.doc}
      >
      </fcda-binding-list>
      ${this.renderExtRef()}
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
    }

    .container:not(subscriberview) {
      flex-direction: row;
    }

    .container[subscriberview] {
      width: 100%;
      flex-direction: row-reverse;
    }

    .container[subscriberview] fcda-binding-list.column {
      flex: 1;
      width: 25%;
    }

    .column {
      flex: 50%;
      margin: 0px 6px 0px;
      min-width: 300px;
      height: 100%;
      overflow-y: auto;
    }

    @media (min-width: 700px) {
      .container[subscriberview] {
        width: calc(100vw - 20px);
        flex: auto;
      }

      .container[subscriberview] extref-later-binding-list-subscriber.column {
        resize: horizontal;
        width: 65%;
        flex: none;
      }

      .container[subscriberview] fcda-binding-list.column {
        width: auto;
      }
    }
  `;
}
