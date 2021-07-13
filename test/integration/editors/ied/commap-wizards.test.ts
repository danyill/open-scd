import { expect, fixture, html } from '@open-wc/testing';

import MyIed from '../../../../src/editors/Ied.js';

import { List } from '@material/mwc-list';
import { MockWizardEditor } from '../../../mock-wizard-editor.js';

const _customElementsDefine = window.customElements.define;
window.customElements.define = (name, cl, conf) => {
  if (!customElements.get(name)) {
    _customElementsDefine.call(window.customElements, name, cl, conf);
  }
};

describe('CommunicationMappingWizards', () => {
  let doc: Document;
  customElements.define('ied-omegaplugin', MyIed);
  let parent: MockWizardEditor;
  let element: MyIed;

  beforeEach(async () => {
    parent = await fixture(
      html`<mock-wizard-editor
        ><ied-omegaplugin></ied-omegaplugin
      ></mock-wizard-editor>`
    );

    element = <MyIed>parent.querySelector('ied-omegaplugin')!;

    doc = await fetch('/base/test/testfiles/comm-map.scd')
      .then(response => response.text())
      .then(str => new DOMParser().parseFromString(str, 'application/xml'));
    element.doc = doc;
    await element.updateComplete;
  });

  describe('communication mapping wizard', () => {
    let secondaryAction: HTMLElement;

    beforeEach(async () => {
      await element.globalCommMap.click();
      await parent.updateComplete;

      secondaryAction = <HTMLElement>(
        parent.wizardUI.dialog!.querySelector(
          'mwc-button[slot="secondaryAction"]'
        )
      );
    });

    it('looks like its snapshot', () => {
      expect(parent.wizardUI.dialog).to.equalSnapshot();
    });

    it('closes on secondary action', async () => {
      secondaryAction.click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      expect(parent.wizardUI.dialogs.length).to.equal(0);
    });

    it('groups connections to unique pair of source ied, sink ied and control block', () => {
      expect(
        parent.wizardUI.dialog?.querySelectorAll('mwc-list-item').length
      ).to.equal(4);
    });
  });

  describe('control block connection wizard', () => {
    let commMappings: List;
    beforeEach(async () => {
      await element.globalCommMap.click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation

      commMappings = <List>(
        parent.wizardUI.dialog?.querySelector('filtered-list')
      );
    });

    it('opens on Connection item click', async () => {
      commMappings.items[0].click();
      await parent.updateComplete;
      expect(parent.wizardUI.dialogs.length).to.equal(1);
      expect(parent.wizardUI.dialog?.heading).to.equal(
        'IED2>>CBSW> XSWI 2>ReportCb - IED1'
      );
    });

    it('shows all ClientLNs', async () => {
      commMappings.items[0].click();
      await parent.updateComplete;
      expect(
        parent.wizardUI.dialog?.querySelectorAll('mwc-check-list-item').length
      ).to.equal(
        doc.querySelectorAll('IED[name="IED2"] ReportControl ClientLN').length
      );
    });

    it('removes selected ClientLNs', async () => {
      expect(
        doc.querySelector(
          'ClientLN[iedName="IED1"][ldInst="CircuitBreaker_CB1"][lnClass="CSWI"]'
        )
      ).to.exist;
      commMappings.items[0].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<List>(
        parent.wizardUI.dialog?.querySelector('filtered-list')
      )).items[3].click();
      await parent.updateComplete;
      (<HTMLElement>(
        parent.wizardUI.dialog?.querySelector(
          'mwc-button[slot="primaryAction"]'
        )
      )).click();
      await parent.updateComplete;
      expect(
        doc.querySelector(
          'ClientLN[iedName="IED1"][ldInst="CircuitBreaker_CB1"][lnClass="CSWI"]'
        )
      ).to.be.null;
    });

    it('shows all ExtRefs', async () => {
      commMappings.items[1].click();
      await parent.updateComplete;
      expect(
        parent.wizardUI.dialog?.querySelectorAll('mwc-check-list-item').length
      ).to.equal(14);
    });

    it('removes selected ExtRefs in case no intAddr is present', async () => {
      expect(
        doc.querySelector(
          ':root > IED[name="IED2"] ExtRef[iedName="IED1"][ldInst="Disconnectors"][lnClass="XSWI"][doName="Pos"][daName="stVal"]'
        )
      ).to.exist;
      commMappings.items[1].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<List>(
        parent.wizardUI.dialog?.querySelector('filtered-list')
      )).items[2].click();
      await parent.updateComplete;
      (<HTMLElement>(
        parent.wizardUI.dialog?.querySelector(
          'mwc-button[slot="primaryAction"]'
        )
      )).click();
      await parent.updateComplete;
      expect(
        doc.querySelector(
          ':root > IED[name="IED2"] ExtREf[iedName="IED1"][ldInst="Disconnectors"][lnClass="XSWI"][doName="Pos"][daName="stVal"]'
        )
      ).to.not.exist;
    });

    it('updates selected ExtRefs in case intAddr is present', async () => {
      expect(
        doc.querySelector(
          ':root > IED[name="IED1"] ExtRef[iedName="IED2"][ldInst="CBSW"][lnClass="XSWI"]' +
            '[doName="Pos"][daName="stVal"][intAddr="./stVal"][serviceType="GOOSE"][desc="testDesc"]' +
            '[pServT="GOOSE"][pLN="XSWI"][pDO="Pos"][pDA="stVal"]'
        )
      ).to.exist;
      commMappings.items[2].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<List>(
        parent.wizardUI.dialog?.querySelector('filtered-list')
      )).items[0].click();
      await parent.updateComplete;
      (<HTMLElement>(
        parent.wizardUI.dialog?.querySelector(
          'mwc-button[slot="primaryAction"]'
        )
      )).click();
      await parent.updateComplete;
      expect(
        doc.querySelector(
          ':root > IED[name="IED1"] ExtRef:not([iedName]):not([ldInst]):not([lnClass]):not([doName]):not([daName])' +
            '[intAddr="./stVal"][serviceType="GOOSE"][desc="testDesc"]' +
            '[pServT="GOOSE"][pLN="XSWI"][pDO="Pos"][pDA="stVal"]'
        )
      ).to.exist;
    });
    it('removes IEDName if all linked ExtRefs are removed/disconnected', async () => {
      expect(
        doc.querySelector(
          ':root > IED[name="IED1"] > AccessPoint > Server > ' +
            'LDevice[inst="CircuitBreaker_CB1"] > LN0 > GSEControl > ' +
            'IEDName[apRef="P1"][ldInst="CircuitBreaker_CB1"][lnClass="CSWI"]'
        )
      ).to.exist;
      commMappings.items[3].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<List>(
        parent.wizardUI.dialog?.querySelector('filtered-list')
      )).items[0].click();
      await parent.updateComplete;
      (<List>(
        parent.wizardUI.dialog?.querySelector('filtered-list')
      )).items[1].click();
      await parent.updateComplete;
      (<List>(
        parent.wizardUI.dialog?.querySelector('filtered-list')
      )).items[2].click();
      await parent.updateComplete;
      (<List>(
        parent.wizardUI.dialog?.querySelector('filtered-list')
      )).items[3].click();
      await parent.updateComplete;
      (<HTMLElement>(
        parent.wizardUI.dialog?.querySelector(
          'mwc-button[slot="primaryAction"]'
        )
      )).click();
      await parent.updateComplete;
      expect(
        doc.querySelector(
          ':root > IED[name="IED1"] > AccessPoint > Server > ' +
            'LDevice[inst="CircuitBreaker_CB1"] > LN0 > GSEControl > ' +
            'IEDName[apRef="P1"][ldInst="CircuitBreaker_CB1"][lnClass="CSWI"]'
        )
      ).to.not.exist;
    });
    it('does not removes IEDName if linked ExtRefs`not completely removed/disconnected', async () => {
      expect(
        doc.querySelector(
          ':root > IED[name="IED1"] > AccessPoint > Server > ' +
            'LDevice[inst="CircuitBreaker_CB1"] > LN0 > GSEControl > ' +
            'IEDName[apRef="P1"][ldInst="CircuitBreaker_CB1"][lnClass="CSWI"]'
        )
      ).to.exist;
      commMappings.items[3].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<List>(
        parent.wizardUI.dialog?.querySelector('filtered-list')
      )).items[0].click();
      await parent.updateComplete;
      (<List>(
        parent.wizardUI.dialog?.querySelector('filtered-list')
      )).items[1].click();
      await parent.updateComplete;
      (<HTMLElement>(
        parent.wizardUI.dialog?.querySelector(
          'mwc-button[slot="primaryAction"]'
        )
      )).click();
      await parent.updateComplete;
      expect(
        doc.querySelector(
          ':root > IED[name="IED1"] > AccessPoint > Server > ' +
            'LDevice[inst="CircuitBreaker_CB1"] > LN0 > GSEControl > ' +
            'IEDName[apRef="P1"][ldInst="CircuitBreaker_CB1"][lnClass="CSWI"]'
        )
      ).to.exist;
    });
  });

  describe('connection wizard', () => {
    beforeEach(async () => {
      await element.globalCommMap.click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<HTMLElement>(
        parent.wizardUI.dialog?.querySelector(
          'mwc-button[slot="primaryAction"]'
        )
      )).click();
      await parent.updateComplete;
    });

    it('opens on communication primary action', async () => {
      expect(parent.wizardUI.dialog).to.exist;
    });
    it('is displaying source IEDs with mwc-check-list-item', () => {
      expect(
        parent.wizardUI.dialog?.querySelectorAll(
          '#sourcelist>mwc-check-list-item'
        ).length
      ).to.equal(doc.querySelectorAll('IED').length);
    });
    it('is displaying source IEDs with mwc-list-item', () => {
      expect(
        parent.wizardUI.dialog?.querySelectorAll('#sinklist>mwc-list-item')
          .length
      ).to.equal(doc.querySelectorAll('IED').length);
    });
  });

  describe('client wizard', () => {
    beforeEach(async () => {
      await element.globalCommMap.click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<HTMLElement>(
        parent.wizardUI.dialog?.querySelector(
          'mwc-button[slot="primaryAction"]'
        )
      )).click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<List>(
        parent.wizardUI.dialog?.querySelector('#sourcelist')
      )).items[1].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<List>(
        parent.wizardUI.dialog?.querySelector('#sinklist')
      )).items[0].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
    });

    it('opens on client ln on sink IED click', async () => {
      expect(parent.wizardUI.dialog).to.exist;
    });
    it('is displaying source IEDs report control blocks with mwc-check-list-item', () => {
      expect(
        parent.wizardUI.dialog?.querySelectorAll(
          '#sourcelist>mwc-check-list-item'
        ).length
      ).to.equal(doc.querySelectorAll('IED[name="IED2"] ReportControl').length);
    });
    it('is displaying source IEDs logical nodes in mwc-check-list-item', () => {
      expect(
        parent.wizardUI.dialog?.querySelectorAll(
          '#sinklist>mwc-check-list-item'
        ).length
      ).to.equal(
        doc.querySelectorAll('IED[name="IED1"] LN,IED[name="IED1"] LN0').length
      );
    });
    it('add ClientLN referencing to logical nodes in AccessPoint', async () => {
      expect(
        doc.querySelector(
          'IED[name="IED2"] ReportControl[name="ReportEmpty"] ClientLN'
        )
      )?.to.not.exist;
      (<List>(
        parent.wizardUI.dialog?.querySelector('#sourcelist')
      )).items[1].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<List>(
        parent.wizardUI.dialog?.querySelector('#sinklist')
      )).items[0].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<HTMLElement>(
        parent.wizardUI.dialog?.querySelector(
          'mwc-button[slot="primaryAction"]'
        )
      )).click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      expect(
        doc.querySelector(
          'IED[name="IED2"] ReportControl[name="ReportEmpty"] ClientLN[iedName="IED1"][apRef="P1"][prefix="DC"][lnClass="CILO"][lnInst="1"]'
        )
      )?.to.exist;
    });
    it('does not add an already existing ClientLN referencing to logical nodes in AccessPoint', async () => {
      expect(
        doc.querySelectorAll(
          'IED[name="IED2"] ReportControl[name="ReportCb"] ClientLN[iedName="IED1"][apRef="P1"][prefix="DC"][lnClass="CILO"][lnInst="1"]'
        ).length
      )?.to.equal(1);
      (<List>(
        parent.wizardUI.dialog?.querySelector('#sourcelist')
      )).items[0].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<List>(
        parent.wizardUI.dialog?.querySelector('#sinklist')
      )).items[0].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<HTMLElement>(
        parent.wizardUI.dialog?.querySelector(
          'mwc-button[slot="primaryAction"]'
        )
      )).click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      expect(
        doc.querySelectorAll(
          'IED[name="IED2"] ReportControl[name="ReportCb"] ClientLN[iedName="IED1"][apRef="P1"][prefix="DC"][lnClass="CILO"][lnInst="1"]'
        ).length
      )?.to.equal(1);
    });
    it('add ClientLN referencing to LN0', async () => {
      expect(
        doc.querySelector(
          'IED[name="IED2"] ReportControl[name="ReportEmpty"] ClientLN'
        )
      )?.to.not.exist;
      (<List>(
        parent.wizardUI.dialog?.querySelector('#sourcelist')
      )).items[1].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<List>(
        parent.wizardUI.dialog?.querySelector('#sinklist')
      )).items[14].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<HTMLElement>(
        parent.wizardUI.dialog?.querySelector(
          'mwc-button[slot="primaryAction"]'
        )
      )).click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      expect(
        doc.querySelector(
          'IED[name="IED2"] ReportControl[name="ReportEmpty"] ClientLN[iedName="IED1"][apRef="P1"][ldInst="Disconnectors"][lnClass="LLN0"]'
        )
      )?.to.exist;
    });
    it('does not add an already existing ClientLN referencing to LN0', async () => {
      expect(
        doc.querySelectorAll(
          'IED[name="IED2"] ReportControl[name="ReportCb"] ClientLN[iedName="IED1"][apRef="P1"][ldInst="Disconnectors"][lnClass="LLN0"]'
        ).length
      )?.to.equal(1);
      (<List>(
        parent.wizardUI.dialog?.querySelector('#sourcelist')
      )).items[0].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<List>(
        parent.wizardUI.dialog?.querySelector('#sinklist')
      )).items[0].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<HTMLElement>(
        parent.wizardUI.dialog?.querySelector(
          'mwc-button[slot="primaryAction"]'
        )
      )).click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      expect(
        doc.querySelectorAll(
          'IED[name="IED2"] ReportControl[name="ReportCb"] ClientLN[iedName="IED1"][apRef="P1"][ldInst="Disconnectors"][lnClass="LLN0"]'
        ).length
      )?.to.equal(1);
    });
    it('add ClientLN referencing to logical nodes located in logical devices', async () => {
      expect(
        doc.querySelector(
          'IED[name="IED2"] ReportControl[name="ReportEmpty"] ClientLN'
        )
      )?.to.not.exist;
      (<List>(
        parent.wizardUI.dialog?.querySelector('#sourcelist')
      )).items[1].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<List>(
        parent.wizardUI.dialog?.querySelector('#sinklist')
      )).items[5].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<HTMLElement>(
        parent.wizardUI.dialog?.querySelector(
          'mwc-button[slot="primaryAction"]'
        )
      )).click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      expect(
        doc.querySelector(
          'IED[name="IED2"] ReportControl[name="ReportEmpty"] ClientLN[iedName="IED1"][apRef="P1"][ldInst="Disconnectors"][prefix="DC"][lnClass="XSWI"][lnInst="1"]'
        )
      )?.to.exist;
    });
    it('does not add an already existing ClientLN referencing to to logical nodes located in logical devices', async () => {
      expect(
        doc.querySelectorAll(
          'IED[name="IED2"] ReportControl[name="ReportCb"] ClientLN[iedName="IED1"][apRef="P1"][ldInst="CircuitBreaker_CB1"][lnClass="XCBR"][lnInst="1"]'
        ).length
      )?.to.equal(1);
      (<List>(
        parent.wizardUI.dialog?.querySelector('#sourcelist')
      )).items[0].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<List>(
        parent.wizardUI.dialog?.querySelector('#sinklist')
      )).items[0].click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      (<HTMLElement>(
        parent.wizardUI.dialog?.querySelector(
          'mwc-button[slot="primaryAction"]'
        )
      )).click();
      await parent.updateComplete;
      await new Promise(resolve => setTimeout(resolve, 100)); // await animation
      expect(
        doc.querySelectorAll(
          'IED[name="IED2"] ReportControl[name="ReportCb"] ClientLN[iedName="IED1"][apRef="P1"][ldInst="CircuitBreaker_CB1"][lnClass="XCBR"][lnInst="1"]'
        ).length
      )?.to.equal(1);
    });
  });
});
