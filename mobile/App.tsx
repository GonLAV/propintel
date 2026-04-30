import { useMemo, useState } from 'react'
import { I18nManager, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { CaseDetailScreen } from '@/features/cases/CaseDetailScreen'
import { CaseWizardScreen } from '@/features/cases/CaseWizardScreen'
import { HomeScreen } from '@/features/cases/HomeScreen'
import { AppScreen, DiraCase, EvidenceItem, attachEvidence, createStarterCases } from '@/features/cases/model'
import { colors } from '@/theme/tokens'

I18nManager.allowRTL(true)
I18nManager.forceRTL(true)

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [screen, setScreen] = useState<AppScreen>('home')
  const [cases, setCases] = useState<DiraCase[]>(() => createStarterCases())
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null)
  const activeCase = useMemo(() => cases.find((item) => item.id === activeCaseId) || cases[0], [activeCaseId, cases])

  function createCase(nextCase: DiraCase) {
    setCases((current) => [nextCase, ...current])
    setActiveCaseId(nextCase.id)
    setScreen('detail')
  }

  function addEvidence(caseId: string, evidence: EvidenceItem) {
    setCases((current) => current.map((item) => (item.id === caseId ? attachEvidence(item, evidence) : item)))
  }

  if (!authenticated) {
    return <AuthScreen onAuthenticated={() => setAuthenticated(true)} />
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.shell}>
        {screen === 'home' ? (
          <HomeScreen cases={cases} onCreate={() => setScreen('create')} onOpenCase={(id) => { setActiveCaseId(id); setScreen('detail') }} />
        ) : null}
        {screen === 'create' ? <CaseWizardScreen onBack={() => setScreen('home')} onCreate={createCase} /> : null}
        {screen === 'detail' && activeCase ? <CaseDetailScreen item={activeCase} onBack={() => setScreen('home')} onAddEvidence={(evidence) => addEvidence(activeCase.id, evidence)} /> : null}
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
})