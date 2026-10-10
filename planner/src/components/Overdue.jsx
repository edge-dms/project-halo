import { TriageButtons, CatDot } from './Triage.jsx'
import { isOverdue } from '../lib/tasks.js'
import { fmtShort } from '../lib/dates.js'

export default function Overdue({ store }) {
  const late = store.state.tasks.filter(isOverdue).sort((a, b) => a.date.localeCompare(b.date))
  if (!late.length) return null
  return (
    <section className="card overdue">
      <h2>⚠ Overdue · {late.length}</h2>
      <ul className="list">
        {late.map((t) => (
          <li key={t.id} className="inboxrow">
            <div className="grow">
              <div>{t.title} <span className="chip">was {fmtShort(t.date)}</span> <CatDot store={store} id={t.category} /></div>
              <TriageButtons task={t} store={store} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
