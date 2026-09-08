# objection-breaker — מקור האמת

**התיקייה הזו היא המקור.** העותק החי שקלוד טוען בפועל נמצא ב-`~/.claude/skills/objection-breaker/`.

## למה שני עותקים

קלוד טוען סקילים מ-`~/.claude/skills/` — לא מתיקיית `skills/` של הריפו.
`skills/` בריפו היא תיקיית האחסון לפי מוסכמת הקורס, והיא זו שנכנסת ל-git ותיארז לתוך התוסף של שרי במפגש 8.

## אחרי כל עריכה — לסנכרן

מריצים מתיקיית הריפו:

```bash
cp -r skills/objection-breaker ~/.claude/skills/
```

**תמיד לערוך כאן, ואז לסנכרן.** עריכה בעותק החי תיעלם בסינכרון הבא.

## מה בפנים

| קובץ | תפקיד |
|---|---|
| `SKILL.md` | הזרימה: הקשר ← מסלול ← אבחון ← פלט, ומעקות |
| `references/diagnosis.md` | 6 סוגי התנגדות + מקרי גבול |
| `references/lead-qualification.md` | מסלול C — סינון ליד נכנס |
| `references/channels.md` | אורך וטון לפי ערוץ |
| `references/business-context.md` | נתוני המיגוניות. נגזר מ-`master-library/business-operations.md` |
| `references/objections-bank.md` | ⭐ הנכס — התנגדויות אמיתיות ומה שעבד |

## תלויות

`business-context.md` נגזר מ-`master-library/business-operations.md`. **כשמסמך המאסטר מתעדכן — לעדכן גם כאן.**
