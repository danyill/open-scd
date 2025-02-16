import { expect, fixture, html } from '@open-wc/testing';

import '../../mock-wizard.js';

import { LitElement } from 'lit-element';

import '../../../src/editors/IED.js';

import { Editing } from '../../../src/Editing.js';
import { Wizarding, WizardingElement } from '../../../src/Wizarding.js';
import { initializeNsdoc, Nsdoc } from '../../../src/foundation/nsdoc.js';
import { FilterButton } from '../../../src/oscd-filter-button.js';

import IED from '../../../src/editors/IED.js';

describe('IED Plugin', () => {
  if (customElements.get('ied-plugin') === undefined)
    customElements.define('ied-plugin', Wizarding(Editing(IED)));
  let element: IED;
  let nsdoc: Nsdoc;

  describe('without a doc loaded', () => {
    beforeEach(async () => {
      element = await fixture(html`<ied-plugin></ied-plugin>`);
      await element.requestUpdate();
      await element.updateComplete;
    });

    it('looks like the latest snapshot', async () => {
      await expect(element).shadowDom.to.equalSnapshot();
    });
  });

  describe('with a doc loaded', () => {
    let doc: XMLDocument;

    describe('containing no IEDs', () => {
      beforeEach(async () => {
        doc = await fetch('/test/testfiles/editors/iedEditorWithoutIEDs.scd')
          .then(response => response.text())
          .then(str => new DOMParser().parseFromString(str, 'application/xml'));
        nsdoc = await initializeNsdoc();
        element = await fixture(
          html` <ied-plugin .doc="${doc}" .nsdoc="${nsdoc}"></ied-plugin>`
        );
        await element.requestUpdate();
        await element.updateComplete;
      });

      it('looks like the latest snapshot', async () => {
        await expect(element).shadowDom.to.equalSnapshot();
      });
    });

    describe('Open Services Wizard', () => {
      beforeEach(async () => {
        doc = await fetch('/test/testfiles/Services.scd')
          .then(response => response.text())
          .then(str => new DOMParser().parseFromString(str, 'application/xml'));

        nsdoc = await initializeNsdoc();

        element = await fixture(
          html`<ied-plugin .doc=${doc} .nsdoc=${nsdoc}></ied-plugin>`
        );

        await element.requestUpdate();
        await element.updateComplete;

        await selectIed('WithServices');
        await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      });

      it('Should open Services wizard', async () => {
        element
          .shadowRoot!.querySelector('ied-container')!
          .shadowRoot!.querySelector<HTMLElement>(
            'mwc-icon-button[icon="settings"]'
          )!
          .click();

        await element.requestUpdate();

        expect((element as any as WizardingElement).wizardUI).to.exist;
      });
    });

    describe('containing IEDs', () => {
      beforeEach(async () => {
        doc = await fetch('/test/testfiles/editors/iedEditorWithIEDs.scd')
          .then(response => response.text())
          .then(str => new DOMParser().parseFromString(str, 'application/xml'));
        nsdoc = await initializeNsdoc();
        element = await fixture(
          html`<ied-plugin .doc="${doc}" .nsdoc="${nsdoc}"></ied-plugin>`
        );
        await element.requestUpdate();
        await element.updateComplete;
      });

      it('looks like the latest snapshot', async () => {
        await expect(element).shadowDom.to.equalSnapshot();
      });

      it('then initially the first IED is selected and rendered', () => {
        expect(
          element.shadowRoot?.querySelectorAll('ied-container').length
        ).to.eql(1);
        expect(
          element.shadowRoot
            ?.querySelector('ied-container')!
            .shadowRoot?.querySelector('action-pane')!.shadowRoot?.innerHTML
        ).to.include('IED1');
      });

      it('when other IED selected then IED Container contains the correct IED', async () => {
        expect(
          element.shadowRoot?.querySelectorAll('ied-container').length
        ).to.eql(1);
        expect(
          getIedContainer().shadowRoot?.querySelector('action-pane')!.shadowRoot
            ?.innerHTML
        ).to.include('IED1');

        await selectIed('IED3');
        await new Promise(resolve => setTimeout(resolve, 100)); // await animation

        expect(
          element.shadowRoot?.querySelectorAll('ied-container').length
        ).to.eql(1);
        expect(
          getIedContainer().shadowRoot?.querySelector('action-pane')!.shadowRoot
            ?.innerHTML
        ).to.include('IED3');
      });

      it('when filtering LN Classes then correct number of LN Containers are rendered', async () => {
        expect(
          getLDeviceContainer(getIedContainer()).shadowRoot!.querySelectorAll(
            'ln-container'
          ).length
        ).to.eql(5);

        await deselectLNClasses('CSWI');
        await new Promise(resolve => setTimeout(resolve, 100)); // await animation

        expect(
          getLDeviceContainer(getIedContainer()).shadowRoot!.querySelectorAll(
            'ln-container'
          ).length
        ).to.eql(3);
      });

      it('then renders the path of elements correctly', async () => {
        const iedContainer = getIedContainer();

        // Initially there won't be a path shown.
        expect(getElementPathValue()).to.be.empty;

        // After setting the focus on the IED Container
        iedContainer.dispatchEvent(new Event('focus'));
        await element.updateComplete;
        expect(getElementPathValue()).to.eql('IED1');

        // After setting the focus on the Server Container below the IED Container
        const lDeviceContainer = getLDeviceContainer(iedContainer);
        lDeviceContainer!.dispatchEvent(new Event('focus'));
        await element.updateComplete;
        expect(getElementPathValue()).to.eql(
          'IED1 / P1 / Server / CircuitBreaker_CB1'
        );

        // After removing the focus on the IED Container, it will be empty again.
        iedContainer!.dispatchEvent(new Event('blur'));
        await element.updateComplete;
        expect(getElementPathValue()).to.be.empty;
      });

      function getIedContainer(): Element {
        return element.shadowRoot!.querySelector('ied-container')!;
      }

      function getLDeviceContainer(iedContainer: Element): Element {
        return iedContainer
          .shadowRoot!.querySelector('access-point-container')!
          .shadowRoot!.querySelector('server-container')!
          .shadowRoot!.querySelector('ldevice-container')!;
      }

      function getElementPathValue(): string {
        return (
          element.shadowRoot
            ?.querySelector('element-path')
            ?.shadowRoot?.querySelector('h3')?.textContent ?? ''
        );
      }

      async function deselectLNClasses(lnClass: string): Promise<void> {
        const oscdFilterButton = <FilterButton>(
          element.shadowRoot!.querySelector(
            'oscd-filter-button[id="lnClassesFilter"]'
          )
        );
        const filterButton = <LitElement>(
          oscdFilterButton!.shadowRoot!.querySelector('mwc-icon-button')
        );
        filterButton.click();
        await element.updateComplete;

        (<HTMLElement>(
          oscdFilterButton!.querySelector(
            `mwc-check-list-item[value="${lnClass}"]`
          )
        )).click();

        const primaryButton = <HTMLElement>(
          oscdFilterButton!.shadowRoot!.querySelector(
            'mwc-button[slot="primaryAction"]'
          )
        );
        primaryButton.click();
        await element.updateComplete;
      }
    });
  });

  async function selectIed(name: string): Promise<void> {
    const oscdFilterButton = element.shadowRoot!.querySelector(
      'oscd-filter-button[id="iedFilter"]'
    );
    const filterButton = <HTMLElement>(
      oscdFilterButton!.shadowRoot!.querySelector('mwc-icon-button')
    );
    filterButton.click();
    await element.updateComplete;

    const selectItem = <HTMLElement>(
      oscdFilterButton!.querySelector(`mwc-radio-list-item[value="${name}"]`)
    );
    selectItem.click();

    const primaryButton = <HTMLElement>(
      oscdFilterButton!.shadowRoot!.querySelector(
        'mwc-button[slot="primaryAction"]'
      )
    );
    primaryButton.click();

    await element.updateComplete;
  }
});
