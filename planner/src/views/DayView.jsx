import { useState } from 'react'
import { weekStart, fmtDay } from '../lib/dates.js'
import Overdue from '../components/Overdue.jsx'
import { CatDot } from '../components/Triage.jsx'

export default function DayView({ store, date }) {
  const { tasks, goals, notes } = store.state
  const w = weekStart(date)
  const weekGoals = goals.filter((g) => g.level === 'week' && g.period === w)
  const dayTasks = tasks.filter((t) => t.date === date)
  const priorities = dayTasks.filter((t) => t.priority)
  const scheduled = dayTasks.filter((t) => t.start).sort((a, b) => a.start.localeCompare(b.start))
  const rest = dayTasks.filter((t) => !t.priority && !t.start)

  const [title, setTitle] = useState('')
  const [start, setStart] = useState('')
  const [mins, setMins] = useState('')
  const [goalId, setGoalId] = useState('')
  const [priority, setPriority] = useState(false)
  const [category, setCategory] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    store.addTask({
      date,
      title: title.trim(),
      start: start || null,
      mins: mins ? Number(mins) : null,
      goalId: goalId || null,
      priority,
      category: category || null,
      source: 'manual',
    })
    setTitle('')
    setStart('')
    setMins('')
    setPriority(false)
  }

  const Row = ({ t }) => (
    <li className={t.done ? 'done' : ''} style={{ '--cat': store.state.categories.find((c) => c.id === t.category)?.color || 'transparent' }} data-cat>
      <input type="checkbox" checked={t.done} onChange={() => store.updateTask(t.id, { done: !t.done })} />
      <span className="grow">
        {t.start && <em>{t.start}{t.mins ? ` (${t.mins}m)` : ''} </em>}
        {t.title} <CatDot store={store} id={t.category} />
        {t.goalId && goals.find((g) => g.id === t.goalId) && <span className="chip">↑ {goals.find((g) => g.id === t.goalId).title}</span>}
      </span>
      <button className="star" onClick={() => store.updateTask(t.id, { priority: !t.priority })} aria-label="Toggle priority">
        {t.priority ? '★' : '☆'}
      </button>
      <button className="x" onClick={() => store.removeTask(t.id)} aria-label="Delete">×</button>
    </li>
  )

  const intentKey = `day:${date}:intent`
  const reviewKey = `day:${date}:review`

  return (
    <div className="stack">
      <Overdue store={store} />
      <section className="card">
        <h2>{fmtDay(date)}</h2>
        <label className="field">
          <span>Intention — what must be true by tonight?</span>
          <input value={notes[intentKey] || ''} onChange={(e) => store.setNote(intentKey, e.target.value)} />
        </label>
      </section>

      <form className="card add" onSubmit={submit}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task…" />
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        <input className="narrow" type="number" min="5" step="5" value={mins} onChange={(e) => setMins(e.target.value)} placeholder="min" />
        <select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
          <option value="">Weekly outcome…</option>
          {weekGoals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Category…</option>
          {store.state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} /> ★ top</label>
        <button type="submit">Add</button>
      </form>

      <div className="grid2">
        <section className="card">
          <h2>Top priorities</h2>
          <ul className="list">{priorities.map((t) => <Row key={t.id} t={t} />)}{!priorities.length && <li className="empty">Star up to 3 tasks.</li>}</ul>
          <h2>Other tasks</h2>
          <ul className="list">{rest.map((t) => <Row key={t.id} t={t} />)}{!rest.length && <li className="empty">None.</li>}</ul>
        </section>
        <section className="card">
          <h2>Schedule</h2>
          <ul className="list">{scheduled.map((t) => <Row key={t.id} t={t} />)}{!scheduled.length && <li className="empty">Give a task a start time to block it here.</li>}</ul>
        </section>
      </div>

      <section className="card">
        <h2>End-of-day review</h2>
        <textarea rows={3} value={notes[reviewKey] || ''} onChange={(e) => store.setNote(reviewKey, e.target.value)} placeholder="What got done? What carries over?" />
      </section>
    </div>
  )
}
