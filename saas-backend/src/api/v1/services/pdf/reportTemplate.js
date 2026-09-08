'use strict';

/**
 * Hebrew/RTL HTML template for a PDF appraisal report ("שומת מקרקעין").
 *
 * Structure follows the standard shape of a real Israeli appraisal report
 * (opening block, 8 numbered sections, limiting conditions, conflict-of-
 * interest declaration, signature, area-calculation appendix) as far as the
 * current PropIntel data model actually supports it. Sections the product
 * doesn't yet capture (גוש/חלקה, a tracked site visit, legal-rights/registry
 * data, site photos) are rendered as an explicit, clearly-labeled gap rather
 * than invented — see `gapNote()`. Pure function: payload in, HTML out.
 */

const PROPERTY_TYPE_LABELS = {
  apartment: 'דירה',
  house: 'בית פרטי',
  office: 'משרד',
  retail: 'מסחרי',
  land: 'קרקע',
  other: 'אחר',
};

const METHOD_LABELS = {
  comparables: 'השוואת מכירות',
  cost: 'גישת העלות',
  income: 'גישת ההיוון (הכנסות)',
  reconciled: 'שילוב שיטות (מיזוג)',
};

const QUICK_SALE_DISCOUNT = 0.15; // standard convention: quick-sale ≈ market value − 15%

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value, currency = 'ILS') {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  try {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency', currency, maximumFractionDigits: 0,
    }).format(Number(value));
  } catch {
    return `${Number(value).toLocaleString('he-IL')} ${currency}`;
  }
}

function formatNumber(value, opts = {}) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('he-IL', opts).format(Number(value));
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function formatDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(d);
}

function propertyTypeLabel(type) {
  return PROPERTY_TYPE_LABELS[type] || type || '—';
}

function methodLabel(method) {
  return METHOD_LABELS[method] || method || '—';
}

function gapNote(text) {
  return `<p class="gap-note">${escapeHtml(text)}</p>`;
}

