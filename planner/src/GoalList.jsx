import { useState } from 'react'

// Goals at one level for one period, optionally linked to a parent goal one level up.
export default function GoalList({ title, hint, goals, parentOptions, parentLabel, store, level, period, children }) {
  const [text, setText] = useState('')
  const [target, setTarget] = useState('')
  const [parentId, setParentId] = useState('')
  const byId = Object.fromEntries(store.state.goals.map((g) => [g.id, g]))

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    store.addGoal({ level, period, title: text.trim(), target: target.trim(), parentId: parentId || null })
    setText('')
    setTarget('')
  }

  const progress = (g) => {
    const kids = store.state.goals.filter((k) => k.parentId === g.id)
    const tasks = store.state.tasks.filter((t) => t.goalId === g.id)
    const all = [...kids, ...tasks]
    return all.length ? `${all.filter((x) => x.done).length}/${all.length}` : null
  }

  return (
    <section className="card">
      <h2>{title}</h2>
      {hint && <p className="hint">{hint}</p>}
      <ul className="list">
        {goals.map((g) => (
          <li key={g.id} className={g.done ? 'done' : ''}>
            <input type="checkbox" checked={g.done} onChange={() => store.updateGoal(g.id, { done: !g.done })} />
            <span className="grow">
              {g.title}
              {g.target && <span className="chip target">{g.target}</span>}
              {g.parentId && byId[g.parentId] && <span className="chip">↑ {byId[g.parentId].title}</span>}
              {progress(g) && <span className="chip">{progress(g)}</span>}
            </span>
            <button className="x" onClick={() => store.removeGoal(g.id)} aria-label="Delete">×</button>
          </li>
        ))}
        {!goals.length && <li className="empty">Nothing yet.</li>}
      </ul>
      <form className="add" onSubmit={submit}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a goal…" />
        <input className="narrow" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target (e.g. 40 demos)" />
        {parentOptions && (
          <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">{parentLabel || 'Link to…'}</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        )}
        <button type="submit">Add</button>
      </form>
      {children}
    </section>
  )
}
