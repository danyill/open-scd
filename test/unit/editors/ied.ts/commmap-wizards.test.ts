import { expect } from '@open-wc/testing';
import {
  getSinkReferences,
  getSourceReferences,
} from '../../../../src/editors/ied/commap-wizards.js';

describe('Comminication Mapping Wizard', () => {
  let doc: Document;
  beforeEach(async () => {
    doc = await fetch('/base/test/testfiles/comm-map.scd')
      .then(response => response.text())
      .then(str => new DOMParser().parseFromString(str, 'application/xml'));
  });

  describe('getSinkReferences', () => {
    it('retruns an array of ClientLN`s for ReportControl blocks', () => {
      expect(
        getSinkReferences(doc.querySelector('ReportControl[name="ReportCb"]')!)
      ).to.have.length(4);
      expect(
        getSinkReferences(
          doc.querySelector('ReportControl[name="ReportCb"]')!
        )[0].isEqualNode(
          doc.querySelector('ReportControl[name="ReportCb"] ClientLN')
        )
      )?.to.be.true;
    });
    it('retruns an array of ClientLN`s for both source and client root IED', () => {
      expect(
        getSinkReferences(doc.querySelector('IED[name="IED1"]')!)
      ).to.have.length(4);
    });
  });

  describe('getSourceReferences', () => {
    it('retruns an array of child ExtRef`s', () => {
      expect(getSourceReferences(doc)).to.have.length(20);
      expect(
        getSourceReferences(doc)[0].isEqualNode(doc.querySelector('ExtRef'))
      ).to.be.true;
    });
  });
});
