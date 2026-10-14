import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, I18nManager, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { Button } from '@/components/Button'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { CaseDetailScreen } from '@/features/cases/CaseDetailScreen'
import { CaseWizardScreen } from '@/features/cases/CaseWizardScreen'
import { HomeScreen } from '@/features/cases/HomeScreen'
import {
  AppScreen,
  DeliveryEvent,
  DiraCase,
  EvidenceItem,
  attachEvidence,
  createStarterCases,
  recordDeliveryEvent,
} from '@/features/cases/model'
import { AuthSession, clearAuthSession, getStoredAuthSession } from '@/lib/api'
import { loadCases, saveCases } from '@/lib/storage'
import { colors } from '@/theme/tokens'

I18nManager.allowRTL(true)
I18nManager.forceRTL(true)

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [screen, setScreen] = useState<AppScreen>('home')
  const [cases, setCases] = useState<DiraCase[]>([])
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null)
  const [hydration, setHydration] = useState<'loading' | 'ready' | 'error'>('loading')
  const [storageError, setStorageError] = useState<string>()
  const activeCase = useMemo(
    () => cases.find((item) => item.id === activeCaseId) || null,
    [activeCaseId, cases],
  )

  useEffect(() => {
    void hydrate()
  }, [])

  useEffect(() => {
    if (hydration !== 'ready' || !session) return
    const timeout = setTimeout(() => {
      saveCases(session.phoneE164, cases)
        .then(() => setStorageError(undefined))
        .catch(() => setStorageError('לא ניתן לשמור את השינויים במכשיר'))
    }, 150)
    return () => clearTimeout(timeout)
  }, [cases, hydration, session])

  async function hydrate() {
    setHydration('loading')
    setStorageError(undefined)
    try {
      const storedSession = await getStoredAuthSession()
      const storedCases = storedSession ? await loadCases(storedSession.phoneE164) : null
      setSession(storedSession)
      setCases(storedSession ? storedCases ?? createStarterCases() : [])
      setHydration('ready')
    } catch {
      setHydration('error')
    }
  }

  function createCase(nextCase: DiraCase) {
    setCases((current) => [nextCase, ...current])
    setActiveCaseId(nextCase.id)
    setScreen('detail')
  }

  function updateCase(caseId: string, updater: (item: DiraCase) => DiraCase) {
    setCases((current) => current.map((item) => (item.id === caseId ? updater(item) : item)))
  }

  function addEvidence(caseId: string, evidence: EvidenceItem) {
    updateCase(caseId, (item) => attachEvidence(item, evidence))
  }

  function addDeliveryEvent(caseId: string, event: Omit<DeliveryEvent, 'id'>) {
    updateCase(caseId, (item) => recordDeliveryEvent(item, event))
  }

  async function logout() {
    setStorageError(undefined)
    try {
      await clearAuthSession()
      setSession(null)
      setCases([])
      setActiveCaseId(null)
      setScreen('home')
    } catch {
      setStorageError('לא ניתן היה להשלים את היציאה. נסו שוב')
    }
  }

  async function completeAuthentication(nextSession: AuthSession) {
    setHydration('loading')
    setStorageError(undefined)
    try {
      const storedCases = await loadCases(nextSession.phoneE164)
      setCases(storedCases ?? createStarterCases())
      setSession(nextSession)
      setHydration('ready')
    } catch {
      await clearAuthSession()
      setSession(null)
      setCases([])
      setHydration('error')
    }
  }

  if (hydration === 'loading') {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.blue} size="large" />
        <Text accessibilityLiveRegion="polite" style={styles.loadingText}>טוען נתונים מאובטחים…</Text>
      </SafeAreaView>
    )
  }

  if (hydration === 'error') {
    return (
      <SafeAreaView style={styles.centered}>
        <Text accessibilityRole="alert" style={styles.errorText}>לא ניתן לטעון את הנתונים השמורים במכשיר.</Text>
        <Button label="ניסיון נוסף" onPress={hydrate} style={styles.retryButton} />
      </SafeAreaView>
    )
  }

  if (!session) {
    return <AuthScreen onAuthenticated={(nextSession) => void completeAuthentication(nextSession)} />
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {storageError ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.storageError}>
          {storageError}
        </Text>
      ) : null}
      <View style={styles.shell}>
        {screen === 'home' ? (
          <HomeScreen
            cases={cases}
            onCreate={() => setScreen('create')}
            onLogout={logout}
            onOpenCase={(id) => {
              setActiveCaseId(id)
              setScreen('detail')
            }}
          />
        ) : null}
        {screen === 'create' ? <CaseWizardScreen onBack={() => setScreen('home')} onCreate={createCase} /> : null}
        {screen === 'detail' && activeCase ? (
          <CaseDetailScreen
            item={activeCase}
            onBack={() => setScreen('home')}
            onAddEvidence={(evidence) => addEvidence(activeCase.id, evidence)}
            onShareOutcome={(event) => addDeliveryEvent(activeCase.id, event)}
          />
        ) : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 16,
  },
  errorText: {
    color: colors.red,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 180,
  },
  storageError: {
    color: colors.red,
    backgroundColor: colors.softRed,
    paddingHorizontal: 16,
    paddingVertical: 10,
    textAlign: 'center',
    fontWeight: '700',
  },
})
