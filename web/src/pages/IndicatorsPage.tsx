import { useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Boxes,
  FlaskConical,
  Gauge,
  GitBranch,
  Hourglass,
  Timer,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { IndicatorMiniCard, type IndicatorAccent } from '../components/ui/IndicatorMiniCard'
import { useDashboardData } from '../context/DashboardDataContext'
import {
  bucketDayInstalacaoDesinstalacao,
  indicadoresTemporaisGlobais,
  medidoresDistintosPorCliente,
  resumoPrazoMedicao,
  statusCountsMedidorDerived,
  analisadorStatusDistribuicao,
} from '../analytics/metrics'

function Item({
  icon,
  label,
  value,
  accent = 'neutral',
}: {
  icon: LucideIcon
  label: string
  value: string
  accent?: IndicatorAccent
}) {
  return <IndicatorMiniCard icon={icon} label={label} value={value} accent={accent} />
}

export function IndicatorsPage() {
  const { bundle, loadState } = useDashboardData()
  const d = useMemo(() => {
    if (!bundle) return null
    const tempo = indicadoresTemporaisGlobais(bundle)
    const prazo = resumoPrazoMedicao(bundle)
    const med = statusCountsMedidorDerived(bundle)
    const an = analisadorStatusDistribuicao(bundle)
    const daily = bucketDayInstalacaoDesinstalacao(bundle.eventos)
    const servicos = daily.reduce((acc, x) => acc + x.instalacoes + x.desinstalacoes, 0)
    const picoSemanal = daily
      .slice(-7)
      .reduce((acc, x) => Math.max(acc, x.instalacoes + x.desinstalacoes), 0)
    const clientes = medidoresDistintosPorCliente(bundle.eventos)
    const mediaMedPorCliente =
      clientes.length > 0 ? clientes.reduce((acc, x) => acc + x.medidores, 0) / clientes.length : 0
    return { tempo, prazo, med, an, servicos, picoSemanal, mediaMedPorCliente }
  }, [bundle])

  if (loadState !== 'ready' || !d) {
    return <div className="py-20 text-center text-xpe-muted">Carregando…</div>
  }

  return (
    <div className="space-y-5">
      <Card title="Painel de indicadores" subtitle="Visão numérica consolidada de operação, uso e performance">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Item
            icon={Boxes}
            accent="neon"
            label="Equipamentos medidores"
            value={String(d.tempo.medidores.quantidadeEquipamentos)}
          />
          <Item
            icon={FlaskConical}
            accent="violet"
            label="Equipamentos analisadores"
            value={String(d.tempo.analisadores.quantidadeEquipamentos)}
          />
          <Item icon={Zap} accent="amber" label="Serviços realizados" value={String(d.servicos)} />
          <Item
            icon={TrendingUp}
            accent="sky"
            label="Pico diário (últ. 7 dias)"
            value={String(d.picoSemanal)}
          />
          <Item
            icon={Gauge}
            accent="neon"
            label="Taxa uso medidores"
            value={`${(d.tempo.medidores.taxaUso * 100).toFixed(1)}%`}
          />
          <Item
            icon={Gauge}
            accent="violet"
            label="Taxa uso analisadores"
            value={`${(d.tempo.analisadores.taxaUso * 100).toFixed(1)}%`}
          />
          <Item
            icon={Timer}
            accent="sky"
            label="Média medição medidores"
            value={`${d.tempo.medidores.mediaMedicaoDias.toFixed(1)} d`}
          />
          <Item
            icon={Timer}
            accent="violet"
            label="Média medição analisadores"
            value={`${d.tempo.analisadores.mediaMedicaoDias.toFixed(1)} d`}
          />
          <Item
            icon={Hourglass}
            accent="neutral"
            label="Média ociosidade medidores"
            value={`${d.tempo.medidores.mediaOciosidadeDias.toFixed(1)} d`}
          />
          <Item
            icon={Hourglass}
            accent="violet"
            label="Média ociosidade analisadores"
            value={`${d.tempo.analisadores.mediaOciosidadeDias.toFixed(1)} d`}
          />
          <Item icon={Activity} accent="neon" label="Em uso medidores" value={String(d.med.instalado)} />
          <Item icon={Wrench} accent="amber" label="Em manutenção medidores" value={String(d.med.manutencao)} />
          <Item icon={Activity} accent="violet" label="Em uso analisadores" value={String(d.an.instalado)} />
          <Item icon={Wrench} accent="amber" label="Em manutenção analisadores" value={String(d.an.manutencao)} />
          <Item
            icon={Users}
            accent="sky"
            label="Média medidores por cliente"
            value={d.mediaMedPorCliente.toFixed(2)}
          />
          <Item
            icon={GitBranch}
            accent="neutral"
            label="Ciclos abertos"
            value={String(d.prazo.totalCiclosAbertos)}
          />
        </div>
      </Card>
    </div>
  )
}