function comparablesTable(comps, currency) {
  if (!Array.isArray(comps) || comps.length === 0) return '';
  const rows = comps.map((c) => `
    <tr>
      <td>${escapeHtml(formatDate(c.soldAt))}</td>
      <td>${escapeHtml(formatNumber(c.areaSqm))}</td>
      <td>${escapeHtml(formatCurrency(c.salePrice, currency))}</td>
      <td>${escapeHtml(formatCurrency(Math.round(c.adjustedPpsm), currency))}</td>
    </tr>`).join('');
  return `
    <table class="grid">
      <thead>
        <tr>
          <th>תאריך מכירה</th>
          <th>שטח (מ״ר)</th>
          <th>מחיר מכירה</th>
          <th>מחיר מותאם למ״ר</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function reconciliationTable(methods, currency) {
  if (!Array.isArray(methods) || methods.length === 0) return '';
  const rows = methods.map((m) => `
    <tr>
      <td>${escapeHtml(methodLabel(m.method))}</td>
      <td>${escapeHtml(formatCurrency(m.value, currency))}</td>
      <td>${escapeHtml(formatNumber(m.confidence * 100, { maximumFractionDigits: 0 }))}%</td>
      <td>${escapeHtml(formatNumber(m.weight * 100, { maximumFractionDigits: 0 }))}%</td>
    </tr>`).join('');
  return `
    <p class="section-lead">השווי הסופי מהווה שקלול ממושקל של שלוש הגישות, לפי משקל המותאם לסוג הנכס ולרמת הביטחון של כל שיטה:</p>
    <table class="grid">
      <thead>
        <tr>
          <th>שיטה</th>
          <th>שווי לפי השיטה</th>
          <th>רמת ביטחון</th>
          <th>משקל בשילוב</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function valueBasesTable({ valuation, costBreakdown }) {
  const currency = valuation.currency || 'ILS';
  const rows = [];

  rows.push(['שווי הנכס (שווי שוק)', formatCurrency(valuation.estimatedValue, currency)]);

  if (Number.isFinite(valuation.estimatedValue)) {
    const quickSale = Math.round(valuation.estimatedValue * (1 - QUICK_SALE_DISCOUNT));
    rows.push([
      `שווי למימוש מהיר (הפחתה מוסכמת של ${Math.round(QUICK_SALE_DISCOUNT * 100)}%)`,
      formatCurrency(quickSale, currency),
    ]);
  }

  if (costBreakdown?.replacementCost != null) {
    rows.push(['עלות בנייה בערך כינון (לצרכי ביטוח)', formatCurrency(costBreakdown.replacementCost, currency)]);
  }
  if (costBreakdown?.landContribution != null) {
    rows.push(['אמדן שווי הקרקע', formatCurrency(costBreakdown.landContribution, currency)]);
  }

  const rowsHtml = rows.map(([label, value]) => `
    <tr><td class="basis-label">${escapeHtml(label)}</td><td class="basis-value">${escapeHtml(value)}</td></tr>
  `).join('');

  return `<table class="grid bases"><tbody>${rowsHtml}</tbody></table>`;
}

function apartmentDescription(property) {
  const parts = [];
  if (property.areaSqm != null) parts.push(`בשטח רשום של כ־${formatNumber(property.areaSqm)} מ״ר`);
  if (property.rooms != null) parts.push(`הכולל ${formatNumber(property.rooms)} חדרים`);
  if (property.floor != null) parts.push(`הממוקם בקומה ${formatNumber(property.floor)}`);
  const lead = `${propertyTypeLabel(property.propertyType)} ברחוב ${escapeHtml(property.address)}, ${escapeHtml(property.city)}`;
  const rest = parts.length ? `, ${parts.join(', ')}.` : '.';
  return `<p class="section-lead">${lead}${rest}</p>`;
}

function renderReportHtml(payload) {
  const {
    reportId, title, generatedAt, office, appraiser,
    property, valuation, comparables, reconciliation, costBreakdown,
  } = payload;
  const currency = valuation.currency || 'ILS';
  const confidencePct = Number.isFinite(valuation.confidence)
    ? formatNumber(valuation.confidence * 100, { maximumFractionDigits: 0 })
    : '—';
  const officeName = office?.name || 'משרד שמאות מקרקעין';
  const appraiserName = appraiser?.fullName || appraiser?.email || 'שמאי/ת מקרקעין';

  const html = `<!doctype html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'DejaVu Sans', 'Noto Sans Hebrew', Arial, sans-serif;
    color: #1a1a1a;
    font-size: 12px;
    line-height: 1.6;
    direction: rtl;
  }
  h1 { font-size: 20px; color: #14532d; margin: 0 0 2px; }
  h2 {
    font-size: 14px;
    color: #14532d;
    border-bottom: 1px solid #d8d8d8;
    padding-bottom: 4px;
    margin: 20px 0 8px;
  }
  .opening { margin-bottom: 4px; }
  .opening .meta-line { display: flex; justify-content: space-between; color: #444; font-size: 11.5px; margin-bottom: 10px; }
  .opening .subject { text-decoration: underline; font-weight: 700; margin: 10px 0 8px; }
  .disclaimer {
    font-weight: 700;
    background: #fafafa;
    border: 1px solid #e2e2e2;
    border-radius: 4px;
    padding: 10px 12px;
    margin: 10px 0 4px;
    font-size: 11px;
  }
  .section-lead { margin: 0 0 8px; }
  .gap-note {
    margin: 4px 0 8px;
    font-size: 10.5px;
    color: #8a5a00;
    background: #fff8e6;
    border: 1px solid #f0deae;
    border-radius: 4px;
    padding: 6px 10px;
  }
  table.grid { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 6px; }
  table.grid th, table.grid td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; }
  table.grid th { background: #f0f7f2; color: #14532d; }
  table.grid.bases .basis-label { text-align: right; color: #333; width: 65%; }
  table.grid.bases .basis-value { text-align: left; font-weight: 700; }
  table.grid.bases tr:first-child .basis-value { font-size: 15px; color: #14532d; }
  table.fields { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  table.fields td { padding: 4px; vertical-align: top; width: 25%; }
  table.fields td.label { color: #666; font-size: 10.5px; }
  table.fields tr td.value { font-weight: 600; padding-bottom: 8px; }
  ol.conditions { margin: 0; padding-inline-start: 20px; font-size: 11px; }
  ol.conditions li { margin-bottom: 5px; }
  .declaration { margin-top: 16px; font-size: 11.5px; }
  .signature { margin-top: 24px; }
  .signature .line { margin-top: 34px; border-top: 1px solid #333; width: 220px; padding-top: 4px; }
  .appendix { margin-top: 26px; padding-top: 10px; border-top: 2px solid #14532d; }
  .appendix .footnote { font-size: 10px; color: #666; margin-top: 6px; }
  .photos-note { font-size: 10.5px; color: #666; }
</style>
</head>
<body>

  <div class="opening">
    <div class="meta-line">
      <span>${escapeHtml(officeName)}</span>
      <span>${escapeHtml(property.city)}, ${escapeHtml(formatDate(generatedAt))}</span>
    </div>
    <div class="meta-line">
      <span>מספרנו: ${escapeHtml(reportId)}</span>
      <span>מספר שומה: ${escapeHtml(valuation.id)}</span>
    </div>
    <h1>שומת מקרקעין</h1>
    <div class="subject">הנדון: שומת ${escapeHtml(propertyTypeLabel(property.propertyType))} ברחוב ${escapeHtml(property.address)}, ${escapeHtml(property.city)}</div>
    <p class="section-lead">לפי בקשתכם, להלן חוות דעתי בדבר שווי הנכס שבנדון.</p>
    <div class="disclaimer">
      חוות הדעת נכונה למועד עריכתה ומיועדת אך ורק למטרה לשמה הוזמנה. השימוש בשומה נאסר על כל צד שלישי שאינו המזמין,
      ועורך השומה לא יהיה אחראי להסתמכות כלשהי של צד שלישי כאמור.
    </div>
  </div>

  <h2>1. שמות המזמינים</h2>
  ${gapNote('פרטי מזמין/ה השומה (שם, ת״ז) אינם נאספים כיום במוצר — שדה זה יתווסף בגרסה הבאה.')}

  <h2>2. מטרת השומה</h2>
  <p class="section-lead">אמידת שווי שוק של הנכס שבנדון, לפי הגישה/ות שפורטו בסעיף 8 להלן.</p>
  ${gapNote('מטרת הזמנה עסקית ספציפית (מכירה / משכנתא / דיווח חשבונאי וכד׳) אינה נאספת כיום — מוצג נוסח כללי בלבד.')}

  <h2>3. זיהוי הנכס</h2>
  <table class="fields">
    <tr>
      <td class="label">כתובת</td>
      <td class="label">עיר</td>
      <td class="label">סוג נכס</td>
      <td class="label">אסמכתא / מספר תיק</td>
    </tr>
    <tr>
      <td class="value">${escapeHtml(property.address)}</td>
      <td class="value">${escapeHtml(property.city)}</td>
      <td class="value">${escapeHtml(propertyTypeLabel(property.propertyType))}</td>
      <td class="value">${property.externalRef ? escapeHtml(property.externalRef) : '—'}</td>
    </tr>
  </table>
  ${gapNote('גוש / חלקה / תת-חלקה אינם שדות מובנים במערכת כיום (אלא אם צוינו כאסמכתא חופשית לעיל) — פער סכימה שיש להשלים.')}

  <h2>4. הביקור בנכס</h2>
  <p class="section-lead">תאריך קובע לשומה (מועד עריכת השומה במערכת): ${escapeHtml(formatDate(valuation.valuationDate))}.</p>
  ${gapNote('שומה זו הופקה ללא ביקור פיזי מתועד במערכת (אין כיום תהליך ביקור נכס במוצר). יש להשלים ביקור בנכס בהתאם לכללי האתיקה והתקינה המקצועית בטרם מסירת חוות דעת סופית.')}

  <h2>5. זכויות משפטיות בנכס</h2>
  ${gapNote('נתוני בעלות/זכויות ואסמכתת רישום (נסח טאבו וכד׳) אינם נאספים כיום במוצר.')}

  <h2>6. תיאור כללי של הסביבה והבניין</h2>
  <table class="fields">
    <tr>
      <td class="label">יישוב</td>
      <td class="label">שנת בנייה (מוצהר)</td>
      <td class="label">גיל בניין משוער</td>
      <td class="label">&nbsp;</td>
    </tr>
    <tr>
      <td class="value">${escapeHtml(property.city)}</td>
      <td class="value">${property.yearBuilt ? escapeHtml(formatNumber(property.yearBuilt, { useGrouping: false })) : '—'}</td>
      <td class="value">${property.yearBuilt ? `${new Date(generatedAt).getFullYear() - Number(property.yearBuilt)} שנים` : '—'}</td>
      <td class="value">&nbsp;</td>
    </tr>
  </table>
  ${gapNote('סוג בנייה, גימור חיצוני, מעלית, מספר כניסות ומצב אחזקת הרכוש המשותף אינם נאספים כיום.')}

  <h2>7. תיאור הדירה / הנכס</h2>
  ${apartmentDescription(property)}
  <table class="fields">
    <tr>
      <td class="label">שטח (מ״ר)</td>
      <td class="label">מספר חדרים</td>
      <td class="label">קומה</td>
      <td class="label">&nbsp;</td>
    </tr>
    <tr>
      <td class="value">${escapeHtml(formatNumber(property.areaSqm))}</td>
      <td class="value">${escapeHtml(formatNumber(property.rooms))}</td>
      <td class="value">${property.floor === null || property.floor === undefined ? '—' : escapeHtml(formatNumber(property.floor))}</td>
      <td class="value">&nbsp;</td>
    </tr>
  </table>
  ${gapNote('כיווני אוויר, נוף, מרפסת בנפרד ורמת גימור (ריצוף/מטבח/חלונות) אינם נאספים כיום כשדות נפרדים.')}

  <h2>8. השומה</h2>
  <p class="section-lead">שיטת השומה שיושמה: ${escapeHtml(methodLabel(valuation.method))} · רמת ביטחון: ${escapeHtml(confidencePct)}%</p>
  ${valueBasesTable({ valuation, costBreakdown })}
  ${!costBreakdown ? gapNote('בסיסי שווי נוספים (עלות בנייה בערך כינון, אמדן שווי קרקע) מוצגים רק כאשר גישת העלות חושבה עבור שומה זו (שיטה "עלות" או "שילוב שיטות").') : ''}

  ${comparables ? `<h3>עסקאות השוואה ששימשו לחישוב</h3>${comparablesTable(comparables, currency)}` : ''}
  ${reconciliation ? `<h3>פירוט השילוב בין השיטות</h3>${reconciliationTable(reconciliation, currency)}` : ''}

  <h2>הערות והגבלות תוקף חוות הדעת</h2>
  <ol class="conditions">
    <li>חוות דעת זו נועדה לשימושו הבלעדי של מזמינה, ואינה תקפה לשימוש על ידי כל גורם אחר או לכל מטרה אחרת מזו שלשמה הוזמנה.</li>
    <li>חוות הדעת מהווה הבעת דעה שמאית בלבד ואינה מהווה בדיקה הנדסית או קונסטרוקטיבית של הנכס; הונח כי הבניה תואמת היתרים ודין.</li>
    <li>השווי הנקוב תקף למועד הקובע בלבד (סעיף 4 לעיל) ואינו מביא בחשבון שינויים שיחולו במועד מאוחר יותר בשוק הנדל״ן או בנכס.</li>
    <li>תוקף חוות הדעת מוגבל לשנה אחת ממועד עריכתה; לאחר תקופה זו יש לערוך שומה מעודכנת.</li>
  </ol>

  <p class="declaration">
    את חוות דעתי זו ערכתי עפ״י מיטב ידיעותיי וניסיוני המקצועי, ואין לי כל עניין או חלק בנכס הנדון.
  </p>

  <div class="signature">
    <p>ולראיה באתי על החתום,</p>
    <div class="line">
      ${escapeHtml(appraiserName)}<br>
      שמאי/ת מקרקעין
    </div>
  </div>

  <div class="appendix">
    <h2>נספח א׳ — חישוב שטחים</h2>
    <table class="fields">
      <tr><td class="label">שטח הנכס (ברוטו)</td><td class="label">&nbsp;</td></tr>
      <tr><td class="value">${escapeHtml(formatNumber(property.areaSqm))} מ״ר</td><td class="value">&nbsp;</td></tr>
    </table>
    <p class="footnote">
      שטח ברוטו כולל את שטח יחידת הדיור בתוספת חלק יחסי מקירות חוץ וקירות משותפים פנימיים, ומרפסות מקורות במלואן;
      אינו כולל חלק יחסי ברכוש המשותף מחוץ ליחידה.
      ${gapNote('פירוט נפרד של שטח מרפסת אינו נאסף כיום כשדה עצמאי — הנתון לעיל הוא השטח הרשום הכולל.')}
    </p>
  </div>

  <div class="photos-note">תצלומי הביקור בנכס: לא צורפו (מודול תיעוד תצלומים אינו נתמך כיום במוצר).</div>

</body>
</html>`;

  const headerTemplate = `
    <div style="width:100%;font-size:8px;color:#888;padding:4px 14mm 0;direction:rtl;font-family:'DejaVu Sans',Arial,sans-serif;display:flex;justify-content:space-between;">
      <span>${escapeHtml(officeName)}</span>
      <span>${escapeHtml(title)}</span>
    </div>`;
  const footerTemplate = `
    <div style="width:100%;font-size:8px;color:#888;padding:0 14mm 4px;direction:rtl;font-family:'DejaVu Sans',Arial,sans-serif;display:flex;justify-content:space-between;">
      <span>הופק על ידי PropIntel · ${escapeHtml(formatDateTime(generatedAt))}</span>
      <span>עמוד <span class="pageNumber"></span> מתוך <span class="totalPages"></span> עמודים</span>
    </div>`;

  return { html, headerTemplate, footerTemplate };
}

module.exports = {
  renderReportHtml,
  escapeHtml,
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  propertyTypeLabel,
  methodLabel,
};
