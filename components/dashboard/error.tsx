interface DashboardErrorProps {
  error: Error
  onRetry?: () => void
}

export function DashboardError({ error, onRetry }: DashboardErrorProps) {
  return (
    <div className="w-full h-full min-h-screen bg-[#0A0A0B] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white">Erro ao carregar dados</h3>
        <p className="text-sm text-[#E8F3ED]/60">{error.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm font-medium text-white bg-[#58E877] rounded-lg hover:bg-[#4EDB82] transition-colors"
          >
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  )
}

export function MetricError({ error, onRetry }: DashboardErrorProps) {
  return (
    <div className="w-full h-full min-h-[200px] bg-[#1E1E1E] rounded-lg p-4 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-center">
        <svg
          className="w-6 h-6 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="text-sm text-[#E8F3ED]/60">{error.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 text-xs font-medium text-white bg-[#58E877] rounded hover:bg-[#4EDB82] transition-colors"
          >
            Recarregar
          </button>
        )}
      </div>
    </div>
  )
} 