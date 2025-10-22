import { Component, type ReactNode } from 'react'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h1>Ups! Coś poszło nie tak 😔</h1>
            <p className="error-message-text">
              Wystąpił nieoczekiwany błąd w aplikacji.
            </p>
            {this.state.error && (
              <details className="error-details">
                <summary>Szczegóły techniczne</summary>
                <pre>{this.state.error.toString()}</pre>
              </details>
            )}
            <div className="error-actions">
              <button onClick={() => window.location.href = '/'}>
                Wróć do strony głównej
              </button>
              <button onClick={() => window.location.reload()}>
                Odśwież stronę
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

