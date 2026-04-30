import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { z } from 'zod'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { TextField } from '@/components/TextField'
import { createNewCase, DiraCase } from '@/features/cases/model'
import { colors } from '@/theme/tokens'

const schema = z.object({
  title: z.string().min(2),
  address: z.string().min(5),
  landlordName: z.string().min(2),
})

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

  function submit() {
    const parsed = schema.safeParse({ title, address, landlordName })
    if (!parsed.success) {
      Alert.alert('חסר מידע', 'יש למלא כותרת, כתובת ושם איש קשר')
      return
    }

    onCreate(createNewCase({ ...parsed.data, category }))
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button"><Text style={styles.back}>חזרה</Text></Pressable>
        <Text style={styles.title}>פתיחת תיק ב-3 צעדים</Text>
        <Text style={styles.subtitle}>רק מה שחייבים כדי להתחיל. אפשר להוסיף ראיות אחר כך.</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.step}>1. מה הבעיה?</Text>
        <View style={styles.categoryGrid}>
          {categories.map((item) => (
            <Pressable key={item.id} onPress={() => setCategory(item.id)} style={[styles.category, category === item.id && styles.categoryActive]} accessibilityRole="button">
              <Text style={[styles.categoryLabel, category === item.id && styles.categoryLabelActive]}>{item.label}</Text>
              <Text style={styles.categoryHint}>{item.hint}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.step}>2. פרטי הדירה</Text>
        <TextField label="כותרת קצרה" value={title} onChangeText={setTitle} placeholder="למשל: החזרת פיקדון" />
        <TextField label="כתובת" value={address} onChangeText={setAddress} placeholder="רחוב, מספר, עיר" />
        <TextField label="שם בעל הדירה / מנהל" value={landlordName} onChangeText={setLandlordName} placeholder="שם מלא" />
      </Card>

      <Button label="3. יצירת תיק הגנה" onPress={submit} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 36 },
  header: { gap: 8 },
  back: { color: colors.blue, fontSize: 15, fontWeight: '900', textAlign: 'right' },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 24, textAlign: 'right', writingDirection: 'rtl' },
  card: { gap: 14 },
  step: { color: colors.ink, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  categoryGrid: { gap: 10 },
  category: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 14, backgroundColor: '#FFFFFF' },
  categoryActive: { borderColor: colors.blue, backgroundColor: colors.softBlue },
  categoryLabel: { color: colors.ink, fontSize: 16, fontWeight: '900', textAlign: 'right' },
  categoryLabelActive: { color: colors.blue },
  categoryHint: { color: colors.muted, marginTop: 5, textAlign: 'right', writingDirection: 'rtl' },
})