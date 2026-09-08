'use strict';

const {
  comparablesValuation,
  costApproachValuation,
  incomeApproachValuation,
  reconciledValuation,
  runValuation,
  pricePerSqm,
  timeAdjustmentFactor,
} = require('../../src/api/v1/services/valuationEngine');

describe('valuationEngine', () => {
  const subjectApt = {
    property_type: 'apartment', city: 'Tel Aviv', area_sqm: 80,
    rooms: 3, floor: 4, year_built: 2010,
  };

  describe('helpers', () => {
    test('pricePerSqm divides correctly', () => {
      expect(pricePerSqm({ sale_price: 2_000_000, area_sqm: 100 })).toBe(20_000);
    });
    test('timeAdjustmentFactor compounds annually', () => {
      const f = timeAdjustmentFactor(
        new Date('2022-01-01'), new Date('2024-01-01'), 0.05,
      );
      expect(f).toBeGreaterThan(1.10);
      expect(f).toBeLessThan(1.11);
    });
  });

  describe('comparablesValuation', () => {
    test('returns null when no area or no comps', () => {
      expect(comparablesValuation({ subject: { ...subjectApt, area_sqm: null }, comps: [] }).value).toBeNull();
      expect(comparablesValuation({ subject: subjectApt, comps: [] }).value).toBeNull();
    });

    test('produces a positive value with reasonable confidence', () => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const comps = [
        { id: 'c1', sale_price: 2_400_000, area_sqm: 80, floor: 3, year_built: 2008, sold_at: `${yyyy - 1}-06-01` },
        { id: 'c2', sale_price: 2_200_000, area_sqm: 75, floor: 5, year_built: 2012, sold_at: `${yyyy - 1}-09-15` },
        { id: 'c3', sale_price: 2_500_000, area_sqm: 82, floor: 4, year_built: 2010, sold_at: `${yyyy}-02-10` },
        { id: 'c4', sale_price: 2_300_000, area_sqm: 78, floor: 4, year_built: 2009, sold_at: `${yyyy - 1}-12-01` },
      ];
      const out = comparablesValuation({ subject: subjectApt, comps });
      expect(out.value).toBeGreaterThan(1_500_000);
      expect(out.value).toBeLessThan(3_500_000);
      expect(out.confidence).toBeGreaterThan(0);
      expect(out.confidence).toBeLessThanOrEqual(1);
      expect(out.breakdown.sampleSize).toBe(4);
      expect(out.breakdown.adjusted).toHaveLength(4);
    });
  });

  describe('costApproachValuation', () => {
    test('depreciates older buildings', () => {
      const newer = costApproachValuation({ subject: { ...subjectApt, year_built: 2020 } }).value;
      const older = costApproachValuation({ subject: { ...subjectApt, year_built: 1980 } }).value;
      expect(newer).toBeGreaterThan(older);
    });
    test('handles raw land', () => {
      const out = costApproachValuation({ subject: { property_type: 'land', area_sqm: 500 } });
      expect(out.value).toBe(500 * 5000);
    });
    test('returns null without area', () => {
      expect(costApproachValuation({ subject: { property_type: 'apartment' } }).value).toBeNull();
    });
  });

  describe('incomeApproachValuation', () => {
    test('uses tenant-supplied capRate when provided', () => {
      const a = incomeApproachValuation({ subject: subjectApt, inputs: { capRate: 0.05 } });
      const b = incomeApproachValuation({ subject: subjectApt, inputs: { capRate: 0.10 } });
      expect(a.value).toBeGreaterThan(b.value);
    });
    test('higher rent → higher value', () => {
      const a = incomeApproachValuation({ subject: subjectApt, inputs: { rentPerSqmMonth: 50 } });
      const b = incomeApproachValuation({ subject: subjectApt, inputs: { rentPerSqmMonth: 150 } });
      expect(b.value).toBeGreaterThan(a.value);
    });
  });

  describe('reconciledValuation', () => {
    test('produces a value between the contributing methods', () => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const comps = [
        { id: 'c1', sale_price: 2_400_000, area_sqm: 80, floor: 3, year_built: 2008, sold_at: `${yyyy - 1}-06-01` },
        { id: 'c2', sale_price: 2_500_000, area_sqm: 80, floor: 4, year_built: 2010, sold_at: `${yyyy - 1}-09-01` },
      ];
      const out = reconciledValuation({ subject: subjectApt, comps, inputs: {} });
      expect(out.value).toBeGreaterThan(0);
      expect(out.confidence).toBeGreaterThan(0);
      expect(out.breakdown.methods.length).toBeGreaterThanOrEqual(2);
      const weights = out.breakdown.methods.map((m) => m.weight);
      const sum = weights.reduce((s, w) => s + w, 0);
      expect(sum).toBeGreaterThan(0.99);
      expect(sum).toBeLessThan(1.01);
    });

    test('falls back gracefully when comparables produce no value', () => {
      const out = reconciledValuation({ subject: subjectApt, comps: [], inputs: {} });
      expect(out.value).toBeGreaterThan(0); // cost + income still produce values
      const names = out.breakdown.methods.map((m) => m.method);
      expect(names).not.toContain('comparables');
    });
  });

  describe('runValuation entry point', () => {
    test('throws on unknown method', () => {
      expect(() => runValuation({ subject: subjectApt, method: 'magic' })).toThrow();
    });
    test('returns null when inputs insufficient', () => {
      expect(runValuation({
        subject: { property_type: 'apartment' }, method: 'cost',
      })).toBeNull();
    });
    test('returns full envelope for cost method', () => {
      const out = runValuation({ subject: subjectApt, method: 'cost' });
      expect(out.estimatedValue).toBeGreaterThan(0);
      expect(out.currency).toBe('ILS');
      expect(out.confidence).toBeGreaterThan(0);
      expect(out.result.method).toBe('cost');
      expect(out.result.generatedAt).toBeDefined();
    });
  });
});
