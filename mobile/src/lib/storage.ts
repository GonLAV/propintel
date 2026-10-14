import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'
import { z } from 'zod'
import { DiraCase } from '@/features/cases/model'

const casesKeyPrefix = 'dirashield.cases.v1'

const evidenceSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['photo', 'note', 'document']),
  label: z.string(),
  capturedAt: z.string().datetime(),
  hash: z.string().min(1),
  hashAlgorithm: z.enum(['local-fnv1a', 'sha-256']),
  sourceUri: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().nonnegative().optional(),
})

const deliveryEventSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['letter', 'autopilot', 'ledger']),
  outcome: z.enum(['shared', 'dismissed']),
  occurredAt: z.string().datetime(),
})

const caseSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  address: z.string(),
  landlordName: z.string(),
  status: z.enum(['draft', 'sent', 'resolved', 'urgent']),
  category: z.enum(['handover', 'repair', 'deposit', 'contract']),
  deadline: z.string(),
  evidence: z.array(evidenceSchema),
  deliveryEvents: z.array(deliveryEventSchema).default([]),
  nextAction: z.string(),
  createdAt: z.string().datetime(),
})

export async function loadCases(ownerId: string): Promise<DiraCase[] | null> {
  const stored = await AsyncStorage.getItem(await casesKey(ownerId))
  if (stored === null) return null

  const parsedJson: unknown = JSON.parse(stored)
  const parsed = z.array(caseSchema).safeParse(parsedJson)
  if (!parsed.success) throw new Error('נתוני התיקים השמורים אינם תקינים')
  return parsed.data
}

export async function saveCases(ownerId: string, cases: DiraCase[]) {
  const parsed = z.array(caseSchema).parse(cases)
  await AsyncStorage.setItem(await casesKey(ownerId), JSON.stringify(parsed))
}

export async function clearCases(ownerId: string) {
  await AsyncStorage.removeItem(await casesKey(ownerId))
}

async function casesKey(ownerId: string) {
  const ownerHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    ownerId.trim().toLowerCase(),
  )
  return `${casesKeyPrefix}.${ownerHash}`
}
