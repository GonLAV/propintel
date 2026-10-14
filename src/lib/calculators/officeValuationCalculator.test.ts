import { describe, expect, it } from 'vitest'
import {
  OfficeValuationCalculator,
  type OfficeComparable,
  type OfficeProperty,
} from '@/lib/calculators/officeValuationCalculator'

const property: OfficeProperty = {
  address: 'Test',
  city: 'תל אביב',
  area: 'מרכז',
  totalArea: 100,
  floor: 5,
  totalFloors: 10,
  condition: 'excellent',
  buildYear: 2020,
  hasElevator: true,
  parkingSpaces: 1,
  officeClass: 'A',
  buildingType: 'tower',
  accessibility: { publicTransport: true, highway: true, metro: true },
  amenities: {
    lobby: true,
    security24: true,
    conferenceRooms: true,
    kitchenette: true,
    airConditioning: true,
    raisedFloor: true,
    dataInfrastructure: true,
  },
  layout: 'open-plan',
  windows: 'perimeter',
  currentUse: 'owner-occupied',
}

const comparable: Partial<OfficeComparable> = {
  id: 'comp-1',
  address: 'Comparable',
  salePrice: 1_000_000,
  pricePerSqm: 10_000,
  saleDate: new Date().toISOString().slice(0, 10),
  area: 100,
  floor: 5,
  condition: 'excellent',
  officeClass: 'A',
  parkingSpaces: 1,
  buildYear: 2020,
  distance: 100,
}

describe('office comparable valuation', () => {
  it('does not apply subject class and condition multipliers twice', () => {
    const result = OfficeValuationCalculator.calculateComparableSalesValue(property, [comparable])
    expect(result.baseValue).toBeCloseTo(1_020_000)
    expect(result.adjustedValue).toBeCloseTo(result.baseValue)
  })
})
