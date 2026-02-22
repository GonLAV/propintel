/**
 * Appraisal Engine Backend - Express.js Starter
 * 
 * To use this:
 * 1. Create separate folder: mkdir backend && cd backend
 * 2. npm init -y && npm install express pg zod cors dotenv
 * 3. npm install -D typescript ts-node nodemon
 * 4. Copy this file and adjust database connection
 * 5. npm run dev
 */

import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { Pool } from 'pg'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/appraisal_db'
})

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Error handling
app.use((err: Error, _req: Request, res: Response) => {
  console.error(err)
  res.status(500).json({ error: err.message })
})

// ============= ENDPOINTS =============

/**
 * POST /api/comparables/import
 * Import transactions from CSV or JSON
 */
app.post('/api/comparables/import', async (req: Request, res: Response) => {
  try {
    const { format, data } = req.body as { format: 'csv' | 'json'; data: string }

    if (!format || !data) {
      return res.status(400).json({ error: 'format and data required' })
    }

    // Delegate to frontend parsing (send back parsed data)
    // In production, you might want to do this on backend
    const comparables: unknown[] = []
    const errors: unknown[] = []

    // Save to database if valid
    for (const comp of comparables) {
      await db.query(
        `INSERT INTO comparables (address, type, sale_price, sale_date, built_area, rooms, floor, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
        [
          (comp as Record<string, unknown>).address,
          (comp as Record<string, unknown>).type,
          (comp as Record<string, unknown>).salePrice,
          (comp as Record<string, unknown>).saleDate,
          (comp as Record<string, unknown>).builtArea,
          (comp as Record<string, unknown>).rooms,
          (comp as Record<string, unknown>).floor
        ]
      )
    }

    res.json({ comparables, errors })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Import failed' })
  }
})

/**
 * POST /api/valuations
 * Calculate valuation (all 3 methods)
 */
app.post('/api/valuations', async (req: Request, res: Response) => {
  try {
    const { propertyId, method } = req.body as { propertyId: string; method: string }

    if (!propertyId || !method) {
      return res.status(400).json({ error: 'propertyId and method required' })
    }

    // Fetch property
    const propertyResult = await db.query('SELECT * FROM properties WHERE id = $1', [propertyId])
    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' })
    }

    // Fetch selected comparables
    const _compsResult = await db.query(
      `SELECT c.* FROM comparables c
       INNER JOIN property_comparables pc ON c.id = pc.comparable_id
       WHERE pc.property_id = $1 AND pc.selected = true`,
      [propertyId]
    )
    void _compsResult

    // TODO: Call ValuationEngine.calculate* methods here
    // For now, return mock result
    const result = {
      propertyId,
      method,
      estimatedValue: 2950000,
      valueRange: { min: 2700000, max: 3200000 },
      confidence: 85,
      methodology: 'Based on comparable sales analysis',
      reconciliation: 'Reconciliation text here',
      assumptions: ['Assumption 1', 'Assumption 2'],
      limitations: ['Limitation 1', 'Limitation 2'],
      qualityChecks: []
    }

    // Save to database
    await db.query(
      `INSERT INTO valuations (property_id, method, estimated_value, range_min, range_max, confidence, methodology, reconciliation, assumptions, limitations, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
      [
        propertyId,
        method,
        result.estimatedValue,
        result.valueRange.min,
        result.valueRange.max,
        result.confidence,
        result.methodology,
        result.reconciliation,
        JSON.stringify(result.assumptions),
        JSON.stringify(result.limitations)
      ]
    )

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Valuation failed' })
  }
})

/**
 * GET /api/valuations/:propertyId
 * Get all valuations for a property
 */
app.get('/api/valuations/:propertyId', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT * FROM valuations WHERE property_id = $1 ORDER BY created_at DESC`,
      [req.params.propertyId]
    )

    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Query failed' })
  }
})

/**
 * POST /api/reports
 * Generate report sections
 */
app.post('/api/reports', async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.body as { propertyId: string; template: string }

    if (!propertyId) {
      return res.status(400).json({ error: 'propertyId required' })
    }

    // TODO: Call ReportGenerator.generateStandardSections here
    const sections = [
      {
        id: 'summary',
        title: 'תקציר ניהולי',
        content: 'Executive summary content',
        order: 0,
        enabled: true
      }
    ]

    res.json({ sections })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Report generation failed' })
  }
})

/**
 * GET /api/branding
 * Get branding settings
 */
app.get('/api/branding', async (req: Request, res: Response) => {
  try {
    // In production, get user/org ID from JWT
    const result = await db.query('SELECT settings FROM branding_settings LIMIT 1')

    if (result.rows.length === 0) {
      return res.json({
        logo: null,
        colors: { primary: '#6366f1', secondary: '#8b5cf6' }
      })
    }

    res.json(result.rows[0].settings)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get branding' })
  }
})

/**
 * PUT /api/branding
 * Update branding settings
 */
app.put('/api/branding', async (req: Request, res: Response) => {
  try {
    const settings = req.body

    // In production, get user/org ID from JWT
    await db.query(
      `INSERT INTO branding_settings (owner_id, settings, created_at, updated_at)
       VALUES ($1, $2, now(), now())
       ON CONFLICT (owner_id) DO UPDATE SET settings = $2, updated_at = now()`,
      ['default-org', JSON.stringify(settings)]
    )

    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update branding' })
  }
})

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`)
  console.log(`✓ Health check: http://localhost:${PORT}/health`)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...')
  await db.end()
  process.exit(0)
})
