import { DiraCase, EvidenceItem } from '@/features/cases/model'

export type ResolutionAutopilot = {
  readinessScore: number
  tier: 'weak' | 'workable' | 'strong'
  headline: string
  recommendedMove: string
  settlementFrame: string
  proofGaps: string[]
  nextActions: string[]
  shareText: string
}

const categoryEvidence: Record<DiraCase['category'], Array<EvidenceItem['type']>> = {
  deposit: ['photo', 'document', 'note'],
  repair: ['photo', 'note', 'document'],
  handover: ['photo', 'document', 'note'],
  contract: ['document', 'note', 'photo'],
}

const categoryMove: Record<DiraCase['category'], string> = {
  deposit: 'שליחת דרישה מדויקת להחזרת הפיקדון עם פירוט ראיות ותאריך יעד ברור.',
  repair: 'שליחת דרישת טיפול עם תיעוד הנזק, השפעה יומית ותאריך יעד לתיקון.',
  handover: 'יצירת פרוטוקול מסירה מסודר ובקשה לאישור כתוב על מצב הדירה.',
  contract: 'בקשה להבהרת הסעיף הבעייתי בכתב לפני כל פעולה כספית או משפטית.',
}

export function generateResolutionAutopilot(item: DiraCase): ResolutionAutopilot {
  const score = calculateReadinessScore(item)
  const tier = score >= 78 ? 'strong' : score >= 52 ? 'workable' : 'weak'
  const proofGaps = findProofGaps(item)
  const nextActions = buildNextActions(item, proofGaps, tier)
  const headline = tier === 'strong'
    ? 'התיק מוכן לפנייה חזקה ומסודרת'
    : tier === 'workable'
      ? 'יש בסיס טוב, אבל חסרות ראיות שיחזקו את הפנייה'
      : 'מוקדם להסלים. קודם סוגרים חורים בראיות'

  const recommendedMove = categoryMove[item.category]
  const settlementFrame = buildSettlementFrame(item, tier)
  const shareText = buildShareText(item, score, headline, recommendedMove, nextActions)

  return {
    readinessScore: score,
    tier,
    headline,
    recommendedMove,
    settlementFrame,
    proofGaps,
    nextActions,
    shareText,
  }
}

function calculateReadinessScore(item: DiraCase) {
  const evidenceTypes = new Set(item.evidence.map((entry) => entry.type))
  const requiredTypes = categoryEvidence[item.category]
  const requiredCoverage = requiredTypes.filter((type) => evidenceTypes.has(type)).length / requiredTypes.length
  const shaEvidence = item.evidence.filter((entry) => entry.hashAlgorithm === 'sha-256').length
  const volumeScore = Math.min(item.evidence.length / 4, 1)
  const hashScore = item.evidence.length === 0 ? 0 : shaEvidence / item.evidence.length
  const urgencyBoost = item.status === 'urgent' ? 8 : 0

  return Math.min(100, Math.round(requiredCoverage * 42 + volumeScore * 30 + hashScore * 20 + urgencyBoost))
}

function findProofGaps(item: DiraCase) {
  const labels = new Set(item.evidence.map((entry) => entry.type))
  const gaps: string[] = categoryEvidence[item.category]
    .filter((type) => !labels.has(type))
    .map((type) => type === 'photo' ? 'צילום ברור של מצב הדירה או הנזק' : type === 'document' ? 'מסמך תומך: חוזה, העברה, קבלה או צילום מסך' : 'סיכום כתוב של השיחה או ההתחייבות')

  if (!item.evidence.some((entry) => entry.hashAlgorithm === 'sha-256')) {
    gaps.push('לפחות ראיה אחת שנוספה עכשיו עם חתימת SHA-256 מקומית')
  }

  return gaps.slice(0, 4)
}

function buildNextActions(item: DiraCase, gaps: string[], tier: ResolutionAutopilot['tier']) {
  const actions = gaps.slice(0, 2).map((gap) => `להוסיף: ${gap}`)
  if (tier === 'strong') {
    actions.unshift('לשלוח את המכתב היום ולבקש אישור כתוב')
  } else if (tier === 'workable') {
    actions.unshift('לצרף עוד ראיה אחת לפני שליחת המכתב')
  } else {
    actions.unshift('לא לשלוח איום. לבנות קודם רצף ראיות עובדתי')
  }

  if (item.category === 'deposit') actions.push('לציין סכום, תאריך פינוי ואמצעי החזר מבוקש')
  if (item.category === 'repair') actions.push('לתעד השפעה יומית ולבקש מועד תיקון ספציפי')

  return actions.slice(0, 4)
}

function buildSettlementFrame(item: DiraCase, tier: ResolutionAutopilot['tier']) {
  const tone = tier === 'strong' ? 'תקיף, קצר ומגובה בראיות' : tier === 'workable' ? 'ענייני, עם בקשה להשלמת טיפול' : 'רגוע ואוסף עובדות'
  return `מסגרת מומלצת: ${tone}. להתמקד בכתובת ${item.address}, בנושא "${item.title}", ובפעולה אחת ברורה: ${item.nextAction}.`
}

function buildShareText(item: DiraCase, score: number, headline: string, recommendedMove: string, nextActions: string[]) {
  return [
    `DiraShield Resolution Autopilot`,
    `תיק: ${item.title}`,
    `ציון מוכנות: ${score}/100`,
    headline,
    '',
    `מהלך מומלץ: ${recommendedMove}`,
    '',
    'צעדים:',
    ...nextActions.map((action) => `- ${action}`),
  ].join('\n')
}