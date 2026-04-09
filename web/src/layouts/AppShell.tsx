import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: 'Painel' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/tempo', label: 'Histórico' },
  { to: '/equipamentos', label: 'Equipamentos' },
  { to: '/indicadores', label: 'Indicadores' },
  { to: '/oportunidades', label: 'Oportunidades' },
  { to: '/calendario', label: 'Calendário' },
  { to: '/apresentacao', label: 'Apresentação' },
]

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-xpe-border/80 bg-xpe-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[min(100%,1600px)] flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-5 2xl:max-w-[min(100%,2200px)] 2xl:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-xpe-purple to-xpe-purple-deep shadow-[0_0_24px_-4px_rgba(168,85,247,0.7)]">
              <span className="font-display text-lg font-bold text-white">X</span>
            </div>
            <div>
              <h1 className="font-display text-base font-bold tracking-tight text-white sm:text-lg">
                Medidores <span className="text-xpe-neon">XPE</span>
              </h1>
              <p className="text-[10px] text-xpe-muted sm:text-xs">Operação · ClickUp · Planilha</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                    isActive
                      ? 'bg-xpe-purple/25 text-xpe-neon ring-1 ring-xpe-neon/30'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[min(100%,1600px)] flex-1 px-3 py-4 sm:px-5 sm:py-6 2xl:max-w-[min(100%,2200px)] 2xl:px-8 2xl:py-8">
        <Outlet />
      </main>
      <footer className="border-t border-xpe-border/50 py-4 text-center text-[10px] text-zinc-500 sm:text-xs">
        Dados derivados da planilha · Cálculos no navegador · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
