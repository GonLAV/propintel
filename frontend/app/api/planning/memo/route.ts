import { z } from 'zod'
import { apiError, createRequestContext, jsonResponse, rateLimit, readJSON, sanitizeText } from '@/lib/api-server'
import { buildPlanningMemo } from '@/lib/planning-database'

const schema = z.object({
  previousPlan: z.string().min(2).max(64).transform(sanitizeText),
  newPlan: z.string().min(2).max(64).transform(sanitizeText),
})

export async function POST(request: Request) {
  const context = createRequestContext(request)
  const limited = rateLimit(context, 'planning:memo', { limit: 20, windowMs: 60_000 })
  if (limited) return limited

  const parsed = schema.safeParse(await readJSON(request))

  if (!parsed.success) {
    return apiError(context, 'Invalid planning memo payload', 400, 'invalid_payload')
  }

  return jsonResponse(context, buildPlanningMemo(parsed.data.previousPlan, parsed.data.newPlan))
}
