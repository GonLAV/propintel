#!/usr/bin/env node
/* eslint-disable */
/*
  GISN/TABA PDF ingestion utility.
  - Scans an input directory (default: public/gisn)
  - Extracts text from *.pdf
  - Writes per-file JSON into public/gisn-extracts/{basename}.json
  - Builds a compact index at public/gisn-index.json (no full text)

  Usage:
    node scripts/ingest-gisn.cjs [inputDir]
*/

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const pdfParse = require('pdf-parse');

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

function hashBuffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

function safeRel(from, to) {
  const rel = path.relative(from, to).split(path.sep).join('/');
  return rel.startsWith('..') ? rel : rel;
}

function detectMetadata(text) {
  // Heuristic extraction of common planning fields from Hebrew PDFs
  // This is intentionally conservative; we label everything as best-effort.
  const norm = (text || '').replace(/[\u200F\u200E]/g, '');
  const find = (re) => {
    const m = norm.match(re);
    return m ? (m[1] || m[0]).trim() : null;
  };

  const planRegex = /ת(?:ו)?ב"?ע\s*[:\-]?\s*([\u0590-\u05FF\w\-\/\.]{2,})/i;
  const blockRegex = /גוש\s*[:\-]?\s*(\d{1,6})/;
  const parcelRegex = /חלקה\s*[:\-]?\s*(\d{1,6})/;
  const addressRegex = /כתובת\s*[:\-]?\s*([\u0590-\u05FF\s\d\-\/"']{4,})/;
  const streetRegex = /רחוב\s*[:\-]?\s*([\u0590-\u05FF\s\-"']{2,})/;
  const cityRegex = /עיר\s*[:\-]?\s*([\u0590-\u05FF\s\-"']{2,})/;
  const houseNoRegex = /מס(?:פר)?\s*בית\s*[:\-]?\s*(\d{1,5}[A-Za-z\u0590-\u05FF\-\\/]?)/;

  const planNumbers = Array.from(new Set(
    (norm.match(/(?:ת(?:ו)?ב"?ע|תכנית)\s*[:\-]?\s*[\u0590-\u05FF\w\-\/\.]{2,}/g) || [])
      .map(s => s.replace(/.*?[:\-]/, '').trim())
      .filter(Boolean)
  ));

  return {
    address: find(addressRegex),
    street: find(streetRegex),
    houseNumber: find(houseNoRegex),
    city: find(cityRegex),
    block: find(blockRegex),
    parcel: find(parcelRegex),
    primaryPlan: find(planRegex),
    planNumbers,
  };
}

function derivePlanKey(filePath, metadata, text) {
  // Try in order: explicit primaryPlan -> any planNumbers -> numeric code from filename -> first 4-8 digit sequence in text
  const fromMeta = metadata?.primaryPlan || (metadata?.planNumbers && metadata.planNumbers[0]);
  if (fromMeta) return String(fromMeta).trim();

  const base = path.basename(filePath).toLowerCase();
  const mFile = base.match(/(\d{3,8})/);
  if (mFile) return mFile[1];

  const mText = (text || '').match(/(\d{4,8})/);
  if (mText) return mText[1];

  return null;
}

async function ingest(inputDir) {
  const cwd = process.cwd();
  const baseDir = inputDir ? path.resolve(cwd, inputDir) : path.resolve(cwd, 'public/gisn');
  const outDir = path.resolve(cwd, 'public/gisn-extracts');
  const indexPath = path.resolve(cwd, 'public/gisn-index.json');

  await ensureDir(outDir);

  let files = [];
  try {
    const entries = await fsp.readdir(baseDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && e.name.toLowerCase().endsWith('.pdf')) {
        files.push(path.join(baseDir, e.name));
      }
    }
  } catch (e) {
    // Directory does not exist; proceed with empty set
    files = [];
  }

  const index = [];
  for (const file of files) {
    try {
      const buf = await fsp.readFile(file);
      const hash = hashBuffer(buf);
      const stat = await fsp.stat(file);
      const data = await pdfParse(buf);
      const text = (data.text || '').trim();
      const meta = detectMetadata(text);

      const baseName = path.basename(file, path.extname(file));
      const outFile = path.join(outDir, `${baseName}.json`);
      const relPath = safeRel(path.resolve(cwd, 'public'), file);

      const planKey = derivePlanKey(file, meta, text);

      const perFile = {
        id: `${baseName}-${hash}`,
        source: 'gisn.tel-aviv.gov.il',
        fileName: path.basename(file),
        relPath,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        extractedAt: new Date().toISOString(),
        textLength: text.length,
        metadata: meta,
        planKey,
        fullText: text,
        tags: ['taba', 'gisn', 'tel-aviv']
      };

      await fsp.writeFile(outFile, JSON.stringify(perFile, null, 2), 'utf8');

      index.push({
        id: perFile.id,
        source: perFile.source,
        fileName: perFile.fileName,
        relPath: perFile.relPath,
        sizeBytes: perFile.sizeBytes,
        modifiedAt: perFile.modifiedAt,
        extractedAt: perFile.extractedAt,
        textLength: perFile.textLength,
        metadata: perFile.metadata,
        planKey: perFile.planKey,
        tags: perFile.tags,
        extractPath: safeRel(path.resolve(cwd, 'public'), outFile),
        sample: perFile.fullText.slice(0, 400)
      });

      process.stdout.write(`✔ Extracted ${perFile.fileName} -> ${safeRel(cwd, outFile)}\n`);
    } catch (err) {
      console.error(`✖ Failed to extract ${file}:`, err.message || err);
    }
  }

  const indexDoc = {
    generatedAt: new Date().toISOString(),
    inputDir: safeRel(process.cwd(), baseDir),
    total: index.length,
    items: index,
    disclaimer: 'Best-effort text extraction from PDFs for appraisal workflow. Treat as unverified; always refer to the original PDFs.'
  };

  await fsp.writeFile(indexPath, JSON.stringify(indexDoc, null, 2), 'utf8');
  console.log(`\nIndex written: ${safeRel(process.cwd(), indexPath)} (items: ${index.length})`);

  if (!files.length) {
    console.log('No PDFs found. Place files in public/gisn/ and re-run.');
  }
}

const input = process.argv[2];

ingest(input).catch((e) => {
  console.error('Ingestion failed:', e);
  process.exit(1);
});
