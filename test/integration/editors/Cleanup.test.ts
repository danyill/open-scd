import { html, fixture, expect } from '@open-wc/testing';

import { Editing } from '../../../src/Editing.js';
import Cleanup from '../../../src/editors/Cleanup.js';
import { Wizarding } from '../../../src/Wizarding.js';

describe('Cleanup', () => {
  customElements.define('cleanup-plugin', Wizarding(Editing(Cleanup)));
  let element: Cleanup;

  beforeEach(async () => {
    element = await fixture(html`<cleanup-plugin></cleanup-plugin>`);
  });

  describe('without a doc loaded', () => {
    it('looks like the latest snapshot', async () => {
      await expect(element).shadowDom.to.equalSnapshot();
    });
  });

  describe('unused Datasets', () => {
    let doc: Document;
    beforeEach(async () => {
      doc = await fetch('/test/testfiles/cleanup.scd')
        .then(response => response.text())
        .then(str => new DOMParser().parseFromString(str, 'application/xml'));
      element = await fixture(
        html`<cleanup-plugin .doc="${doc}"></cleanup-plugin>`
      );
      await element.updateComplete;
    });

    it('creates two Delete Actions', async () => {
      // select all items and update list
      const checkbox = element
        .shadowRoot!.querySelector('.cleanupUnusedDatasetsList')!
        .shadowRoot!.querySelector('mwc-formfield')!
        .querySelector('mwc-checkbox')!;
      await checkbox.click();
      element._cleanUnusedDatasetsList?.layout();
      const cleanItems = Array.from(
        (<Set<number>>element._cleanUnusedDatasetsList!.index).values()
      ).map(index => element.gridRowsUnusedDatasets[index]);
      const deleteActions = element.cleanDatasets(cleanItems);
      expect(deleteActions.length).to.equal(2);
    });

    it('correctly removes the datasets from the SCL file', async () => {
      // select all items and update list
      const checkbox = element
        .shadowRoot!.querySelector('.cleanupUnusedDatasetsList')!
        .shadowRoot!.querySelector('mwc-formfield')!
        .querySelector('mwc-checkbox')!;
      await checkbox.click();
      element._cleanUnusedDatasetsList?.layout();
      await element._cleanUnusedDatasetsButton.click();
      // the correct number of DataSets should remain
      const remainingDataSetCountCheck =
        doc.querySelectorAll(
          ':root > IED > AccessPoint > Server > LDevice > LN0 > DataSet, :root > IED > AccessPoint > Server > LDevice > LN > DataSet'
        ).length === 6;
      // those DataSets selected had best be gone
      const datasetsCorrectlyRemoved =
        doc.querySelectorAll(
          'DataSet[name="GooseDataSet2"], DataSet[name="PhsMeas2"]'
        ).length === 0;
      expect(remainingDataSetCountCheck && datasetsCorrectlyRemoved).to.equal(
        true
      );
    });
  });
});
