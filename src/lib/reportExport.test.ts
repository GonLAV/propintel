import { describe, expect, it } from 'vitest'
import { createLocalReportBlob, isLocalReportFormatSupported } from '@/lib/reportExport'

describe('local report formats', () => {
  it('supports real local HTML and PDF exports but not fake Word exports', () => {
    expect(isLocalReportFormatSupported('html')).toBe(true)
    expect(isLocalReportFormatSupported('pdf')).toBe(true)
    expect(isLocalReportFormatSupported('word')).toBe(false)
  })

  it('creates a real HTML file with the requested content type', async () => {
    const blob = await createLocalReportBlob('html', '<p>בדיקה</p>', 'דוח')

    expect(blob.type).toBe('text/html;charset=utf-8')
    await expect(blob.text()).resolves.toContain('בדיקה')
  })
})
