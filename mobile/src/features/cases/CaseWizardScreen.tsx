import { useState } from 'react'
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { TextField } from '@/components/TextField'
import { caseInputSchema, createNewCase, DiraCase } from '@/features/cases/model'
import { colors } from '@/theme/tokens'

const categories: Array<{ id: DiraCase['category']; label: string; hint: string }> = [
  { id: 'deposit', label: 'פיקדון', hint: 'לא מחזירים כסף או דורשים קיזוז' },
  { id: 'repair', label: 'תיקון', hint: 'נזק בדירה שלא מטופל בזמן' },
  { id: 'handover', label: 'מסירה', hint: 'כניסה או יציאה מדירה' },
  { id: 'contract', label: 'חוזה', hint: 'סעיף לא ברור או דרישה חריגה' },
]

export function CaseWizardScreen({ onBack, onCreate }: { onBack: () => void; onCreate: (item: DiraCase) => void }) {
  const [category, setCategory] = useState<DiraCase['category']>('deposit')
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [landlordName, setLandlordName] = useState('')
  const [errors, setErrors] = useState<Partial<Record<'title' | 'address' | 'landlordName', string>>>({})

  function submit() {
    const parsed = caseInputSchema.safeParse({ title, address, landlordName })
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      setErrors({
        title: fieldErrors.title?.[0] ? 'יש להזין כותרת בת 2 תווים לפחות' : undefined,
        address: fieldErrors.address?.[0] ? 'יש להזין כתובת בת 5 תווים לפחות' : undefined,
        landlordName: fieldErrors.landlordName?.[0] ? 'יש להזין שם איש קשר' : undefined,
      })
      AccessibilityInfo.announceForAccessibility('יש שגיאות בטופס. יש לבדוק את השדות המסומנים')
      return
    }

    setErrors({})
    onCreate(createNewCase({ ...parsed.data, category }))
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="חזרה למסך הבית"
          style={styles.backTarget}
        >
          <Text style={styles.back}>חזרה</Text>
        </Pressable>
        <Text style={styles.title}>פתיחת תיק ב-3 צעדים</Text>
        <Text style={styles.subtitle}>רק מה שחייבים כדי להתחיל. אפשר להוסיף ראיות אחר כך.</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.step}>1. מה הבעיה?</Text>
        <View style={styles.categoryGrid} accessibilityRole="radiogroup" accessibilityLabel="בחירת סוג התיק">
          {categories.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setCategory(item.id)}
              style={[styles.category, category === item.id && styles.categoryActive]}
              accessibilityRole="radio"
              accessibilityLabel={item.label}
              accessibilityHint={item.hint}
              accessibilityState={{ checked: category === item.id, selected: category === item.id }}
            >
              <Text style={[styles.categoryLabel, category === item.id && styles.categoryLabelActive]}>{item.label}</Text>
              <Text style={styles.categoryHint}>{item.hint}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.step}>2. פרטי הדירה</Text>
        <TextField label="כותרת קצרה" value={title} onChangeText={setTitle} placeholder="למשל: החזרת פיקדון" error={errors.title} />
        <TextField label="כתובת" value={address} onChangeText={setAddress} placeholder="רחוב, מספר, עיר" error={errors.address} />
        <TextField label="שם בעל הדירה / מנהל" value={landlordName} onChangeText={setLandlordName} placeholder="שם מלא" error={errors.landlordName} />
      </Card>

      <Button label="3. יצירת תיק הגנה" onPress={submit} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 36 },
  header: { gap: 8 },
  backTarget: { minWidth: 44, minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center', paddingHorizontal: 8 },
  back: { color: colors.blue, fontSize: 15, fontWeight: '900', textAlign: 'right' },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 24, textAlign: 'right', writingDirection: 'rtl' },
  card: { gap: 14 },
  step: { color: colors.ink, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  categoryGrid: { gap: 10 },
  category: { minHeight: 60, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 14, backgroundColor: colors.card },
  categoryActive: { borderColor: colors.blue, backgroundColor: colors.softBlue },
  categoryLabel: { color: colors.ink, fontSize: 16, fontWeight: '900', textAlign: 'right' },
  categoryLabelActive: { color: colors.blue },
  categoryHint: { color: colors.muted, marginTop: 5, textAlign: 'right', writingDirection: 'rtl' },
})