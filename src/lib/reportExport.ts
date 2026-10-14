import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import type { Report } from '@/lib/types'

export type SupportedLocalReportFormat = 'pdf' | 'html'

export function isLocalReportFormatSupported(format: Report['format']): format is SupportedLocalReportFormat {
  return format === 'pdf' || format === 'html'
}

export async function createLocalReportBlob(
  format: SupportedLocalReportFormat,
  html: string,
  title: string,
): Promise<Blob> {
  if (format === 'html') {
    return new Blob([html], { type: 'text/html;charset=utf-8' })
  }

  if (typeof document === 'undefined') {
    throw new Error('ייצוא PDF זמין רק בדפדפן')
  }

  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const container = document.createElement('div')
  container.setAttribute('dir', 'rtl')
  container.setAttribute('aria-hidden', 'true')
  container.style.position = 'fixed'
  container.style.insetInlineStart = '-100000px'
  container.style.top = '0'
  container.style.width = '794px'
  container.style.padding = '32px'
  container.style.background = '#ffffff'
  container.style.color = '#111111'
  const reportStyles = [...parsed.head.querySelectorAll('style')]
    .map((style) => style.outerHTML)
    .join('')
  container.innerHTML = `${reportStyles}${parsed.body.innerHTML || `<h1>${escapeHtml(title)}</h1>`}`
  document.body.appendChild(container)

  let canvas: HTMLCanvasElement
  try {
    canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    })
  } finally {
    container.remove()
  }

  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imageWidth = pageWidth
  const imageHeight = (canvas.height * imageWidth) / canvas.width
  const imageData = canvas.toDataURL('image/jpeg', 0.92)

  let offset = 0
  while (offset < imageHeight) {
    if (offset > 0) pdf.addPage()
    pdf.addImage(imageData, 'JPEG', 0, -offset, imageWidth, imageHeight)
    offset += pageHeight
  }

  return pdf.output('blob')
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export async function downloadPublishedReport(report: Report): Promise<void> {
  if (!report.contentHtml) {
    throw new Error('תוכן הדוח אינו זמין להורדה מקומית')
  }
  if (!isLocalReportFormatSupported(report.format)) {
    throw new Error('פורמט Word אינו נתמך ללא מחולל DOCX צד-שרת')
  }
  const extension = report.format === 'pdf' ? 'pdf' : 'html'
  const blob = await createLocalReportBlob(report.format, report.contentHtml, report.title)
  downloadBlob(blob, report.fileName || `${report.title}.${extension}`)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
