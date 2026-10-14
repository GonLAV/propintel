import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

// main.css is the single entry point — it imports theme.css and index.css internally
import "./main.css"

type SparkUser = {
  id: string | number
  login?: string | null
  email?: string | null
  isOwner?: boolean
}

function renderApp(user: SparkUser) {
  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <App currentUser={user} />
    </ErrorBoundary>
  )
}

function renderAccessDenied() {
  createRoot(document.getElementById('root')!).render(
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <section className="max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Access restricted</h1>
        <p className="mt-3 text-muted-foreground">
          This administrative workspace is available only to the verified Spark owner.
        </p>
      </section>
    </main>
  )
}

async function bootstrap() {
  let sparkUser: SparkUser | null = null

  try {
    await import('@github/spark/spark')
    sparkUser = await window.spark.user()
  } catch (error) {
    console.warn('Spark runtime failed to initialize.', error)
  }

  const allowLocalOwner = import.meta.env.DEV && import.meta.env.VITE_ALLOW_LOCAL_OWNER === 'true'
  if (!sparkUser?.isOwner && !allowLocalOwner) {
    renderAccessDenied()
    return
  }

  renderApp(sparkUser || {
    id: 'local-development-owner',
    login: 'local-owner',
    email: import.meta.env.VITE_LOCAL_OWNER_EMAIL || 'owner@localhost',
    isOwner: true,
  })
}

void bootstrap()
