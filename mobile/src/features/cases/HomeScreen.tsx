import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { DiraCase } from '@/features/cases/model'
import { colors } from '@/theme/tokens'

export function HomeScreen({ cases, onCreate, onOpenCase }: { cases: DiraCase[]; onCreate: () => void; onOpenCase: (id: string) => void }) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.kicker}>DiraShield</Text>
        <Text style={styles.title}>מה צריך לסגור היום?</Text>
        <Text style={styles.subtitle}>תיק אחד, פעולה אחת, בלי לרדוף אחרי הודעות וראיות.</Text>
      </View>

      <Card style={styles.actionCard}>
        <View style={styles.actionIcon}><Ionicons name="shield-checkmark" size={24} color={colors.blue} /></View>
        <Text style={styles.actionTitle}>פתח תיק הגנה חדש</Text>
        <Text style={styles.actionText}>בחר בעיה, הוסף כתובת ובעל דירה, וקבל רשימת ראיות ומכתב מוכן.</Text>
        <Button label="פתיחת תיק" onPress={onCreate} />
      </Card>

      <Text style={styles.sectionTitle}>תיקים פעילים</Text>
      <FlatList
        data={cases}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpenCase(item.id)} accessibilityRole="button">
            <Card style={styles.caseCard}>
              <View style={styles.caseTop}>
                <StatusPill status={item.status} />
                <Text style={styles.deadline}>{item.deadline}</Text>
              </View>
              <Text style={styles.caseTitle}>{item.title}</Text>
              <Text style={styles.caseAddress}>{item.address}</Text>
              <Text style={styles.nextAction}>{item.nextAction}</Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  )
}

function StatusPill({ status }: { status: DiraCase['status'] }) {
  const label = status === 'urgent' ? 'דחוף' : status === 'sent' ? 'נשלח' : status === 'resolved' ? 'נסגר' : 'טיוטה'
  const color = status === 'urgent' ? colors.red : status === 'resolved' ? colors.green : colors.blue
  return <Text style={[styles.status, { color, backgroundColor: status === 'urgent' ? colors.softRed : colors.softBlue }]}>{label}</Text>
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, gap: 18 },
  header: { paddingTop: 18, gap: 8 },
  kicker: { color: colors.blue, fontSize: 14, fontWeight: '900', textAlign: 'right' },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 24, textAlign: 'right', writingDirection: 'rtl' },
  actionCard: { gap: 12 },
  actionIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.softBlue, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  actionTitle: { color: colors.ink, fontSize: 22, fontWeight: '900', textAlign: 'right' },
  actionText: { color: colors.muted, fontSize: 15, lineHeight: 23, textAlign: 'right', writingDirection: 'rtl' },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  list: { gap: 12, paddingBottom: 32 },
  caseCard: { gap: 10 },
  caseTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  status: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '900' },
  deadline: { color: colors.amber, fontSize: 13, fontWeight: '800' },
  caseTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  caseAddress: { color: colors.muted, fontSize: 14, textAlign: 'right' },
  nextAction: { color: colors.blue, fontSize: 14, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
})