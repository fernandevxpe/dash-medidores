import type { ReactNode } from 'react'

export function Card({
  title,
  subtitle,
  children,
  className = '',
  action,
}: {
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <section
      className={`rounded-2xl border border-xpe-border bg-xpe-surface/80 shadow-[0_0_40px_-12px_rgba(168,85,247,0.35)] backdrop-blur-sm ${className}`}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-xpe-border/60 px-4 py-3 sm:px-5">
          <div>
            {title && (
              <h2 className="font-display text-sm font-semibold tracking-wide text-zinc-100 sm:text-base">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-xpe-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}
