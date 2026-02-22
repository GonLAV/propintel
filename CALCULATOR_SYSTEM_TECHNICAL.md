# מערכת מחשבונים מקצועית - מפרט טכני

## 🏗️ ארכיטקטורה

```
src/lib/calculators/
├── adjustmentCalculator.ts          # התאמות להשוואת עסקאות
├── weightedAverageCalculator.ts     # ממוצע משוקלל
├── costApproachCalculator.ts        # שיטת עלות
├── incomeCapitalizationCalculator.ts # שיטת היוון
├── multiUnitCalculator.ts           # ריבוי יחידות
├── calculatorValidation.ts          # בדיקות ואימות
└── index.ts                         # ייצוא מרוכז
```

## 🎯 עקרונות תכנון

### 1. Pure Functions
כל מחשבון הוא פונקציה טהורה - אותו קלט תמיד מחזיר אותו פלט.

### 2. Immutability
אין שינוי של state - כל פעולה מחזירה אובייקט חדש.

### 3. Type Safety
TypeScript מלא עם types מדויקים לכל קלט ופלט.

### 4. Documentation as Code
כל נוסחה מתועדת בקוד עצמו עם מקור משפטי.

## 🔧 טכנולוגיות

- **TypeScript** - type safety מלא
- **No Dependencies** - מחשבונים טהורים ללא תלויות חיצוניות
- **Testing Ready** - בנוי לבדיקות אוטומטיות

## 📊 Data Flow

```
User Input 
  → Validation 
    → Calculator Logic 
      → Results + Formula + Narrative 
        → Audit Log 
          → UI/PDF/Export
```

## 🧪 Testing Strategy

### Regression Tests
כל מחשבון נבדק מול ערכים ידועים:

```typescript
{
  testId: 'ADJ-002',
  inputData: { basePrice: 2000000, adjustment: 5% },
  expectedOutput: 2100000,
  tolerance: 1
}
```

### Validation Gates
בדיקות רצות **אוטומטית** בכל שינוי קוד.
אם בדיקה נכשלת → המערכת חוסמת.

## 📝 Output Structure

כל מחשבון מחזיר:

```typescript
{
  // תוצאות מספריות
  finalValue: number,
  
  // פירוט צעד-אחר-צעד
  breakdown: CalculationStep[],
  
  // נוסחה מפורשת
  formula: string,
  
  // נרטיב לדוח
  narrativeHebrew: string,
  
  // מטא-דאטה
  source: string,
  confidence: 'high' | 'medium' | 'low'
}
```

## 🔒 Security & Compliance

### Audit Trail
כל חישוב נרשם:
- מתי
- מי
- מה הקלט
- מה הפלט
- האם היה override

### Source Attribution
כל נוסחה מקושרת למקור משפטי:
- תקן שמאי
- פסיקה
- ספרות מקצועית

## 🚀 Performance

- **Lightning Fast** - אין I/O, רק מתמטיקה
- **Memory Efficient** - אין caching מיותר
- **Scalable** - ניתן להריץ אלפי חישובים במקביל

## 🔌 Integration Points

### With Valuation Engine
```typescript
import { AdjustmentCalculator } from '@/lib/calculators'

const adjusted = AdjustmentCalculator.calculateAdjustments(...)
property.valuationDetails = adjusted
```

### With PDF Generator
```typescript
const narrative = result.narrativeHebrew
pdf.addSection('חישוב שווי', narrative)
```

### With Excel Export
```typescript
const breakdown = result.breakdown
exportToExcel(breakdown)
```

## 📈 Future Enhancements

### Phase 2
- [ ] מחשבון מס שבח
- [ ] מחשבון היטל השבחה
- [ ] מחשבון זכויות בנייה
- [ ] מחשבון שטחים (תקן 9)

### Phase 3
- [ ] Machine Learning לחיזוי Cap Rate
- [ ] Real-time market data integration
- [ ] Automated comparable selection

## 🐛 Error Handling

```typescript
try {
  const result = Calculator.calculate(params)
} catch (error) {
  if (error instanceof ValidationError) {
    // הצג שגיאה למשתמש
  } else {
    // לוג לצוות הפיתוח
    logger.error(error)
  }
}
```

## 📚 Resources

- **תקן שמאי 19-22** - התקנים הרשמיים
- **The Appraisal of Real Estate** - ספר יסוד בינלאומי
- **מחירון דקל** - עלויות בנייה
- **לשכת הסטטיסטיקה** - מדדים

## 🤝 Contributing

### Adding a New Calculator

1. צור קובץ חדש ב-`src/lib/calculators/`
2. יצוא interface לקלט ופלט
3. יצור class סטטי עם מתודת `calculate()`
4. הוסף בדיקות רגרסיה ל-`calculatorValidation.ts`
5. תעד מקור משפטי ב-`CalculatorSourceRegistry`
6. עדכן `index.ts`

### Code Standards

- Pure functions only
- Full TypeScript types
- JSDoc comments for public methods
- No external dependencies
- Hebrew strings for UI/reports
- English for code/comments

## 🔐 Security Considerations

- **No PII in logs** - אין מידע מזהה בלוגים
- **Validation** - כל קלט עובר validation
- **No eval()** - אין ביצוע קוד דינמי
- **Immutable** - אין שינוי של inputs

## 📊 Monitoring

```typescript
// Track usage
CalculatorValidationEngine.logCalculation({
  calculatorName: 'AdjustmentCalculator',
  timestamp: new Date(),
  inputs: {...},
  outputs: {...}
})

// Retrieve metrics
const logs = CalculatorValidationEngine.getAuditLogs()
const usage = analyzeUsage(logs)
```

## 🎓 Best Practices

### For Developers

1. **Always run tests** before committing
2. **Document sources** for any formula change
3. **Add regression tests** for new calculators
4. **Keep it pure** - no side effects
5. **TypeScript strict mode** - no `any`

### For Users (Appraisers)

1. **Review formulas** before using
2. **Document overrides** with reasoning
3. **Run validation** periodically
4. **Export audit logs** for compliance

## 📞 Support

- **Technical Issues:** GitHub Issues
- **Formula Questions:** עיין במסמכי התקנים
- **Feature Requests:** Discussions

---

**Last Updated:** January 2024  
**Version:** 1.0.0  
**Maintainers:** AppraisalPro Team
