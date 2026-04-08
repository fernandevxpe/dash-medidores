import { useMemo } from 'react'
import { Card } from '../components/ui/Card'
import { useDashboardData } from '../context/DashboardDataContext'
import {
  bucketDayInstalacaoDesinstalacao,
  indicadoresTemporaisGlobais,
  medidoresDistintosPorCliente,
  resumoPrazoMedicao,
  statusCountsMedidorDerived,
  analisadorStatusDistribuicao,
} from '../analytics/metrics'

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  )
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
          <Item label="Equipamentos medidores" value={String(d.tempo.medidores.quantidadeEquipamentos)} />
          <Item label="Equipamentos analisadores" value={String(d.tempo.analisadores.quantidadeEquipamentos)} />
          <Item label="Serviços realizados" value={String(d.servicos)} />
          <Item label="Pico diário (últ. 7 dias)" value={String(d.picoSemanal)} />
          <Item label="Taxa uso medidores" value={`${(d.tempo.medidores.taxaUso * 100).toFixed(1)}%`} />
          <Item label="Taxa uso analisadores" value={`${(d.tempo.analisadores.taxaUso * 100).toFixed(1)}%`} />
          <Item label="Média medição medidores" value={`${d.tempo.medidores.mediaMedicaoDias.toFixed(1)} d`} />
          <Item
            label="Média medição analisadores"
            value={`${d.tempo.analisadores.mediaMedicaoDias.toFixed(1)} d`}
          />
          <Item label="Média ociosidade medidores" value={`${d.tempo.medidores.mediaOciosidadeDias.toFixed(1)} d`} />
          <Item
            label="Média ociosidade analisadores"
            value={`${d.tempo.analisadores.mediaOciosidadeDias.toFixed(1)} d`}
          />
          <Item label="Em uso medidores" value={String(d.med.instalado)} />
          <Item label="Em manutenção medidores" value={String(d.med.manutencao)} />
          <Item label="Em uso analisadores" value={String(d.an.instalado)} />
          <Item label="Em manutenção analisadores" value={String(d.an.manutencao)} />
          <Item label="Média medidores por cliente" value={d.mediaMedPorCliente.toFixed(2)} />
          <Item label="Ciclos abertos" value={String(d.prazo.totalCiclosAbertos)} />
        </div>
      </Card>
    </div>
  )
}
