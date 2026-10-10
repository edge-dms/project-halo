import { useState } from 'react'
import { CategoryChips, TriageButtons } from '../components/Triage.jsx'
import { isInbox, byCreated } from '../lib/tasks.js'

export default function InboxView({ store }) {
  const inbox = store.state.tasks.filter(isInbox).sort(byCreated)
  const someday = store.state.tasks.filter((t) => t.someday && !t.done)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#64748b')

  return (
    <div className="stack">
      <section className="card">
        <h2>Inbox · {inbox.length}</h2>
        <p className="hint">Everything you captured and haven't decided on. Nothing here is lost.</p>
        <ul className="list">
          {inbox.map((t) => (
            <li key={t.id} className="inboxrow">
              <div className="grow">
                <div>{t.title} {t.source === 'email' && <span className="chip">email</span>}</div>
                <CategoryChips store={store} value={t.category} onChange={(c) => store.updateTask(t.id, { category: c })} />
                <TriageButtons task={t} store={store} />
              </div>
            </li>
          ))}
          {!inbox.length && <li className="empty">Inbox zero. 🎉</li>}
        </ul>
      </section>

      {someday.length > 0 && (
        <section className="card">
          <h2>Someday / maybe · {someday.length}</h2>
          <ul className="list">
            {someday.map((t) => (
              <li key={t.id}>
                <span className="grow">{t.title}</span>
                <button onClick={() => store.updateTask(t.id, { someday: false })}>Back to Inbox</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Categories</h2>
        <ul className="list">
          {store.state.categories.map((c) => (
            <li key={c.id}>
              <input type="color" value={c.color} onChange={(e) => store.updateCategory(c.id, { color: e.target.value })} />
              <input className="grow" value={c.name} onChange={(e) => store.updateCategory(c.id, { name: e.target.value })} />
              <button className="x" onClick={() => store.removeCategory(c.id)} aria-label="Delete">×</button>
            </li>
          ))}
        </ul>
        <form
          className="add"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) store.addCategory(name.trim(), color)
            setName('')
          }}
        >
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category…" />
          <button type="submit">Add</button>
        </form>
      </section>
    </div>
  )
}
