'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AnalyticsRow {
  date: string
  views: number
  likes: number
  comments: number
  subscribers_gained: number
  subscribers_lost: number
  estimated_minutes_watched: number
}

interface Props {
  data: AnalyticsRow[]
  metric: 'views' | 'engagement' | 'subscribers' | 'watchtime'
}

const metricConfig = {
  views:       { title: 'Visualizações',          type: 'line' as const, lines: [{ key: 'views',                    name: 'Visualizações', color: '#ef4444' }] },
  engagement:  { title: 'Engajamento',             type: 'bar'  as const, lines: [{ key: 'likes',                   name: 'Curtidas',      color: '#3b82f6' }, { key: 'comments',             name: 'Comentários', color: '#8b5cf6' }] },
  subscribers: { title: 'Inscritos',               type: 'bar'  as const, lines: [{ key: 'subscribers_gained',      name: 'Ganhos',        color: '#10b981' }, { key: 'subscribers_lost',      name: 'Perdidos',    color: '#ef4444' }] },
  watchtime:   { title: 'Tempo Assistido (min)',   type: 'line' as const, lines: [{ key: 'estimated_minutes_watched', name: 'Minutos',     color: '#f59e0b' }] },
}

function fmtDate(d: string) {
  try { return format(parseISO(d), 'dd/MM', { locale: ptBR }) } catch { return d }
}

export function YoutubeAnalyticsChart({ data, metric }: Props) {
  const cfg = metricConfig[metric]
  const chartData = data.map((r) => ({ ...r, dateLabel: fmtDate(r.date) }))
  const interval = data.length > 20 ? Math.ceil(data.length / 15) - 1 : 0

  const xAxisProps = {
    dataKey: 'dateLabel',
    tick: { fontSize: 10 },
    angle: data.length > 20 ? -45 : 0,
    textAnchor: data.length > 20 ? 'end' : 'middle',
    height: data.length > 20 ? 55 : 30,
    interval,
  } as const

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">{cfg.title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        {cfg.type === 'line' ? (
          <LineChart data={chartData} margin={{ bottom: data.length > 20 ? 20 : 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis {...xAxisProps} />
            <YAxis tick={{ fontSize: 11 }} width={45} />
            <Tooltip formatter={(v) => (typeof v === 'number' ? v.toLocaleString('pt-BR') : v)} />
            <Legend />
            {cfg.lines.map((l) => (
              <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} dot={false} strokeWidth={2} />
            ))}
          </LineChart>
        ) : (
          <BarChart data={chartData} margin={{ bottom: data.length > 20 ? 20 : 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis {...xAxisProps} />
            <YAxis tick={{ fontSize: 11 }} width={45} />
            <Tooltip formatter={(v) => (typeof v === 'number' ? v.toLocaleString('pt-BR') : v)} />
            <Legend />
            {cfg.lines.map((l) => (
              <Bar key={l.key} dataKey={l.key} name={l.name} fill={l.color} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
