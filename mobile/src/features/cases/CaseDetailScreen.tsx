import { useEffect, useState } from 'react'
import { AccessibilityInfo, ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { capturePhotoEvidence, pickPhotoEvidence } from '@/features/cases/evidenceCapture'
import { EvidenceTrustLedger, generateEvidenceTrustLedger } from '@/features/cases/evidenceTrustLedger'
import { DeliveryEvent, DiraCase, EvidenceItem } from '@/features/cases/model'
import { generateResolutionAutopilot } from '@/features/cases/resolutionAutopilot'
import { colors } from '@/theme/tokens'

export function CaseDetailScreen({
  item,
  onBack,
  onAddEvidence,
  onShareOutcome,
}: {
  item: DiraCase
  onBack: () => void
  onAddEvidence: (evidence: EvidenceItem) => void
  onShareOutcome: (event: Omit<DeliveryEvent, 'id'>) => void
}) {
  const letter = buildLetter(item)
  const autopilot = generateResolutionAutopilot(item)
  const [ledger, setLedger] = useState<EvidenceTrustLedger>()
  const [ledgerError, setLedgerError] = useState<string>()

  useEffect(() => {
    let active = true
    setLedger(undefined)
    setLedgerError(undefined)
    generateEvidenceTrustLedger(item)
      .then((nextLedger) => {
        if (active) setLedger(nextLedger)
      })
      .catch(() => {
        if (active) setLedgerError('לא ניתן לחשב את שרשרת הראיות')
      })
    return () => {
      active = false
    }
  }, [item])

  async function shareLetter() {
    await shareContent('letter', letter)
  }

  async function shareAutopilot() {
    await shareContent('autopilot', autopilot.shareText)
  }

  async function shareLedger() {
    if (ledger) await shareContent('ledger', ledger.shareText)
  }

  async function shareContent(kind: DeliveryEvent['kind'], message: string) {
    try {
      const result = await Share.share({ message })
      const outcome: DeliveryEvent['outcome'] = result.action === Share.dismissedAction ? 'dismissed' : 'shared'
      onShareOutcome({ kind, outcome, occurredAt: new Date().toISOString() })
      AccessibilityInfo.announceForAccessibility(
        outcome === 'shared' ? 'השיתוף הושלם ונרשם בתיק' : 'השיתוף בוטל ונרשם בתיק',
      )
    } catch {
      Alert.alert('השיתוף נכשל', 'לא ניתן לפתוח את גיליון השיתוף. נסו שוב')
    }
  }

  async function addCameraEvidence() {
    try {
      const result = await capturePhotoEvidence(defaultEvidenceLabel(item))
      handleCaptureResult(result)
    } catch {
      Alert.alert('לא ניתן לצרף ראיה', 'קריאת קובץ הראיה או חישוב חתימת SHA-256 נכשלו')
    }
  }

  async function addGalleryEvidence() {
    try {
      const result = await pickPhotoEvidence(defaultEvidenceLabel(item))
      handleCaptureResult(result)
    } catch {
      Alert.alert('לא ניתן לצרף ראיה', 'קריאת קובץ הראיה או חישוב חתימת SHA-256 נכשלו')
    }
  }

  function handleCaptureResult(result: { evidence?: EvidenceItem; error?: string }) {
    if (result.error) {
      Alert.alert('לא ניתן לצרף ראיה', result.error)
      return
    }
    if (result.evidence) onAddEvidence(result.evidence)
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="חזרה לרשימת התיקים"
          style={styles.backTarget}
        >
          <Text style={styles.back}>חזרה</Text>
        </Pressable>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.address}</Text>
      </View>

      <Card style={styles.summary}>
        <View style={styles.summaryTop}>
          <Ionicons name="time" size={22} color={colors.amber} />
          <Text style={styles.deadline}>{item.deadline}</Text>
        </View>
        <Text style={styles.nextAction}>{item.nextAction}</Text>
        <Button label="שליחת מכתב לבעל הדירה" onPress={shareLetter} />
      </Card>

      <Card style={[styles.card, styles.autopilotCard]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Resolution Autopilot</Text>
          <Text style={[styles.scorePill, autopilot.tier === 'strong' ? styles.scoreStrong : autopilot.tier === 'workable' ? styles.scoreWorkable : styles.scoreWeak]}>{autopilot.readinessScore}/100</Text>
        </View>
        <Text style={styles.autopilotHeadline}>{autopilot.headline}</Text>
        <Text style={styles.autopilotText}>{autopilot.recommendedMove}</Text>
        <Text style={styles.autopilotFrame}>{autopilot.settlementFrame}</Text>
        <View style={styles.autopilotList}>
          {autopilot.nextActions.map((action) => (
            <View key={action} style={styles.autopilotRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.green} />
              <Text style={styles.autopilotAction}>{action}</Text>
            </View>
          ))}
        </View>
        {autopilot.proofGaps.length ? (
          <Text style={styles.gapsText}>חוסרים: {autopilot.proofGaps.join(' · ')}</Text>
        ) : null}
        <Button label="שיתוף המלצת פעולה" onPress={shareAutopilot} variant="secondary" />
      </Card>

      <Card style={[styles.card, styles.ledgerCard]}>
        {ledger ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Evidence Trust Ledger</Text>
              <Text style={[styles.scorePill, ledger.tier === 'verified' ? styles.scoreStrong : ledger.tier === 'review' ? styles.scoreWorkable : styles.scoreWeak]}>{ledger.trustScore}/100</Text>
            </View>
            <Text style={styles.ledgerHeadline}>{ledger.headline}</Text>
            <Text style={styles.ledgerChain}>Chain ID: {ledger.chainId}</Text>
            <View style={styles.ledgerTimeline}>
              {ledger.entries.map((entry, index) => (
                <View key={entry.id} style={styles.ledgerRow}>
                  <View style={styles.ledgerMarker}>
                    <Text style={styles.ledgerIndex}>{index + 1}</Text>
                  </View>
                  <View style={styles.ledgerText}>
                    <Text style={styles.ledgerLabel}>{entry.label}</Text>
                    <Text style={styles.ledgerProof}>{entry.digest} · {entry.chainProof}</Text>
                    <Text style={styles.ledgerSignals}>{entry.trustSignals.join(' · ')}</Text>
                  </View>
                </View>
              ))}
            </View>
            {ledger.warnings.length ? (
              <Text style={styles.gapsText}>בדיקה: {ledger.warnings.join(' · ')}</Text>
            ) : null}
            <Button label="שיתוף Ledger ראיות" onPress={shareLedger} variant="secondary" />
          </>
        ) : ledgerError ? (
          <Text accessibilityRole="alert" style={styles.gapsText}>{ledgerError}</Text>
        ) : (
          <View style={styles.ledgerLoading}>
            <ActivityIndicator color={colors.blue} />
            <Text accessibilityLiveRegion="polite" style={styles.ledgerLoadingText}>מחשב שרשרת SHA-256…</Text>
          </View>
        )}
      </Card>

      {item.deliveryEvents.length ? (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>אירועי מסירה</Text>
          {item.deliveryEvents.slice(0, 5).map((event) => (
            <View key={event.id} style={styles.deliveryRow}>
              <Text style={styles.deliveryLabel}>{deliveryLabel(event)}</Text>
              <Text style={styles.deliveryTime}>{new Date(event.occurredAt).toLocaleString('he-IL')}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ראיות חתומות</Text>
          <Text style={styles.evidenceCount}>{item.evidence.length}</Text>
        </View>
        <View style={styles.actionsRow}>
          <Button label="צילום חדש" onPress={addCameraEvidence} style={styles.actionButton} />
          <Button label="מהגלריה" onPress={addGalleryEvidence} variant="secondary" style={styles.actionButton} />
        </View>
        {item.evidence.map((evidence) => (
          <View key={evidence.id} style={styles.evidenceRow}>
            <Ionicons name={evidence.type === 'photo' ? 'camera' : evidence.type === 'document' ? 'document-text' : 'chatbubble'} size={20} color={colors.blue} />
            <View style={styles.evidenceText}>
              <Text style={styles.evidenceLabel}>{evidence.label}</Text>
              <Text style={styles.evidenceMeta}>חתימה: {evidence.hash.slice(0, 18)} · {evidence.hashAlgorithm}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>טיוטת מכתב</Text>
        <Text style={styles.letter}>{letter}</Text>
      </Card>
    </ScrollView>
  )
}

function defaultEvidenceLabel(item: DiraCase) {
  const categoryLabel = item.category === 'deposit' ? 'פיקדון' : item.category === 'repair' ? 'תיקון' : item.category === 'handover' ? 'מסירה' : 'חוזה'
  return `צילום ראיה - ${categoryLabel}`
}

function buildLetter(item: DiraCase) {
  return [
    `שלום ${item.landlordName},`,
    '',
    `בנוגע לדירה בכתובת ${item.address}:`,
    `פתחתי תיעוד מסודר בנושא "${item.title}".`,
    `מצורפות ${item.evidence.length} ראיות חתומות בזמן כדי לפתור את הנושא בצורה מהירה והוגנת.`,
    '',
    `הפעולה המבוקשת: ${item.nextAction}.`,
    '',
    'אשמח לאישור וקידום טיפול בהקדם.',
  ].join('\n')
}

function deliveryLabel(event: DeliveryEvent) {
  const kind = event.kind === 'letter' ? 'מכתב' : event.kind === 'autopilot' ? 'המלצת פעולה' : 'Ledger ראיות'
  return event.outcome === 'shared' ? `${kind} שותף בהצלחה` : `שיתוף ${kind} בוטל`
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  header: { gap: 8 },
  backTarget: { minWidth: 44, minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center', paddingHorizontal: 8 },
  back: { color: colors.blue, fontSize: 15, fontWeight: '900', textAlign: 'right' },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { color: colors.muted, fontSize: 15, textAlign: 'right', writingDirection: 'rtl' },
  summary: { gap: 14, backgroundColor: colors.softAmber },
  summaryTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  deadline: { color: colors.amber, fontSize: 16, fontWeight: '900' },
  nextAction: { color: colors.ink, fontSize: 18, lineHeight: 28, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  card: { gap: 12 },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  evidenceCount: { color: colors.blue, backgroundColor: colors.softBlue, overflow: 'hidden', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontWeight: '900' },
  actionsRow: { flexDirection: 'row-reverse', gap: 10 },
  actionButton: { flex: 1 },
  evidenceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  evidenceText: { flex: 1 },
  evidenceLabel: { color: colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'right' },
  evidenceMeta: { color: colors.muted, fontSize: 12, marginTop: 4, textAlign: 'right' },
  autopilotCard: { borderColor: colors.successBorder, backgroundColor: colors.successSurface },
  ledgerCard: { borderColor: colors.line, backgroundColor: colors.card },
  scorePill: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontWeight: '900' },
  scoreStrong: { color: colors.green, backgroundColor: colors.softGreen },
  scoreWorkable: { color: colors.amber, backgroundColor: colors.softAmber },
  scoreWeak: { color: colors.red, backgroundColor: colors.softRed },
  autopilotHeadline: { color: colors.ink, fontSize: 19, lineHeight: 27, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  autopilotText: { color: colors.blue, fontSize: 15, lineHeight: 24, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  autopilotFrame: { color: colors.muted, fontSize: 14, lineHeight: 23, textAlign: 'right', writingDirection: 'rtl' },
  autopilotList: { gap: 9 },
  autopilotRow: { flexDirection: 'row-reverse', gap: 8, alignItems: 'flex-start' },
  autopilotAction: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 22, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  gapsText: { color: colors.red, fontSize: 12, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl' },
  ledgerHeadline: { color: colors.ink, fontSize: 17, lineHeight: 25, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  ledgerChain: { color: colors.blue, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  ledgerTimeline: { gap: 10 },
  ledgerLoading: { minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 10 },
  ledgerLoadingText: { color: colors.muted, fontSize: 14 },
  ledgerRow: { flexDirection: 'row-reverse', gap: 10, alignItems: 'flex-start' },
  ledgerMarker: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.softBlue, alignItems: 'center', justifyContent: 'center' },
  ledgerIndex: { color: colors.blue, fontSize: 12, fontWeight: '900' },
  ledgerText: { flex: 1, gap: 3 },
  ledgerLabel: { color: colors.ink, fontSize: 14, lineHeight: 21, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  ledgerProof: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'right' },
  ledgerSignals: { color: colors.green, fontSize: 11, lineHeight: 17, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  deliveryRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, gap: 3 },
  deliveryLabel: { color: colors.ink, fontSize: 14, fontWeight: '800', textAlign: 'right' },
  deliveryTime: { color: colors.muted, fontSize: 12, textAlign: 'right' },
  letter: { color: colors.ink, fontSize: 15, lineHeight: 25, textAlign: 'right', writingDirection: 'rtl' },
})