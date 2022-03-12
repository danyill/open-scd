import { html, LitElement } from 'lit-element';

// import { get } from 'lit-translate';

import '@material/mwc-list/mwc-check-list-item';
import '@material/mwc-list';
// import { ListItemBase } from '@material/mwc-list/mwc-list-item-base';

import '../filtered-list.js';
import { newWizardEvent, Wizard } from '../foundation.js';

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

function doNothing() {
  console.log('I did nothing');
}

function createMACInfoWizard(
  lowestAddress: string,
  highestAddress: string,
  duplicates: string[] | []
): Wizard {
  return [
    {
      title: 'GOOSE MAC Address Information',
      // primary: {
      //   label: get('save'),
      //   icon: 'save',
      //   action: doNothing(duplicates),
      // },
      content: [
        html`<filtered-list multi>
          <mwc-check-list-item
            twoline
            selected
            value="${lowestAddress}"
            >
            <span>${lowestAddress}</span>
            <span slot="secondary"
            >Lowest GOOSE MAC Address</span
          ></mwc-check-list-item
          >
          <mwc-check-list-item
            twoline
            selected
            value="${highestAddress}"
            <span>${highestAddress}</span>
            <span slot="secondary"
            >Highest GOOSE MAC Address</span
          ></mwc-check-list-item
          >
          ${Array.from(
            duplicates.map(
              item =>
                html`<mwc-check-list-item twoline selected value="${item}">
                  <span>${item}</span>
                  <span slot="secondary"
                    >Duplicate MAC Address!</span
                  ></mwc-check-list-item
                >`
            )
          )}</filtered-list
        >`,
      ],
    },
  ];
}

/**
 * Plug-in to illustrate a menu plugin -- provides the highest and lowest MAC addresses used
 * and indicate any duplicates.
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

    console.log('Highest MAC address', convertToMacString(highestAddress));
    console.log('Lowest MAC address', convertToMacString(lowestAddress));
    let duplicates: string[] = [];
    if (hasDuplicates(sortedDecMacAddresses)) {
      console.log('Found at least one duplicate MAC address');
      duplicates = findDuplicates(sortedDecMacAddresses).map(address =>
        convertToMacString(address)
      );
    } else {
      console.log('Found no duplicates');
    }

    this.dispatchEvent(
      newWizardEvent(
        createMACInfoWizard(
          convertToMacString(lowestAddress),
          convertToMacString(highestAddress),
          duplicates
        )
      )
    );
  }
}
