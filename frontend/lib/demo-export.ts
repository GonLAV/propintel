type DemoValuationRow = {
  asset: string
  city: string
  value: string
  confidence: string
  status: string
}

export function buildDemoPortfolioMemo(rows: DemoValuationRow[], generatedAt = new Date()) {
  return [
    '# PropIntel Demo Portfolio Memo',
    '',
    `Generated: ${generatedAt.toISOString()}`,
    '',
    '> DEMO DATA: This export contains illustrative fixtures only. It is not an appraisal, live portfolio record, or investment advice.',
    '',
    '## Active valuations',
    ...rows.map((row) => `- ${row.asset} (${row.city}): ${row.value}, confidence ${row.confidence}, status ${row.status}`),
    '',
    'Verify all values, rights, sources, and professional conclusions before external use.',
    '',
  ].join('\n')
}
