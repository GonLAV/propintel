---
description: "בנייה מחדש של הפלאגין (ייצור קובץ .plugin נייד)"
allowed-tools: Read, Write, Bash, Glob
---

# Rebuild Plugin

מטרה: לארוז את תיקיית הסוכן הנוכחית לקובץ `.plugin` יחיד שאפשר להתקין, לגבות או לשלוח.

## שלב 1 — אימות

1. ודא שאתה בתוך תיקיית סוכן: חייב `.claude-plugin/plugin.json`.
2. שלוף את שם הסוכן מהשדה `name`.
3. בדוק קיום: `.claude-plugin/plugin.json`, `system-prompt.md`, `skills/`, `commands/`.

## שלב 2 — בנייה

```bash
cd <agent-folder>
zip -r "/tmp/nachshon-gen.plugin" . -x "*.DS_Store"
```

## שלב 3 — יעד

העתק ל-`plugin-builds/` בשורש הריפו (צור אם חסרה), דווח גודל וקבצים.
