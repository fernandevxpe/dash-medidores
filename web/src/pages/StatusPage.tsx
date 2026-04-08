import { Card } from '../components/ui/Card'
import { Link } from 'react-router-dom'

export function StatusPage() {
  return (
    <div className="space-y-5">
      <Card title="Status migrado para Equipamentos" subtitle="A visualização operacional foi consolidada na guia Equipamentos">
        <p className="text-sm text-zinc-300">
          Os gráficos e indicadores de status agora ficam em <strong>Equipamentos</strong>, junto com histórico completo
          por ID e métricas de uso/ociosidade.
        </p>
        <Link
          to="/equipamentos"
          className="mt-3 inline-flex rounded-lg border border-xpe-border px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/5"
        >
          Ir para Equipamentos
        </Link>
      </Card>
    </div>
  )
}
