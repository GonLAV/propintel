// Error-message translation shared by both server-side route handlers
// (app/api/appraiser/auth/*/route.ts) and client pages. Deliberately no
// 'use client'/'use server' directive -- this is plain, side-effect-free
// string mapping, safe to import from either side. The real saas-backend
// API is English-first (and may have non-Hebrew consumers beyond this
// frontend), so these messages are translated at the boundary rather than
// changed at the source.

// Valuation-failure reasons come straight from the backend engine in
// English (internal, technical strings) -- translate the ones we know
// about rather than let them leak through a Hebrew UI untranslated.
export function translateValuationError(reason: string | null | undefined): string {
  if (!reason) return 'נכשל'
  if (/area_?sqm required/i.test(reason)) return 'לא צוין שטח הנכס — נדרש לחישוב השומה'
  if (/no comparable sales/i.test(reason)) {
    return 'לא נמצאו עסקאות השוואה לעיר/סוג הנכס הזה בטווח הזמן המקובל (24 החודשים האחרונים) — ניתן להוסיף עסקאות ישנות יותר כנתון היסטורי, אך הן לא ייכללו בשומה אוטומטית'
  }
  return reason
}

// Auth/account error messages thrown by auth.service.js and
// passwordReset.service.js, as surfaced to the login/register/reset/
// change-password forms under app/appraiser/*.
const AUTH_ERROR_MAP: Array<[RegExp, string]> = [
  [/^invalid credentials$/i, 'אימייל או סיסמה שגויים'],
  [/^multiple tenants found.*tenantSlug$/i, 'נמצאו כמה משרדים המשויכים לאימייל זה — יש להזין את קוד המשרד בשדה "קוד משרד" למטה'],
  [/^account disabled$/i, 'החשבון מושבת. יש לפנות למנהל/ת המשרד'],
  [/^tenant slug already in use$/i, 'קוד המשרד הזה תפוס — יש לבחור קוד אחר'],
  [/^current password is incorrect$/i, 'הסיסמה הנוכחית שגויה'],
  [/^invalid or expired reset token$/i, 'קישור האיפוס אינו תקין או שפג תוקפו — יש לבקש קישור חדש'],
  [/^reset token already used$/i, 'קישור האיפוס הזה נוצל כבר — יש לבקש קישור חדש'],
  [/^reset token expired$/i, 'קישור האיפוס פג תוקף — יש לבקש קישור חדש'],
  // The proxy route already turns this into a clearer message once a
  // refresh attempt has also failed -- this is a fallback for any other
  // path that might still surface the raw backend string.
  [/^(invalid or expired token|missing bearer token)$/i, 'החיבור פג תוקף — יש להתחבר מחדש'],
  [/^invalid or expired invite$/i, 'קישור ההזמנה אינו תקין או שפג תוקפו — יש לבקש הזמנה חדשה ממנהל/ת המשרד'],
  [/^only an owner can invite a new owner$/i, 'רק בעל/ת המשרד יכול/ה להזמין בעלים נוספים'],
]

export function translateAuthError(message: string | null | undefined): string {
  if (!message) return 'שגיאה לא צפויה'
  const hit = AUTH_ERROR_MAP.find(([pattern]) => pattern.test(message))
  return hit ? hit[1] : message
}
