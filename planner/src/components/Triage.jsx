import { addDays, today } from '../lib/dates.js'
import { nextMonday } from '../lib/tasks.js'

// One-tap category picker. Tapping the active category clears it.
export function CategoryChips({ store, value, onChange }) {
  return (
    <div className="catchips">
      {store.state.categories.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`catchip ${value === c.id ? 'on' : ''}`}
          style={{ '--cat': c.color }}
          onClick={() => onChange(value === c.id ? null : c.id)}
        >
          {c.name}
        </button>
      ))}
    </div>
  )
}

export function CatDot({ store, id }) {
  const c = store.state.categories.find((x) => x.id === id)
  if (!c) return null
  return <span className="catdot" style={{ '--cat': c.color }} title={c.name}>{c.name}</span>
}

// Decide-in-one-tap buttons for an inbox or overdue task.
export function TriageButtons({ task, store, onDone }) {
  const set = (patch) => {
    store.updateTask(task.id, patch)
    onDone?.()
  }
  return (
    <div className="triage">
      <button className="primary" onClick={() => set({ date: today(), someday: false })}>Today</button>
      <button onClick={() => set({ date: addDays(today(), 1), someday: false })}>Tomorrow</button>
      <button onClick={() => set({ date: nextMonday(), someday: false })}>Next week</button>
      <input
        type="date"
        aria-label="Pick a date"
        onChange={(e) => e.target.value && set({ date: e.target.value, someday: false })}
      />
      <button onClick={() => set({ date: null, someday: true })}>Someday</button>
      <button onClick={() => set({ done: true })}>Done</button>
      <button className="danger" onClick={() => { store.removeTask(task.id); onDone?.() }}>Drop</button>
    </div>
  )
}
