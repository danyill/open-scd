import { css, html, TemplateResult } from 'lit-element';

import { isPublic } from '../../foundation.js';

export type ElementEditor = Element & {
  element: Element;
};

export function renderIedContainer(element: Element): TemplateResult {
  return html`<div id="iedcontainer">
    ${attachedIeds(element).map(
      ied => html`<ied-editor .element=${ied}></ied-editor>`
    )}
  </div>`;
}

function containsReference(element: Element, iedName: string): boolean {
  return (
    Array.from(element.querySelectorAll('LNode'))
      .filter(isPublic)
      .filter(lnode => lnode.getAttribute('iedName') === iedName).length !== 0
  );
}

function isMultiparent(element: Element, iedName: string): boolean {
  return (
    (<Element[]>(
      Array.from(element.childNodes).filter(child => child instanceof Element)
    )).filter(element => containsReference(element, iedName)).length > 1
  );
}

function isReference(element: Element, iedName: string): boolean {
  return (
    (<Element[]>(
      Array.from(element.childNodes).filter(child => child instanceof Element)
    )).filter(
      element =>
        element.tagName === 'LNode' &&
        element.getAttribute('iedName') === iedName
    ).length !== 0
  );
}

export function attachedIeds(element: Element): Element[] {
  const doc = element.ownerDocument;

  const ieds = Array.from(doc.querySelectorAll(':root > IED'));

  const attachedIeds: Element[] = [];

  ieds.forEach(ied => {
    const iedName = ied.getAttribute('name')!;
    if (
      (isMultiparent(element, iedName) &&
        !isMultiparent(element.parentElement!, iedName)) ||
      (isReference(element, iedName) &&
        !isMultiparent(element.parentElement!, iedName))
    )
      attachedIeds.push(ied);
  });

  return attachedIeds;
}

/** Common `CSS` styles used by substation subeditors */
export const styles = css`
  :host(.moving) section {
    opacity: 0.3;
  }

  section {
    background-color: var(--mdc-theme-surface);
    transition: all 200ms linear;
    outline-color: var(--mdc-theme-primary);
    outline-style: solid;
    outline-width: 0px;
    margin: 8px 12px 16px;
    opacity: 1;
  }

  section:focus {
    box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
      0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
  }

  section:focus-within {
    outline-width: 2px;
    transition: all 250ms linear;
  }

  h1,
  h2,
  h3 {
    color: var(--mdc-theme-on-surface);
    font-family: 'Roboto', sans-serif;
    font-weight: 300;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    margin: 0px;
    line-height: 48px;
    padding-left: 0.3em;
    transition: background-color 150ms linear;
  }

  section:focus-within > h1,
  section:focus-within > h2,
  section:focus-within > h3 {
    color: var(--mdc-theme-surface);
    background-color: var(--mdc-theme-primary);
    transition: background-color 200ms linear;
  }

  h1 > nav,
  h2 > nav,
  h3 > nav,
  h1 > abbr > mwc-icon-button,
  h2 > abbr > mwc-icon-button,
  h3 > abbr > mwc-icon-button {
    float: right;
  }

  abbr {
    text-decoration: none;
    border-bottom: none;
  }

  #iedcontainer {
    display: grid;
    grid-gap: 12px;
    padding: 8px 12px 16px;
    box-sizing: border-box;
    grid-template-columns: repeat(auto-fit, minmax(64px, auto));
  }
`;
