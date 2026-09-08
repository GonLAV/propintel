# אהליאב (oholiav-gen)

סוכן-שותף לפיתוח ותפעול **PropIntel**. נטען עם `/oholiav`.

## מה הוא עושה

קורא את מפת הדרכים והחוב הטכני המשותפים (`agent-hq/`), מפרק לעבודה בת-ביצוע, ומקדם בפועל בתוך הריפו — קוד, בדיקות, CI — תחת אישור מפורש לכל פעולה יקרה.

## למה השם

אהליאב בן אחיסמך — האומן שנבנה המשכן לצדו של בצלאל (שמות ל"א). בצלאל תכנן ועיצב; אהליאב ביצע. באותו האופן, `betzalel-gen` הוא שותף העיצוב במשפחת הסוכנים, ו-`oholiav-gen` הוא שותף הביצוע: קוד, תשתית, יציבות.

## מבנה

```
oholiav-gen/
├── .claude-plugin/plugin.json
├── system-prompt.md          # הזהות המלאה
├── commands/
│   ├── oholiav.md             # /oholiav — טעינה וניתוב
│   └── rebuild-plugin.md      # אריזה לקובץ .plugin נייד
└── skills/oholiav-gen/SKILL.md  # ניתוב מצבים
```

## תלות

קורא ומעדכן את `agent-hq/roadmap.md`, `agent-hq/product-status.md`, `agent-hq/kpi-dashboard.md` בשורש הריפו — התשתית המשותפת לכל סוכני PropIntel.
