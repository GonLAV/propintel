/// <reference types="node" />

import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { DiraCase, createCapturedEvidence, createNewCase } from './model'

vi.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: async (_algorithm: string, input: string) => (
    createHash('sha256').update(input).digest('hex')
  ),
}))

import { generateEvidenceTrustLedger } from './evidenceTrustLedger'

function withEvidence(capturedAt: string): DiraCase {
  const evidence = {
    ...createCapturedEvidence({
      label: 'צילום נזק',
      type: 'photo',
      hash: 'ab'.repeat(32),
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
    }),
    id: 'evidence-stable-id',
    capturedAt,
  }

  return {
    ...createNewCase({
      title: 'נזק בדירה',
      address: 'רחוב הבדיקה 1',
      landlordName: 'בעל הדירה',
      category: 'repair',
    }),
    id: 'case-stable-id',
    evidence: [evidence],
  }
}

describe('evidence trust ledger', () => {
  it('binds timestamps into the SHA-256 evidence chain', async () => {
    const first = await generateEvidenceTrustLedger(withEvidence('2026-01-01T10:00:00.000Z'))
    const second = await generateEvidenceTrustLedger(withEvidence('2026-05-01T18:30:00.000Z'))

    expect(first.entries[0].digest).toMatch(/^[a-f0-9]{64}$/)
    expect(first.entries[0].chainProof).toMatch(/^[a-f0-9]{64}$/)
    expect(first.chainId).not.toBe(second.chainId)
    expect(first.entries[0].digest).not.toBe(second.entries[0].digest)
  })
})
