import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDashboardData } from '../context/DashboardDataContext'
import { Card } from '../components/ui/Card'
import { SegmentedStatusBar } from '../components/charts/SegmentedStatusBar'
import {
  analyzerDonutSlices,
  analisadorStatusDistribuicao,
  capacityMetrics,
  medidorStatusDistribuicao,
} from '../analytics/metrics'

const M_COL = { instalado: '#39ff9c', manutencao: '#fbbf24', disponivel: '#a855f7' }

export function StatusPage() {
  const { bundle, loadState } = useDashboardData()

  const medidorBars = useMemo(() => {
    if (!bundle) return []
    const d = medidorStatusDistribuicao(bundle)
    return [
      { name: 'Em uso', value: d.instalado, fill: M_COL.instalado },
      { name: 'Manutenção', value: d.manutencao, fill: M_COL.manutencao },
      { name: 'Disponível', value: d.disponivel, fill: M_COL.disponivel },
    ]
  }, [bundle])

  const analisadorBars = useMemo(() => {
    if (!bundle) return []
    const d = analisadorStatusDistribuicao(bundle)
    return [
      { name: 'Em uso', value: d.instalado, fill: '#39ff9c' },
      { name: 'Manutenção', value: d.manutencao, fill: '#fbbf24' },
      { name: 'Livres', value: d.disponivel, fill: '#64748b' },
    ]
  }, [bundle])

  const medidorSeg = useMemo(() => {
    if (!bundle) return []
    const d = medidorStatusDistribuicao(bundle)
    return [
      { key: 'i', label: 'Em uso (instalado)', value: d.instalado, color: M_COL.instalado },
      { key: 'm', label: 'Manutenção', value: d.manutencao, color: M_COL.manutencao },
      { key: 'd', label: 'Disponível', value: d.disponivel, color: M_COL.disponivel },
    ]
  }, [bundle])

  const analSeg = useMemo(() => {
    if (!bundle) return []
    const a = analyzerDonutSlices(bundle)
    return [
      { key: 'u', label: 'Em uso', value: a[0]?.value ?? 0, color: '#39ff9c' },
      { key: 'm', label: 'Manutenção', value: a[1]?.value ?? 0, color: '#fbbf24' },
      { key: 'l', label: 'Livres', value: a[2]?.value ?? 0, color: '#64748b' },
    ]
  }, [bundle])

  const capFoot = useMemo(() => (bundle ? capacityMetrics(bundle) : null), [bundle])

  if (loadState !== 'ready' || !bundle || !capFoot) {
    return <div className="py-20 text-center text-xpe-muted">Carregando…</div>
  }

  return (
    <div className="space-y-5">
      <Card
        title="Status · medidores"
        subtitle={`Frota ${capFoot.totalMedidores} unidades · barras horizontais com totais e faixa empilhada com %`}
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={medidorBars} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(168,85,247,0.12)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#a1a1aa', fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fill: '#e4e4e7', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#120b1f',
                    border: '1px solid rgba(168,85,247,0.35)',
                    borderRadius: 12,
                    color: '#f4f4f5',
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={26}>
                  {medidorBars.map((_, i) => (
                    <Cell key={i} fill={medidorBars[i]!.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <SegmentedStatusBar segments={medidorSeg} />
        </div>
      </Card>

      <Card
        title="Status · analisadores"
        subtitle={`Catálogo ${capFoot.totalAnalisadoresCatalogo} unidades · em uso + manutenção contam como “em campo”`}
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analisadorBars} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(168,85,247,0.12)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 10 }} interval={0} angle={-8} height={44} />
                <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#120b1f',
                    border: '1px solid rgba(168,85,247,0.35)',
                    borderRadius: 12,
                    color: '#f4f4f5',
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {analisadorBars.map((_, i) => (
                    <Cell key={i} fill={analisadorBars[i]!.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <SegmentedStatusBar segments={analSeg} />
        </div>
      </Card>
    </div>
  )
}
