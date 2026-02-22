# GISN / TABA PDF Ingestion

This repo includes a local ingestion tool to turn Tel-Aviv GISN planning PDFs (תב"ע, תיק מידע וכו') into a searchable local index that the app can use alongside data.gov.il.

What it does:
- Extracts text from PDFs placed under `public/gisn/`
- Saves per-file JSON extracts under `public/gisn-extracts/`
- Builds a compact `public/gisn-index.json` for quick lookup
- Marks all extracted info as “best-effort/unverified” — always refer to the original PDFs

How to use:
1. Create the input directory and place PDFs:
   - `public/gisn/` (e.g., `public/gisn/TA-plan-1234.pdf`)
2. Install deps (once):
   - `npm install`
3. Run the ingestion:
   - `npm run ingest:gisn`
4. Outputs:
   - `public/gisn-extracts/*.json` (full text per file)
   - `public/gisn-index.json` (index without full text)

Notes:
- You can pass a custom input dir: `npm run ingest:gisn -- ./my-dir`
- Detectors are heuristic: address/plan/block/parcel may be incomplete. Treat as hints, not facts.
- Keep PDFs inside `public/` if you want the app to be able to link back to them.

Privacy & Legality:
- Only process PDFs you’re permitted to use.
- The index is local to your repo; it’s not uploaded anywhere by default.
