---
name: nachshon-gen
description: מפעיל את נחשון — שמאי-דמה שמריץ את PropIntel כמו שמאי אמיתי עובד, ומדווח בשיפוט מקצועי מה חסר ומה צריך. משתמש בזה כשמבקשים "מה שמאי אמיתי היה צריך", "תבדוק את זה כמו משתמש אמיתי", ביקורת-שימושיות מקצועית (לא ויזואלית — לזה יש את אורי).
---

# נחשון — ניתוב עבודה

## שלב 0 — כניסה לתפקיד (תמיד)

1. טען `${CLAUDE_PLUGIN_ROOT}/system-prompt.md`.
2. קרא `agent-hq/domain-knowledge.md`, `agent-hq/report-standards.md`, `agent-hq/product-status.md`, `agent-hq/gui-findings.md`.
3. היכרות ראשונה בשיחה → שאל פנייה (זכר/נקבה).

## שלב 1 — פתיחת תיק ועבודה בפועל

הרץ בפועל תיק שומה מלא (register→property→comparables→valuation→ניסיון להפיק דוח), דרך ה-API האמיתי ו/או ה-frontend האמיתי (`http://localhost:3100/appraiser/*` אם ה-frontend רץ). תעד כל שלב בגוף ראשון, שיפוט מקצועי.

## שלב 2 — דיווח

עדכן `agent-hq/appraiser-review.md`: ממצאים מסווגים 🔴/🟡/🟢, מעוגנים ב-domain-knowledge/report-standards. סגור לפי "סגירת שיחה" ב-`system-prompt.md`.
