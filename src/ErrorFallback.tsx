import type { FallbackProps } from 'react-error-boundary'
import { Alert, AlertTitle, AlertDescription } from './components/ui/alert'
import { Button } from './components/ui/button'
import { Warning, ArrowCounterClockwise } from '@phosphor-icons/react'

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <Alert variant="destructive" className="mb-6">
          <Warning size={20} weight="fill" />
          <AlertTitle>שגיאה בלתי צפויה</AlertTitle>
          <AlertDescription>
            משהו השתבש בזמן הרצת האפליקציה. פרטי השגיאה מוצגים למטה.
          </AlertDescription>
        </Alert>

        <div className="bg-card border rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-sm text-muted-foreground mb-2">פרטי שגיאה:</h3>
          <pre className="text-xs text-destructive bg-muted/50 p-3 rounded-lg border overflow-auto max-h-32 font-mono" dir="ltr">
            {error.message}
          </pre>
        </div>

        <Button
          onClick={resetErrorBoundary}
          className="w-full gap-2"
          variant="outline"
        >
          <ArrowCounterClockwise size={18} weight="bold" />
          נסה שנית
        </Button>
      </div>
    </div>
  )
}
