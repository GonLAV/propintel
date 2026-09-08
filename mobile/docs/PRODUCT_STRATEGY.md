# DiraShield Product Strategy

## Core Problem

Israeli renters and small landlords handle expensive disputes through fragmented WhatsApp messages, unclear photos, missing handover records, and informal promises. The pain is sharp around deposits, repairs, move-in/move-out condition reports, and unclear lease clauses. By the time money is withheld or a repair is ignored, the evidence is scattered and emotionally loaded.

## Target Users In Israel

- Renters aged 22-45 in Tel Aviv, Gush Dan, Jerusalem, Haifa, Beer Sheva, and university cities.
- Parents helping children sign or exit leases.
- Small landlords with 1-5 apartments who want clean documentation.
- Property managers and real estate agents managing handover workflows.
- Legal clinics and tenant-rights organizations that need structured intake.

## Existing Solutions And Why They Are Not Enough

- WhatsApp: convenient, but chaotic, not structured, and weak as a timeline of evidence.
- Generic document-signing tools: too heavy and not adapted to rental disputes.
- Lawyer consultation: expensive and usually too late.
- Tenant Facebook groups: useful advice, but no workflow, evidence capture, or follow-through.
- Property-management platforms: optimized for landlords and portfolios, not renter protection.

## 10x Value Proposition

DiraShield turns a stressful housing dispute into a three-minute guided protection case: classify the problem, capture signed evidence, generate a formal Hebrew message, and track deadlines. The 10x improvement is speed plus evidence quality: users do not need to know legal process, wording, or what proof matters.

## MVP Scope

Essential only:

1. Phone login.
2. Create a case in three steps.
3. Capture or attach evidence with timestamp/hash metadata.
4. Generate a formal Hebrew letter.
5. Track next action and deadline.
6. Resolution Autopilot: score case readiness, expose evidence gaps, and recommend the next least-escalatory move.
7. Evidence Trust Ledger: chain evidence metadata into an auditable proof timeline that can be shared before escalation.

Removed from MVP:

- Marketplace of lawyers.
- Full contract analysis.
- Payments.
- Community feed.
- Complex chat.
- Desktop admin workflows beyond basic support review.

## Monetization

- Freemium: one active case free.
- Plus: 19-29 ILS/month for unlimited cases, document export, and reminders.
- Success fee add-on: fixed-fee legal letter review by partner lawyers.
- B2B: property managers pay per managed unit for handover packs.
- Insurance/fintech partnerships: renters insurance, deposit alternatives, guarantor products.

## First 10,000 Users In Israel

1. Launch around university rental season with Hebrew TikTok/Reels demos: "how to get your deposit back."
2. Partner with student unions in Tel Aviv University, Hebrew University, Ben-Gurion, Technion, Reichman.
3. SEO landing pages for Hebrew pain queries: החזרת פיקדון, בעל דירה לא מתקן, פרוטוקול מסירת דירה.
4. WhatsApp sharing loop: every generated letter includes a clean DiraShield footer and invite link.
5. Free handover checklist PDF lead magnet.
6. Partnerships with tenant-rights NGOs and municipal young-adult centers.
7. Referral reward: invite a roommate, both unlock one premium export.

## Viral Loop

Every case naturally touches another person: landlord, roommate, parent, agent, or lawyer. The generated letter and evidence packet become the viral artifact. Recipients see a professional workflow and can create their own case or property handover pack.

## Differentiating Feature: Resolution Autopilot

Typical rental tools store documents or generate templates. Resolution Autopilot acts like a dispute operating layer: it reviews the case category, evidence mix, hash quality, status, and next action, then produces a readiness score and a concrete settlement move. The product value is behavioral, not decorative: users learn whether to send, wait, document, or clarify before they accidentally escalate with weak evidence.

This should remain deterministic and explainable in the MVP. Later, server-side models can personalize wording from verified case history, but the first version avoids legal hallucination by only using facts already inside the case.

## Differentiating Feature: Evidence Trust Ledger

Typical evidence folders are just piles of photos and screenshots. Evidence Trust Ledger turns every case into a chronological proof chain: each item receives a ledger digest, the chain produces a final Chain ID, and the app flags weak metadata or missing proof types. This gives renters a professional artifact they can share with a landlord, parent, support organization, or lawyer without waiting for a server-side notarization product.

The MVP version is intentionally deterministic and local. It does not claim legal certification; it explains evidence quality, order, and gaps. The production path is clear: server-side content hashing, immutable storage, verified uploads, and exportable evidence packets.