'use strict';

// Regression coverage for a bidi-rendering bug Nachshon (persona appraiser
// review, 2026-10-30 round 4) found by rendering a real signed PDF to an
// image and looking at it -- not by reading extracted text, which reads in
// logical order and would never show the bug. A licence number mixing
// digits with a letter (e.g. "60321-C") rendered as "C-60321" (segments
// reversed) in the signature block, because nothing isolated that mixed-
// script substring from the surrounding RTL paragraph direction.
//
// This only checks that the fix's markup (an explicit dir="ltr" wrapper)
// is actually emitted for the right input -- it cannot, by construction,
// verify the visual bidi outcome itself (that needs a rendered image, as
// Nachshon's finding did); see reportTemplate.js's `licenseLine` comment.

const { renderReportHtml } = require('../../src/api/v1/services/pdf/reportTemplate');

function basePayload(overrides = {}) {
  return {
    reportId: 'r1', title: 'שומה לדוגמה', generatedAt: '2026-10-30T10:00:00.000Z',
    office: { name: 'משרד בדיקה' },
    appraiser: { fullName: 'בודק/ת בדיקה', email: 'x@y.com', licenseNumber: null },
    report: { clientName: null, purpose: null, bankName: null, bankReference: null },
    property: {
      address: 'רחוב הבדיקה 1', city: 'תל אביב', propertyType: 'apartment',
      areaSqm: 80, rooms: 3, floor: 2, yearBuilt: 2010,
      externalRef: null, block: null, parcel: null, subParcel: null,
      visitDate: null, legalRightsNotes: null, planningStatusNotes: null,
    },
    valuation: {
      id: 'v1', method: 'comparables', status: 'completed',
      estimatedValue: 2000000, currency: 'ILS', confidence: 0.8, result: {},
      valuationDate: '2026-10-30T09:00:00.000Z',
    },
    comparables: null, reconciliation: null, costBreakdown: null,
    principlesSummary: null, principlesNotes: null,
    ...overrides,
  };
}

describe('renderReportHtml: licence number bidi isolation', () => {
  test('a licence number mixing digits and a letter is wrapped in dir="ltr", not left to reverse visually', () => {
    const payload = basePayload({ appraiser: { ...basePayload().appraiser, licenseNumber: '60321-C' } });
    const { html } = renderReportHtml(payload);
    expect(html).toContain('<span dir="ltr">60321-C</span>');
  });

  test('a purely numeric licence number still goes through the same wrapper', () => {
    const payload = basePayload({ appraiser: { ...basePayload().appraiser, licenseNumber: '54219' } });
    const { html } = renderReportHtml(payload);
    expect(html).toContain('<span dir="ltr">54219</span>');
  });

  test('no licence number renders the generic label with no dangling bidi wrapper', () => {
    const { html } = renderReportHtml(basePayload());
    expect(html).not.toContain('dir="ltr"');
    expect(html).toContain('שמאי/ת מקרקעין');
  });
});
