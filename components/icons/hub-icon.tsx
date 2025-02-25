export function HubIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" stroke="currentColor" strokeWidth="1.5" />
      {/* Pontos conectados */}
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 12 12)`}>
          <circle cx="12" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
          <line x1="12" y1="7" x2="12" y2="10" stroke="currentColor" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  )
}

