/**
 * ViewErrorBoundary — Catch errors per-tab without crashing the whole app.
 * ────────────────────────────────────────────────────────────────────────
 * Shows a friendly error card with retry, instead of killing the layout.
 */

import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Warning, ArrowCounterClockwise } from '@phosphor-icons/react'

interface Props {
  children: ReactNode
  /** Key to reset the boundary when the view changes */
  viewKey?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ViewErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidUpdate(prevProps: Props) {
    // Reset when the user navigates to a different view
    if (prevProps.viewKey !== this.props.viewKey && this.state.hasError) {
      this.setState({ hasError: false, error: null })
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center py-20" dir="rtl">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Warning size={24} weight="fill" className="text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">משהו השתבש</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  אירעה שגיאה בטעינת העמוד. נסה שוב או חזור ללוח הבקרה.
                </p>
              </div>
              {this.state.error && (
                <pre className="text-xs text-destructive bg-muted/50 p-3 rounded-lg border overflow-auto max-h-24 text-left font-mono" dir="ltr">
                  {this.state.error.message}
                </pre>
              )}
              <Button onClick={this.handleReset} variant="outline" className="gap-2">
                <ArrowCounterClockwise size={16} weight="bold" />
                נסה שנית
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
