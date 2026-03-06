import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type FeedbackType = 'error' | 'success' | 'warning' | 'info'

interface FeedbackAlertProps {
  type: FeedbackType
  title?: string
  message: string
  onDismiss?: () => void
  className?: string
}

const config: Record<
  FeedbackType,
  {
    container: string
    icon: React.ReactNode
  }
> = {
  error: {
    container:
      'border-destructive/25 bg-destructive/8 text-destructive',
    icon: <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />,
  },
  success: {
    container:
      'border-success/25 bg-success/8 text-success',
    icon: <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />,
  },
  warning: {
    container:
      'border-warning/25 bg-warning/8 text-warning-foreground',
    icon: <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5 text-warning" />,
  },
  info: {
    container:
      'border-primary/25 bg-primary/8 text-foreground',
    icon: <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />,
  },
}

/**
 * FeedbackAlert — exibe mensagens de erro, sucesso, aviso ou informação
 * com animação de entrada e suporte a dismiss.
 */
export function FeedbackAlert({
  type,
  title,
  message,
  onDismiss,
  className,
}: FeedbackAlertProps) {
  if (!message) return null

  const { container, icon } = config[type]

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium animate-fade-in-down',
        container,
        className,
      )}
    >
      {icon}
      <div className="flex-1 space-y-0.5">
        {title && <p className="font-semibold">{title}</p>}
        <p className={title ? 'font-normal opacity-90' : ''}>{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-1 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
          aria-label="Fechar alerta"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

/**
 * InlineError — erro compacto em uma linha, usado sob campos de formulário.
 */
export function InlineError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive animate-fade-in">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  )
}
