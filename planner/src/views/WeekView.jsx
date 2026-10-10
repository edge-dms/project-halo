import { useState } from 'react'
import GoalList from '../GoalList.jsx'
import { CatDot } from '../components/Triage.jsx'
import { weekDays, weekStart, weekCampaignKey, dayName, fmtShort, today, addDays } from '../lib/dates.js'

export default function WeekView({ store, date, onOpenDay }) {
  const w = weekStart(date)
  const days = weekDays(w)
  const ck = weekCampaignKey(w)
  const goals = store.state.goals
  const campaignGoals = goals.filter((g) => g.level === 'campaign' && g.period === ck)
  const outcomes = goals.filter((g) => g.level === 'week' && g.period === w)
  const reviewKey = `week:${w}:review`

  return (
    <div className="stack">
      <GoalList
        title={`Outcomes · ${fmtShort(w)}–${fmtShort(addDays(w, 6))}`}
        hint="2–4 results that make this week a win. Link to a campaign goal."
        goals={outcomes}
        parentOptions={campaignGoals}
        parentLabel="Campaign goal…"
        store={store}
        level="week"
        period={w}
      />
      <section className="card">
        <h2>Days</h2>
        <div className="grid7">
          {days.map((d) => {
            const tasks = store.state.tasks.filter((t) => t.date === d).sort((a, b) => (a.start || '99').localeCompare(b.start || '99'))
            return (
              <div key={d} className={`daycol ${d === today() ? 'now' : ''}`}>
                <button className="dayhead" onClick={() => onOpenDay(d)}>
                  {dayName(d)} <small>{fmtShort(d)}</small>
                </button>
                <ul className="mini">
                  {tasks.map((t) => (
                    <li key={t.id} className={t.done ? 'done' : ''}>
                      {t.priority && '★ '}{t.start && <em>{t.start} </em>}{t.title} <CatDot store={store} id={t.category} />
                    </li>
                  ))}
                  {!tasks.length && <li className="empty">—</li>}
                </ul>
                <QuickAdd onAdd={(title) => store.addTask({ date: d, title })} />
              </div>
            )
          })}
        </div>
      </section>
      <section className="card">
        <h2>Weekly review</h2>
        <textarea
          rows={4}
          value={store.state.notes[reviewKey] || ''}
          onChange={(e) => store.setNote(reviewKey, e.target.value)}
          placeholder="Wins, misses, what to change next week…"
        />
      </section>
    </div>
  )
}

function QuickAdd({ onAdd }) {
  const [v, setV] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (v.trim()) onAdd(v.trim())
        setV('')
      }}
    >
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="+ task" />
    </form>
  )
}
