/**
 * Backend API Specification for Appraisal Engine
 * Ready for implementation with Node.js + Express + PostgreSQL
 *
 * Features:
 * - Comparables import (CSV/JSON)
 * - Valuations (calculate all 3 methods + hybrid)
 * - Reports generation
 * - Branding settings
 */

// ============= ENDPOINTS =============

// POST /api/comparables/import
// Import transactions from CSV or JSON
// Body: { format: 'csv' | 'json', data: string }
// Response: { comparables: Comparable[], errors: Error[] }

// POST /api/valuations
// Calculate all valuation methods
// Body: { propertyId, method: 'comparable-sales' | 'cost-approach' | 'income-approach' | 'all' }
// Response: ValuationResult | ValuationResult[]

// GET /api/valuations/:propertyId
// Get all valuations for a property

// POST /api/reports
// Generate report sections
// Body: { propertyId, template: 'standard' | 'detailed' | 'summary' }
// Response: ReportSection[]

// POST /api/reports/export
// Export report as HTML/PDF/DOCX
// Body: { reportId, format: 'html' | 'pdf' | 'docx' }

// GET /api/branding
// Get branding settings (per user/org)

// PUT /api/branding
// Update branding settings

// ============= DATA MODELS =============

// Property
export interface Property {
  id: string
  clientId: string
  address: {
    street: string
    city: string
    neighborhood: string
    postalCode: string
  }
  type: 'apartment' | 'house' | 'penthouse' | 'garden-apartment' | 'duplex' | 'studio' | 'commercial' | 'land'
  details: {
    builtArea: number
    totalArea?: number
    rooms: number
    bedrooms: number
    bathrooms: number
    floor: number
    totalFloors?: number
    buildYear: number
    condition: 'new' | 'excellent' | 'good' | 'fair' | 'poor' | 'renovation-needed'
    parking: number
    storage: boolean
    balcony: boolean
    elevator: boolean
    accessible: boolean
  }
  features: string[]
  createdAt: string
  updatedAt: string
}

// Comparable (transaction)
export interface Comparable {
  id: string
  address: string
  type: string
  salePrice: number
  saleDate: string
  builtArea: number
  rooms: number
  floor: number
  distance: number
  adjustments: {
    location: number
    size: number
    condition: number
    floor: number
    age: number
    features: number
    total: number
  }
  adjustedPrice: number
  pricePerSqm: number
  selected: boolean
  similarityScore?: number
}

// Valuation Result
export interface ValuationResult {
  id?: string
  propertyId: string
  method: 'comparable-sales' | 'cost-approach' | 'income-approach' | 'hybrid'
  estimatedValue: number
  valueRange: { min: number; max: number }
  confidence: number
  methodology: string
  reconciliation: string
  assumptions: string[]
  limitations: string[]
  qualityChecks?: Array<{
    severity: 'info' | 'warning' | 'error'
    code: string
    message: string
  }>
  createdAt?: string
}

// Report Section
export interface ReportSection {
  id: string
  title: string
  content: string
  order: number
  enabled: boolean
}

// ============= EXPRESS MIDDLEWARE EXAMPLE =============

/*
import express from 'express'
import { Pool } from 'pg'
import { ValuationEngine, type ValuationResult } from './valuationEngine'
import { parseCSV } from './csvImport'

const app = express()
const db = new Pool({ connectionString: process.env.DATABASE_URL })

app.use(express.json())

// POST /api/comparables/import
app.post('/api/comparables/import', async (req, res) => {
  try {
    const { format, data } = req.body
    
    if (format === 'csv') {
      const result = parseCSV(data)
      
      // Save to DB
      for (const comp of result.comparables) {
        await db.query(
          `INSERT INTO comparables (address, type, sale_price, sale_date, built_area, rooms, floor)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [comp.address, comp.type, comp.salePrice, comp.saleDate, comp.builtArea, comp.rooms, comp.floor]
        )
      }
      
      res.json({ comparables: result.comparables, errors: result.errors })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/valuations
app.post('/api/valuations', async (req, res) => {
  try {
    const { propertyId, method, inputs } = req.body
    
    // Fetch property from DB
    const property = await db.query('SELECT * FROM properties WHERE id = $1', [propertyId])
    if (!property.rows.length) {
      return res.status(404).json({ error: 'Property not found' })
    }
    
    // Fetch comparables
    const comps = await db.query('SELECT * FROM property_comparables WHERE property_id = $1 AND selected = true', [propertyId])
    
    let result: ValuationResult | null = null
    
    if (method === 'comparable-sales' || method === 'all') {
      result = ValuationEngine.calculateComparableSalesApproach(property.rows[0], comps.rows)
      // Save to DB
      await db.query(
        `INSERT INTO valuations (property_id, method, estimated_value, range_min, range_max, confidence, methodology, reconciliation, assumptions, limitations)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [propertyId, 'comparable-sales', result.estimatedValue, result.valueRange.min, result.valueRange.max, result.confidence, result.methodology, result.reconciliation, JSON.stringify(result.assumptions), JSON.stringify(result.limitations)]
      )
    }
    
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/valuations/:propertyId
app.get('/api/valuations/:propertyId', async (req, res) => {
  try {
    const valuations = await db.query('SELECT * FROM valuations WHERE property_id = $1 ORDER BY created_at DESC', [req.params.propertyId])
    res.json(valuations.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(3000, () => console.log('Server running on port 3000'))
*/

// ============= DEPLOYMENT NOTES =============

/*
Prerequisites:
- Node.js 18+ (LTS)
- PostgreSQL 13+ (with schema from DB_SCHEMA.md)
- dotenv for environment variables

Installation:
  npm install express pg zod sonner @hookform/resolvers

Environment Variables (.env):
  DATABASE_URL=postgres://user:password@localhost:5432/appraisal_db
  PORT=3000
  NODE_ENV=production
  JWT_SECRET=your-secret-key

Database Setup:
  1. Create database: createdb appraisal_db
  2. Run schema: psql appraisal_db < DB_SCHEMA.md
  3. Create indexes for performance

Development:
  npm run dev   // with nodemon
  npm run build // compile TypeScript
  npm start     // run production

Testing:
  npm run test  // Jest

Deployment:
  - Use PM2 or systemd for process management
  - Set up reverse proxy (nginx)
  - Enable HTTPS
  - Add rate limiting
  - Set up database backups
*/
