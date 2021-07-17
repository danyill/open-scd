import { customElement, html, property, TemplateResult } from 'lit-element';
import { identity, selector } from './foundation.js';

import { Directory, FinderPane, FinderItem } from './finder-pane.js';
import { elementUpdated } from '@open-wc/testing';

const dataModelTags = ['LDevice', 'LN0', 'LN', 'DO', 'SDO', 'DA', 'BDA'];

function getChildren(parent: Element): Element[] {
  if (parent.tagName === 'LN0' || parent.tagName === 'LN')
    return Array.from(
      parent?.ownerDocument?.querySelector(
        `LNodeType[id="${parent.getAttribute('lnType')}"]`
      )?.children ?? []
    );

  if (parent.tagName === 'LDevice') return Array.from(parent?.children ?? []);

  if (parent.tagName === 'DO' || parent.tagName === 'SDO')
    return Array.from(
      parent.ownerDocument.querySelector(
        `DOType[id="${parent.getAttribute('type')}"]`
      )?.children ?? []
    );

  if (parent.tagName === 'DA' || parent.tagName === 'BDA')
    return Array.from(
      parent.ownerDocument.querySelector(
        `DAType[id="${parent.getAttribute('type')}"]`
      )?.children ?? []
    );

  return [];
}

function getElement(
  identity: string | number,
  level: number,
  doc: XMLDocument
): Element | null {
  if (level === 1) return doc.querySelector(selector('LDevice', identity));

  for (const tag of ['LN0', 'LN', 'DO', 'SDO', 'DA', 'BDA']) {
    const element = doc.querySelector(selector(tag, identity));
    if (element) return element;
  }

  return null;
}

function getDisplayName(element: Element): string {
  if (element.tagName === 'LN0' || element.tagName === 'LN')
    return `${element.getAttribute('prefix') ?? ''}${
      element.getAttribute('lnClass') ?? ''
    }${element.getAttribute('inst') ?? ''}`;

  if (element.tagName === 'LDevice')
    return element.getAttribute('name')
      ? element.getAttribute('name') ?? ''
      : element.getAttribute('inst') ?? '';

  return element.getAttribute('name') ?? '';
}

async function getDataModel(
  path: FinderItem[],
  root: Element
): Promise<Directory> {
  const id = path[path.length - 1].identity;

  if (path.length === 0 || !id)
    return {
      content: html``,
      children: Array.from(root.querySelectorAll('LDevice')).map(lDevice => {
        return {
          name: lDevice.getAttribute('inst')!,
          identity: identity(lDevice),
        };
      }),
    };

  const parent = getElement(id, path.length - 1, root.ownerDocument);

  const children = parent
    ? getChildren(parent)
        .filter(child => dataModelTags.includes(child.tagName))
        .map(child => {
          return {
            name: getDisplayName(child),
            identity: identity(child),
          };
        })
    : [];

  return { content: html``, children };
}

@customElement('data-model-pane')
export class DataModelPane extends FinderPane {
  @property()
  element!: Element;

  render(): TemplateResult {
    return html`<finder-pane
      .element=${this.element}
      .path=${[{ name: 'LDevice' }]}
      .getChildren=${getDataModel}
    ></finder-pane>`;
  }
}
