import { useMemo, useState } from 'react'
import { AccessibilityInfo, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { TextField } from '@/components/TextField'
import { AuthSession, normalizeIsraeliPhone, requestOtp, verifyOtp } from '@/lib/api'
import { colors } from '@/theme/tokens'

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [challengeId, setChallengeId] = useState<string>()
  const [phase, setPhase] = useState<'phone' | 'otp'>('phone')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const phoneE164 = useMemo(() => normalizeIsraeliPhone(phone), [phone])
  const validOtp = /^\d{4,8}$/.test(otp.trim())

  async function startOtp() {
    if (!phoneE164 || busy) return
    setBusy(true)
    setError(undefined)
    try {
      const result = await requestOtp(phoneE164)
      if (result.error) {
        showError(result.error.message)
        return
      }
      setChallengeId(result.data?.challengeId)
      setPhase('otp')
      AccessibilityInfo.announceForAccessibility('קוד אימות נשלח לטלפון')
    } catch {
      showError('לא ניתן להתחבר לשירות האימות')
    } finally {
      setBusy(false)
    }
  }

  async function completeOtp() {
    if (!phoneE164 || !validOtp || busy) return
    setBusy(true)
    setError(undefined)
    try {
      const result = await verifyOtp({ phoneE164, code: otp.trim(), challengeId })
      if (!result.data || result.error) {
        showError(result.error?.message || 'קוד האימות נדחה')
        return
      }
      onAuthenticated(result.data)
    } catch {
      showError('לא ניתן לאמת את הקוד. נסו שוב')
    } finally {
      setBusy(false)
    }
  }

  function showError(message: string) {
    setError(message)
    AccessibilityInfo.announceForAccessibility(message)
  }

  function changePhone() {
    setPhase('phone')
    setOtp('')
    setChallengeId(undefined)
    setError(undefined)
  }

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
          editable={phase === 'phone' && !busy}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="05XXXXXXXX"
          error={phone.length > 0 && !phoneE164 ? 'יש להזין מספר נייד ישראלי תקין' : undefined}
        />
        {phase === 'otp' ? (
          <>
            <TextField
              label="קוד אימות"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              placeholder="הקוד שנשלח אליך"
              maxLength={8}
              editable={!busy}
              error={otp.length > 0 && !validOtp ? 'יש להזין קוד בן 4 עד 8 ספרות' : undefined}
            />
            <Button label={busy ? 'מאמת…' : 'אימות וכניסה'} onPress={completeOtp} disabled={!validOtp || busy} />
            <Button label="שינוי מספר הטלפון" onPress={changePhone} variant="secondary" disabled={busy} />
          </>
        ) : (
          <Button label={busy ? 'שולח קוד…' : 'שליחת קוד אימות'} onPress={startOtp} disabled={!phoneE164 || busy} />
        )}
        {error ? (
          <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Text style={styles.note}>הכניסה מתבצעת רק לאחר אימות קוד חד-פעמי מול השרת.</Text>
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
  error: {
    color: colors.red,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'right',
  },
  note: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },
})
