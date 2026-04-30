import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { TextField } from '@/components/TextField'
import { colors } from '@/theme/tokens'

export function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [phone, setPhone] = useState('')
  const valid = /^05\d{8}$/.test(phone.replace(/[-\s]/g, ''))

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.brand}>DiraShield</Text>
        <Text style={styles.title}>הגנה לשוכרים ומשכירים בישראל, תוך 3 דקות</Text>
        <Text style={styles.subtitle}>תיעוד מסירה, תיקונים ופיקדונות עם ראיות חתומות, תזכורות ומכתב מוכן לשליחה.</Text>
      </View>
      <Card style={styles.card}>
        <TextField
          label="מספר נייד ישראלי"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="05XXXXXXXX"
          error={phone.length > 0 && !valid ? 'יש להזין מספר נייד ישראלי תקין' : undefined}
        />
        <Button label="כניסה מהירה" onPress={onAuthenticated} disabled={!valid} />
        <Text style={styles.note}>בהמשך: אימות OTP, Apple, Google ותעודת זהות מאומתת.</Text>
      </Card>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: 20,
  },
  hero: {
    paddingTop: 64,
    gap: 14,
  },
  brand: {
    color: colors.blue,
    fontWeight: '900',
    fontSize: 18,
    textAlign: 'right',
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  card: {
    gap: 16,
    marginBottom: 18,
  },
  note: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },
})