import { useMemo, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Boxes,
  CalendarDays,
  FlaskConical,
  Gauge,
  GitBranch,
  Hourglass,
  Layers,
  MapPin,
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
  analisadorStatusDistribuicao,
  bucketDayInstalacaoDesinstalacao,
  bucketMonthInstalacaoDesinstalacao,
  capacityMetrics,
  indicadoresTemporaisGlobais,
  medidoresDistintosPorCliente,
  resumoPrazoMedicao,
  statusCountsMedidorDerived,
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

const NOMES_MESES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const

function mesCalendarioPt(yyyyMm: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyyMm.trim())
  if (!m) return yyyyMm
  const ano = Number(m[1])
  const idx = Number(m[2]) - 1
  if (idx < 0 || idx > 11) return yyyyMm
  return `${NOMES_MESES_PT[idx]} ${ano}`
}

function textoUltimoMesVolume(ultimoMes: {
  mes: string
  instalacoes: number
  desinstalacoes: number
}): string {
  const ref = mesCalendarioPt(ultimoMes.mes)
  const inst = ultimoMes.instalacoes
  const des = ultimoMes.desinstalacoes
  const total = inst + des
  return `${ref} -> ${inst} Inst. / ${des} Desinst. / ${total} Total`
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 border-b border-xpe-border/60 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-300/95">
      {children}
    </h3>
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
    const cap = capacityMetrics(bundle)
    const dayBuckets = bucketDayInstalacaoDesinstalacao(bundle.eventos)
    const servicos = dayBuckets.reduce((acc, x) => acc + x.instalacoes + x.desinstalacoes, 0)
    const byDay = new Map<string, { inst: number; des: number }>()
    for (const e of bundle.eventos) {
      const dia = e.data.slice(0, 10)
      if (!byDay.has(dia)) byDay.set(dia, { inst: 0, des: 0 })
      const row = byDay.get(dia)!
      if (e.statusExecucao === 'instalacao') row.inst++
      else if (e.statusExecucao === 'desinstalacao') row.des++
    }
    const daysArr = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    const picoDiarioAll = daysArr.reduce((m, [, v]) => Math.max(m, v.inst + v.des), 0)
    const picoSemanal = daysArr
      .slice(-7)
      .reduce((acc, [, v]) => Math.max(acc, v.inst + v.des), 0)
    const meses = bucketMonthInstalacaoDesinstalacao(bundle.eventos)
    const ultimoMes = meses[meses.length - 1]
    const ultimos12 = meses.slice(-12)
    const soma12 = ultimos12.reduce(
      (a, x) => ({ inst: a.inst + x.instalacoes, des: a.des + x.desinstalacoes }),
      { inst: 0, des: 0 },
    )
    const clientes = medidoresDistintosPorCliente(bundle.eventos)
    const mediaMedPorCliente =
      clientes.length > 0 ? clientes.reduce((acc, x) => acc + x.medidores, 0) / clientes.length : 0
    const mediaAnPorCliente =
      clientes.length > 0 ? clientes.reduce((acc, x) => acc + x.analisadores, 0) / clientes.length : 0
    return {
      tempo,
      prazo,
      med,
      an,
      cap,
      servicos,
      picoSemanal,
      picoDiarioAll,
      ultimoMes,
      soma12,
      nClientes: clientes.length,
      mediaMedPorCliente,
      mediaAnPorCliente,
    }
  }, [bundle])

  if (loadState !== 'ready' || !d) {
    return <div className="py-20 text-center text-xpe-muted">Carregando…</div>
  }

  return (
    <div className="space-y-5">
      <Card
        title="Painel de indicadores"
        subtitle="Métricas consolidadas por tema — alinhado ao restante da dashboard (cores e mini-cards)"
      >
        <div className="space-y-8">
          <section>
            <SectionTitle>Frota e referência</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Item
                icon={Boxes}
                accent="neon"
                label="Medidores (frota observada)"
                value={String(d.tempo.medidores.quantidadeEquipamentos)}
              />
              <Item
                icon={FlaskConical}
                accent="violet"
                label="Analisadores (catálogo)"
                value={String(d.an.totalCatalogo)}
              />
              <Item
                icon={Layers}
                accent="sky"
                label="Total equipamentos (referência)"
                value={String(d.cap.totalEquipamentosFrota)}
              />
              <Item
                icon={MapPin}
                accent="neutral"
                label="Clientes com histórico"
                value={String(d.nClientes)}
              />
            </div>
          </section>

          <section>
            <SectionTitle>Estado operacional hoje · medidores</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Item icon={Activity} accent="neon" label="Em uso" value={String(d.med.instalado)} />
              <Item icon={Wrench} accent="amber" label="Manutenção" value={String(d.med.manutencao)} />
              <Item
                icon={Gauge}
                accent="neutral"
                label="Disponíveis"
                value={String(d.med.disponivel)}
              />
              <Item
                icon={Gauge}
                accent="neon"
                label="Ocupação (inst. + manut.)"
                value={
                  d.tempo.medidores.quantidadeEquipamentos > 0
                    ? `${(
                        ((d.med.instalado + d.med.manutencao) / d.tempo.medidores.quantidadeEquipamentos) *
                        100
                      ).toFixed(1)}%`
                    : '—'
                }
              />
            </div>
          </section>

          <section>
            <SectionTitle>Estado operacional hoje · analisadores</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Item icon={Activity} accent="violet" label="Em uso" value={String(d.an.instalado)} />
              <Item icon={Wrench} accent="amber" label="Manutenção" value={String(d.an.manutencao)} />
              <Item icon={Gauge} accent="neutral" label="Disponíveis" value={String(d.an.disponivel)} />
              <Item
                icon={Gauge}
                accent="violet"
                label="Ocupação (inst. + manut.)"
                value={
                  d.an.totalCatalogo > 0
                    ? `${(((d.an.instalado + d.an.manutencao) / d.an.totalCatalogo) * 100).toFixed(1)}%`
                    : '—'
                }
                foot="sobre catálogo"
              />
            </div>
          </section>

          <section>
            <SectionTitle>Utilização temporal (ciclos)</SectionTitle>
            <p className="mb-3 text-xs text-zinc-500">
              Taxa de uso = tempo em medição / (medição + ociosidade). Manutenção em campo não entra no denominador.
              Ociosidade conta só após a 1.ª desinstalação, a partir da 1.ª instalação.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Item
                icon={Gauge}
                accent="neon"
                label="Taxa uso · medidores"
                value={`${(d.tempo.medidores.taxaUso * 100).toFixed(1)}%`}
              />
              <Item
                icon={Gauge}
                accent="violet"
                label="Taxa uso · analisadores"
                value={`${(d.tempo.analisadores.taxaUso * 100).toFixed(1)}%`}
              />
              <Item
                icon={Timer}
                accent="sky"
                label="Média medição · medidores"
                value={`${d.tempo.medidores.mediaMedicaoDias.toFixed(1)} d`}
              />
              <Item
                icon={Timer}
                accent="violet"
                label="Média medição · analisadores"
                value={`${d.tempo.analisadores.mediaMedicaoDias.toFixed(1)} d`}
              />
              <Item
                icon={Hourglass}
                accent="neutral"
                label="Média ociosidade · medidores"
                value={`${d.tempo.medidores.mediaOciosidadeDias.toFixed(1)} d`}
              />
              <Item
                icon={Hourglass}
                accent="violet"
                label="Média ociosidade · analisadores"
                value={`${d.tempo.analisadores.mediaOciosidadeDias.toFixed(1)} d`}
              />
              <Item
                icon={Wrench}
                accent="amber"
                label="Média manutenção · medidores"
                value={`${d.tempo.medidores.mediaManutencaoDias.toFixed(1)} d`}
              />
              <Item
                icon={Wrench}
                accent="amber"
                label="Média manutenção · analisadores"
                value={`${d.tempo.analisadores.mediaManutencaoDias.toFixed(1)} d`}
              />
            </div>
          </section>

          <section>
            <SectionTitle>Volume e ritmo de serviços</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Item icon={Zap} accent="amber" label="Eventos inst. + desinst." value={String(d.servicos)} />
              <Item
                icon={TrendingUp}
                accent="sky"
                label="Pico diário (últimos 7 dias)"
                value={String(d.picoSemanal)}
              />
              <Item
                icon={TrendingUp}
                accent="violet"
                label="Pico diário (histórico)"
                value={String(d.picoDiarioAll)}
              />
              <Item
                icon={CalendarDays}
                accent="neon"
                label="Último mês civil"
                value={d.ultimoMes ? textoUltimoMesVolume(d.ultimoMes) : '—'}
              />
              <Item
                icon={CalendarDays}
                accent="sky"
                label="Últimos 12 meses (acum.)"
                value={`${d.soma12.inst} inst. · ${d.soma12.des} desinst.`}
              />
            </div>
          </section>

          <section>
            <SectionTitle>Clientes e cobertura</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Item
                icon={Users}
                accent="sky"
                label="Média medidores por cliente"
                value={d.mediaMedPorCliente.toFixed(2)}
              />
              <Item
                icon={FlaskConical}
                accent="violet"
                label="Média analisadores por cliente"
                value={d.mediaAnPorCliente.toFixed(2)}
              />
            </div>
          </section>

          <section>
            <SectionTitle>Prazo e ciclos de medição</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Item
                icon={GitBranch}
                accent="neutral"
                label="Ciclos abertos (estimativa)"
                value={String(d.prazo.totalCiclosAbertos)}
              />
            </div>
          </section>
        </div>
      </Card>
    </div>
  )
}
