import { useMemo } from 'react'
import { useDashboardData } from '../context/DashboardDataContext'
import { Card } from '../components/ui/Card'
import { BarVolumeDual } from '../components/charts/BarVolumeDual'
import { BarVolume } from '../components/charts/BarVolume'
import { BarPrazoCiclos } from '../components/charts/BarPrazoCiclos'
import { KpiTile } from '../components/ui/KpiTile'
import {
  bucketDayInstalacaoDesinstalacao,
  bucketIsoWeekInstalacaoDesinstalacao,
  bucketMesCiclosConcluidosPrazo,
  bucketMonthInstalacaoDesinstalacao,
  bucketWeekOfMonth,
  capacityMetrics,
  ciclosMedicao,
  resumoPrazoMedicao,
} from '../analytics/metrics'

export function TimePage() {
  const { bundle, eventosFiltrados, loadState } = useDashboardData()

  const derived = useMemo(() => {
    if (!bundle) return null
    const cap = capacityMetrics(bundle)
    const prazo = resumoPrazoMedicao(bundle)
    const prazoMes = bucketMesCiclosConcluidosPrazo(bundle)
    const diaDual = bucketDayInstalacaoDesinstalacao(eventosFiltrados)
    const semIso = bucketIsoWeekInstalacaoDesinstalacao(eventosFiltrados)
    const mes = bucketMonthInstalacaoDesinstalacao(eventosFiltrados)
    const semMes = bucketWeekOfMonth(eventosFiltrados)
    const ciclosHist = ciclosMedicao(eventosFiltrados, bundle.config.diasMedicaoPadrao)
    const concl = ciclosHist.filter((c) => c.concluido)
    const diasConcl = concl.map((c) => c.diasDuracao)
    const mediaFiltrado =
      diasConcl.length > 0 ? diasConcl.reduce((a, b) => a + b, 0) / diasConcl.length : 0
    return {
      cap,
      prazo,
      prazoMes,
      diaDual,
      semIso,
      mes,
      semMes,
      mediaFiltrado,
      ciclosConcluidosFiltrado: concl.length,
      ciclosAbertosFiltrado: ciclosHist.filter((c) => !c.concluido).length,
    }
  }, [bundle, eventosFiltrados])

  if (loadState !== 'ready' || !bundle || !derived) {
    return <div className="py-20 text-center text-xpe-muted">Carregando…</div>
  }

  const {
    cap,
    prazo,
    prazoMes,
    diaDual,
    semIso,
    mes,
    semMes,
    mediaFiltrado,
    ciclosConcluidosFiltrado,
    ciclosAbertosFiltrado,
  } = derived

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Média dias (ciclo concluído)"
          hint="Global · instalação → desinstalação"
          value={`${prazo.mediaDiasCicloConcluido.toFixed(1)} d`}
          foot={`No filtro atual: ${mediaFiltrado.toFixed(1)} d (${ciclosConcluidosFiltrado} ciclos fechados)`}
        />
        <KpiTile
          label="Faltam desinstalar (fora do prazo)"
          hint="Ciclos abertos com &gt; N dias desde a instalação"
          value={prazo.pendentesDesinstalar}
          foot={`Abertos no total: ${prazo.totalCiclosAbertos} · No recorte: ${ciclosAbertosFiltrado}`}
        />
        <KpiTile
          label="Disponíveis para instalar (medidores)"
          hint="Frota sem slot ativo hoje"
          value={cap.disponiveis}
          foot={`${cap.totalMedidores > 0 ? ((cap.disponiveis / cap.totalMedidores) * 100).toFixed(1) : '0'}% da frota`}
        />
        <KpiTile
          label="Analisadores livres"
          value={cap.analisadoresLivres}
          foot={`${cap.totalAnalisadoresCatalogo > 0 ? ((cap.analisadoresLivres / cap.totalAnalisadoresCatalogo) * 100).toFixed(1) : '0'}% do catálogo`}
        />
      </div>

      <Card
        title="Instalações e desinstalações · por dia"
        subtitle="Contagem de eventos no período filtrado no Painel"
      >
        <BarVolumeDual
          data={diaDual.map((d) => ({
            label: d.dia,
            instalacoes: d.instalacoes,
            desinstalacoes: d.desinstalacoes,
          }))}
          xKey="label"
          keyInst="instalacoes"
          keyDes="desinstalacoes"
        />
      </Card>

      <Card title="Por semana ISO" subtitle="Cada barra = soma de eventos na semana">
        <BarVolumeDual
          data={semIso.map((d) => ({
            label: d.semana,
            instalacoes: d.instalacoes,
            desinstalacoes: d.desinstalacoes,
          }))}
          xKey="label"
          keyInst="instalacoes"
          keyDes="desinstalacoes"
        />
      </Card>

      <Card title="Por mês (AAAA-MM)" subtitle="Visão mensal agregada">
        <BarVolumeDual
          data={mes.map((d) => ({
            label: d.mes,
            instalacoes: d.instalacoes,
            desinstalacoes: d.desinstalacoes,
          }))}
          xKey="label"
          keyInst="instalacoes"
          keyDes="desinstalacoes"
        />
      </Card>

      <Card
        title="Instalações · semana do mês (S1–S5)"
        subtitle="Soma de eventos INSTALAÇÃO por faixa do mês no período filtrado"
      >
        <BarVolume
          data={semMes.map((d) => ({ label: d.semanaMes, total: d.total }))}
          dataKey="total"
          xKey="label"
          color="#38bdf8"
        />
      </Card>

      <Card
        title="Ciclos concluídos: dentro vs fora do prazo"
        subtitle={`Referência ${prazo.diasPadrao} dias · mês pela data da desinstalação · histórico completo`}
      >
        <BarPrazoCiclos data={prazoMes} diasPrazo={prazo.diasPadrao} />
      </Card>
    </div>
  )
}
