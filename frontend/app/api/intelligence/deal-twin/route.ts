import { z } from 'zod'
import { apiError, createRequestContext, jsonResponse, rateLimit, readJSON, sanitizeText } from '@/lib/api-server'
import { analyzeDealTwin } from '@/lib/deal-twin'

const schema = z.object({
  assetName: z.string().min(2).max(120).transform(sanitizeText).optional(),
  city: z.string().min(2).max(80).transform(sanitizeText).optional(),
  mode: z.enum(['acquire', 'hold', 'redevelop']),
  askingPrice: z.number().positive().max(1_000_000_000),
  estimatedValue: z.number().positive().max(1_000_000_000),
  annualRent: z.number().min(0).max(100_000_000),
  capex: z.number().min(0).max(1_000_000_000),
  planningUpsideSqm: z.number().min(0).max(1_000_000),
  riskScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  debtRatio: z.number().min(0).max(85),
  exitCapRate: z.number().min(1).max(20),
})

export async function POST(request: Request) {
  const context = createRequestContext(request)
  const limited = rateLimit(context, 'intelligence:deal-twin', { limit: 24, windowMs: 60_000 })
  if (limited) return limited

  const parsed = schema.safeParse(await readJSON(request))

  if (!parsed.success) {
    return apiError(context, 'Invalid deal twin payload', 400, 'invalid_payload')
  }

  return jsonResponse(context, analyzeDealTwin(parsed.data))
}