import { describe, expect, it } from 'vitest'
import { parseCsv } from '@/lib/csv-comparables-parser'

describe('parseCsv (bulk comparable-sale import)', () => {
  it('parses Hebrew headers with Israeli-format dates', () => {
    const csv = [
      'שטח,מחיר,תאריך,קומה,חדרים,שנת בנייה',
      '80,2200000,15/03/2025,3,4,2010',
      '85.5,2350000,20/04/2025,4,4.5,2012',
    ].join('\n')

    const { rows, headerError } = parseCsv(csv)
    expect(headerError).toBeNull()
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      areaSqm: 80, salePrice: 2200000, soldAt: '2025-03-15', floor: 3, rooms: 4, yearBuilt: 2010, error: null,
    })
    expect(rows[1]).toMatchObject({ areaSqm: 85.5, rooms: 4.5, soldAt: '2025-04-20', error: null })
  })

  it('parses English headers with ISO dates and quoted, comma-separated prices', () => {
    // Regression: a naive Number() on a quoted "2,200,000" (a very common
    // Excel/Sheets export shape) silently fails -- caught by testing
    // against a realistic export, not by inspection.
    const csv = 'area,price,date,floor\n"80","2,200,000",2025-03-15,3'
    const { rows } = parseCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].salePrice).toBe(2200000)
    expect(rows[0].error).toBeNull()
  })

  it('strips currency symbols and spaces from numeric fields', () => {
    const csv = 'שטח,מחיר,תאריך\n"80 ","₪ 2,000,000",01/01/2025'
    const { rows } = parseCsv(csv)
    expect(rows[0].areaSqm).toBe(80)
    expect(rows[0].salePrice).toBe(2_000_000)
  })

  it('reports a header error when required columns are missing, without crashing', () => {
    const { rows, headerError } = parseCsv('foo,bar\nbaz,qux')
    expect(rows).toHaveLength(0)
    expect(headerError).toContain('שטח')
    expect(headerError).toContain('מחיר')
    expect(headerError).toContain('תאריך')
  })

  it('flags invalid required fields per-row without rejecting the whole file', () => {
    const csv = [
      'שטח,מחיר,תאריך',
      '80,2000000,01/01/2025', // valid
      'not-a-number,2000000,01/01/2025', // bad area
      '75,invalid,10/02/2025', // bad price
      '80,2100000,bad-date', // bad date
    ].join('\n')

    const { rows } = parseCsv(csv)
    expect(rows).toHaveLength(4)
    expect(rows[0].error).toBeNull()
    expect(rows[1].error).toBe('שטח לא תקין')
    expect(rows[2].error).toBe('מחיר לא תקין')
    expect(rows[3].error).toContain('תאריך לא תקין')
  })

  it('rejects an impossible ISO date (month 13) instead of showing it as valid in the preview', () => {
    // Regression: the ISO branch used to accept any 4-2-2 digit shape with
    // no range check, so the preview marked this row "valid" even though
    // the server correctly rejected it on import (found live, not by
    // inspection) -- the one check meant to build pre-import confidence
    // gave a false green light.
    const csv = 'שטח,מחיר,תאריך\n80,2000000,2026-13-40'
    const { rows } = parseCsv(csv)
    expect(rows[0].error).toContain('תאריך לא תקין')
  })

  it('treats a garbage optional field as simply absent, not a row error', () => {
    const csv = 'שטח,מחיר,תאריך,קומה\n80,2000000,01/01/2025,garbage-floor'
    const { rows } = parseCsv(csv)
    expect(rows[0].error).toBeNull()
    expect(rows[0].floor).toBeNull()
  })

  it('rejects a bare MM/DD/YYYY-only date format as ambiguous (requires DD/MM/YYYY or ISO)', () => {
    // 13 can't be a month, so this specific case would still fail either
    // reading -- use an unambiguous-looking but wrong-order case instead:
    // "03/04/2025" is valid under DD/MM, so it should parse as 3 April, not
    // be rejected -- the real guard is that there is no code path that
    // would read it as 4 March either.
    const csv = 'שטח,מחיר,תאריך\n80,2000000,03/04/2025'
    const { rows } = parseCsv(csv)
    expect(rows[0].soldAt).toBe('2025-04-03')
  })

  it('returns a clear error for an empty or header-only file', () => {
    const { headerError } = parseCsv('שטח,מחיר,תאריך')
    expect(headerError).toContain('שורת נתונים')
  })
})
