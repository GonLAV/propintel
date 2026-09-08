export function formatSqm(value: number) {
  return `${formatSigned(value)} sqm`
}

export function formatAbsoluteSqm(value: number) {
  return `${value.toLocaleString('en-US')} sqm`
}

export function formatSigned(value: number) {
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(1))
  return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString('en-US')}`
}

export function formatPercent(value: number) {
  return `${formatSigned(Number(value.toFixed(1)))}%`
}

export function planningMemoFileName(planNumber: string) {
  return `${planNumber.replace(/[^\p{L}\p{N}-]+/gu, '-')}-planning-memo.md`
}
