'use client'

import { useState } from 'react'
import { COLOR } from '@/lib/theme'

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return { year: y, month: m, day: d }
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

interface Props {
  startDate: string
  endDate:   string
  onChange:  (start: string, end: string) => void
}

export function DateRangePicker({ startDate, endDate, onChange }: Props) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2020 + 1 }, (_, i) => 2020 + i)

  const [s, setS] = useState(parseISO(startDate))
  const [e, setE] = useState(parseISO(endDate))

  function clampDay(year: number, month: number, day: number) {
    return Math.min(day, daysInMonth(year, month))
  }

  function updateStart(field: 'year' | 'month' | 'day', val: number) {
    const next = { ...s, [field]: val }
    next.day = clampDay(next.year, next.month, next.day)
    setS(next)
  }

  function updateEnd(field: 'year' | 'month' | 'day', val: number) {
    const next = { ...e, [field]: val }
    next.day = clampDay(next.year, next.month, next.day)
    setE(next)
  }

  function apply() {
    const start = toISO(s.year, s.month, s.day)
    const end   = toISO(e.year, e.month, e.day)
    if (start <= end) onChange(start, end)
  }

  const sel: React.CSSProperties = {
    border: '1px solid #E5E7EB', borderRadius: 6,
    padding: '0.3rem 0.4rem', fontSize: '0.8rem',
    color: '#374151', background: '#fff', cursor: 'pointer', outline: 'none',
  }

  const label: React.CSSProperties = {
    fontSize: '0.75rem', fontWeight: 700, color: '#6B7280',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
      <span style={label}>DE</span>
      <select value={s.year}  onChange={(ev) => updateStart('year',  Number(ev.target.value))} style={sel}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <select value={s.month} onChange={(ev) => updateStart('month', Number(ev.target.value))} style={sel}>
        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
      </select>
      <select value={s.day}   onChange={(ev) => updateStart('day',   Number(ev.target.value))} style={sel}>
        {Array.from({ length: daysInMonth(s.year, s.month) }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{String(d).padStart(2, '0')}</option>
        ))}
      </select>

      <span style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>→</span>

      <span style={label}>ATÉ</span>
      <select value={e.year}  onChange={(ev) => updateEnd('year',  Number(ev.target.value))} style={sel}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <select value={e.month} onChange={(ev) => updateEnd('month', Number(ev.target.value))} style={sel}>
        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
      </select>
      <select value={e.day}   onChange={(ev) => updateEnd('day',   Number(ev.target.value))} style={sel}>
        {Array.from({ length: daysInMonth(e.year, e.month) }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{String(d).padStart(2, '0')}</option>
        ))}
      </select>

      <button onClick={apply}
        style={{
          background: COLOR.ORANGE, color: '#fff', border: 'none',
          borderRadius: 8, padding: '0.38rem 1rem',
          fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
        }}>
        Aplicar
      </button>
    </div>
  )
}
