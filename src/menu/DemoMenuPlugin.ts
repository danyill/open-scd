import { html, LitElement, TemplateResult } from 'lit-element';

// import { css, html, LitElement, query, TemplateResult } from 'lit-element';
// import { get } from 'lit-translate';

import '@material/mwc-list/mwc-check-list-item';
// import { List } from '@material/mwc-list';
// import { ListItemBase } from '@material/mwc-list/mwc-list-item-base';

import '../filtered-list.js';
// import {
//   cloneElement,
//   identity,
//   isPublic,
//   newWizardEvent,
//   SCLTag,
//   selector,
//   Wizard,
//   WizardAction,
//   WizardActor,
//   WizardInput,
// } from '../foundation.js';

/**
 * Checks if an array contains duplicate values.
 * @param arr - an array of values.
 * @returns true if the array has multiple identical values, otherwise false.
 */
function hasDuplicates(arr: number[]) {
  return new Set(arr).size !== arr.length;
}

/**
 * requires a sorted array
 */
function findDuplicates(arr: number[] | []) {
  // JS by default uses a crappy string compare.
  // (we use slice to clone the array so the
  // original array won't be modified)
  const results = [];
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i + 1] == arr[i]) {
      results.push(arr[i]);
    }
  }
  return results;
}

/**
 * Converts a numeric value into a human readable MAC address.
 * @param address - an integer representing a MAC address.
 * @returns a human readable MAC address.
 */
function convertToMacString(address: number) {
  const hexString = address.toString(16);
  // pad the string out if required
  const prefix = '0'.repeat(12 - hexString.length);
  // split the string every two characters
  const readableMac = (prefix + hexString).match(/.{2}/g)!.join('-');
  return readableMac.toUpperCase();
}

/**
 * Plug-in to illustrate a menu plugin -- provides the highest and lowest MAC addresses used.
 */
export default class MenuPluginDemo extends LitElement {
  /** The document being edited as provided to plugins by [[`OpenSCD`]]. */
  doc!: XMLDocument;

  // @query('#plugin-input') pluginFileUI!: HTMLInputElement;

  /** Entry point for this plug-in */
  async run(): Promise<void> {
    console.log('I am awake');
    // this.render()
    console.log(this.doc);
    const macAddresses = Array.from(
      this.doc.querySelectorAll(
        ':root > Communication > SubNetwork > ConnectedAP > GSE > Address > P[type="MAC-Address"]'
      ) ?? []
    );
    const sortedDecMacAddresses = macAddresses.map(mA =>
      parseInt(mA.textContent!.replace(/-/g, ''), 16)
    );

    const highestAddress = Math.max(...sortedDecMacAddresses);
    const lowestAddress = Math.min(...sortedDecMacAddresses);

    console.log(convertToMacString(highestAddress));
    console.log(convertToMacString(lowestAddress));
    if (hasDuplicates(sortedDecMacAddresses)) {
      console.log('Found at least one duplicate MAC address');
      console.log(
        findDuplicates(sortedDecMacAddresses).map(address =>
          convertToMacString(address)
        )
      );
    } else {
      console.log('Found no duplicates');
    }

    // console.log(macAddressesAsHex)
    // .map(
    //   dotype =>
    //     html`<mwc-list-item
    //       twoline
    //       value="${identity(dotype)}"
    //       tabindex="0"
    //       hasMeta
    //       ><span>${dotype.getAttribute('id')}</span
    //       ><span slot="secondary">${dotype.getAttribute(
    //         'cdc'
    //       )}</span></span><span slot="meta"
    //         >${dotype.querySelectorAll('SDO, DA').length}</span
    //       ></mwc-list-item
    //     >`
    // )
  }

  //           @closing=${console.log("Was closed")}
  render(): TemplateResult {
    return html` <mwc-dialog id="settings" heading="Stuff">
      <wizard-divider></wizard-divider>
      <section>
        <h3>Hi</h3>
        <span>blah</span>
      </section>
      <mwc-button
        icon="save"
        trailingIcon
        slot="primaryAction"
        dialogAction="save"
      >
        ${`OK`}
      </mwc-button>
    </mwc-dialog>`;
  }
}
