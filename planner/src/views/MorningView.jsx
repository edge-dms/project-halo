import { useState } from 'react'
import { CategoryChips, TriageButtons } from '../components/Triage.jsx'
import { isInbox, isOverdue, byCreated } from '../lib/tasks.js'
import { today, fmtDay, fmtShort } from '../lib/dates.js'

const STEPS = ['Brain dump', 'Inbox', 'Overdue', 'Top 3']

// Coffee-time routine: one thing on screen at a time.
export default function MorningView({ store, onFinish }) {
  const [step, setStep] = useState(0)
  const [dump, setDump] = useState('')
  const tasks = store.state.tasks
  const inbox = tasks.filter(isInbox).sort(byCreated)
  const late = tasks.filter(isOverdue).sort((a, b) => a.date.localeCompare(b.date))
  const t0 = today()
  const todays = tasks.filter((t) => t.date === t0 && !t.done)
  const starred = todays.filter((t) => t.priority).length

  const next = () => setStep((s) => s + 1)

  const addDump = () => {
    const lines = dump.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length) store.addTasks(lines, { source: 'dump' })
    setDump('')
    next()
  }

  return (
    <div className="stack morning">
      <ol className="steps">
        {STEPS.map((s, i) => <li key={s} className={i === step ? 'on' : i < step ? 'past' : ''}>{s}</li>)}
      </ol>

      {step === 0 && (
        <section className="card big">
          <h2>☕ {fmtDay(t0)}</h2>
          <h3>What's in your head right now?</h3>
          <p className="hint">One per line. Don't organize, don't judge — just get it out.</p>
          <textarea autoFocus rows={8} value={dump} onChange={(e) => setDump(e.target.value)} placeholder={'call the accountant\nbook the dentist\nidea: follow-up text for last month\'s demos'} />
          <div className="nav"><button className="primary" onClick={addDump}>{dump.trim() ? 'Save & continue' : 'Nothing new — continue'}</button></div>
        </section>
      )}

      {step === 1 && (
        <section className="card big">
          <h2>Inbox · {inbox.length} left</h2>
          {inbox[0] ? (
            <>
              <h3 className="focus">{inbox[0].title}</h3>
              <p className="hint">{inbox[0].source === 'capture' ? 'Captured on the go' : ''}</p>
              <CategoryChips store={store} value={inbox[0].category} onChange={(c) => store.updateTask(inbox[0].id, { category: c })} />
              <TriageButtons task={inbox[0]} store={store} />
            </>
          ) : (
            <h3 className="focus">Inbox zero. 🎉</h3>
          )}
          <div className="nav"><button className="primary" onClick={next}>{inbox.length ? 'Skip the rest for now' : 'Continue'}</button></div>
        </section>
      )}

      {step === 2 && (
        <section className="card big">
          <h2>Overdue · {late.length} left</h2>
          {late[0] ? (
            <>
              <h3 className="focus">{late[0].title}</h3>
              <p className="hint">Was due {fmtShort(late[0].date)}. No guilt — just decide.</p>
              <TriageButtons task={late[0]} store={store} />
            </>
          ) : (
            <h3 className="focus">Nothing slipping. ✅</h3>
          )}
          <div className="nav"><button className="primary" onClick={next}>{late.length ? 'Skip the rest for now' : 'Continue'}</button></div>
        </section>
      )}

      {step === 3 && (
        <section className="card big">
          <h2>Pick your top 3 · {starred}/3</h2>
          <p className="hint">If only these got done today, it was a good day. Tap ★.</p>
          <ul className="list">
            {todays.map((t) => (
              <li key={t.id}>
                <button className="star" onClick={() => store.updateTask(t.id, { priority: !t.priority })}>{t.priority ? '★' : '☆'}</button>
                <span className="grow">{t.title}</span>
              </li>
            ))}
            {!todays.length && <li className="empty">Nothing scheduled for today yet — go back and send things to Today.</li>}
          </ul>
          <div className="nav">
            <button onClick={() => setStep(1)}>← Back to Inbox</button>
            <button className="primary" onClick={() => { store.setNote(`morning:${t0}`, 'done'); onFinish() }}>Start my day →</button>
          </div>
        </section>
      )}
    </div>
  )
}
