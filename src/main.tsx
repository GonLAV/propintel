import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

// main.css is the single entry point — it imports theme.css and index.css internally
import "./main.css"

function renderApp() {
  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <App />
    </ErrorBoundary>
  )
}

async function bootstrap() {
  try {
    await import('@github/spark/spark')
  } catch (error) {
    console.warn('Spark runtime failed to initialize, continuing without it.', error)
  }

  renderApp()
}

void bootstrap()
