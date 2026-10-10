import { useState, useRef, useEffect } from 'react'
import { useStore } from './lib/store.js'
import { today, addDays, weekStart, campaignOf, campaign, fmtDay, fmtShort } from './lib/dates.js'
import DayView from './views/DayView.jsx'
import WeekView from './views/WeekView.jsx'
import CampaignView from './views/CampaignView.jsx'
import YearView from './views/YearView.jsx'
import InboxView from './views/InboxView.jsx'
import MorningView from './views/MorningView.jsx'
import CapturePage from './CapturePage.jsx'
import CaptureBar from './components/CaptureBar.jsx'
import { isInbox, isOverdue } from './lib/tasks.js'

const VIEWS = ['Morning', 'Inbox', 'Day', 'Week', 'Campaign', 'Year']
const PERIODIC = ['Day', 'Week', 'Campaign', 'Year']

export default function App() {
  const store = useStore()
  const [view, setView] = useState(() => (store.state.notes[`morning:${today()}`] ? 'Day' : 'Morning'))
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const [date, setDate] = useState(today())
  const fileRef = useRef(null)
  const year = Number(date.slice(0, 4))
  const inboxCount = store.state.tasks.filter(isInbox).length
  const overdueCount = store.state.tasks.filter(isOverdue).length

  if (hash === '#capture') return <CapturePage store={store} />

  const shift = (dir) => {
    if (view === 'Day') setDate(addDays(date, dir))
    else if (view === 'Week') setDate(addDays(date, 7 * dir))
    else if (view === 'Campaign') {
      const c = campaignOf(date)
      const idx = c.index + dir
      const y = idx < 1 ? c.year - 1 : idx > 3 ? c.year + 1 : c.year
      setDate(campaign(y, ((idx + 2) % 3) + 1).start)
    } else setDate(`${year + dir}-01-01`)
  }

  const label = () => {
    if (view === 'Day') return fmtDay(date)
    if (view === 'Week') return `Week of ${fmtShort(weekStart(date))}`
    if (view === 'Campaign') {
      const c = campaignOf(date)
      return `${c.name} · ${c.span} ${c.year}`
    }
    return String(year)
  }

  const go = (v, d) => {
    setView(v)
    setDate(d)
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(store.state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `halo-planner-${today()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importData = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      store.replaceAll(JSON.parse(await file.text()))
    } catch {
      alert('That file could not be read.')
    }
    e.target.value = ''
  }

  return (
    <div className="app">
      <header>
        <h1>Halo Planner</h1>
        <nav>
          {VIEWS.map((v) => (
            <button key={v} className={v === view ? 'active' : ''} onClick={() => setView(v)}>
              {v === 'Morning' ? '☕ Morning' : v}
              {v === 'Inbox' && inboxCount > 0 && <span className="badge">{inboxCount}</span>}
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <button onClick={exportData}>Export</button>
        <button onClick={() => fileRef.current.click()}>Import</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={importData} />
      </header>
      <CaptureBar store={store} />
      {overdueCount > 0 && view !== 'Morning' && (
        <button className="overduebanner" onClick={() => go('Day', today())}>
          ⚠ {overdueCount} overdue — tap to deal with {overdueCount === 1 ? 'it' : 'them'}
        </button>
      )}
      {PERIODIC.includes(view) && <div className="pager">
        <button onClick={() => shift(-1)} aria-label="Previous">‹</button>
        <strong>{label()}</strong>
        <button onClick={() => shift(1)} aria-label="Next">›</button>
        <button onClick={() => setDate(today())}>Today</button>
      </div>}
      <main>
        {view === 'Morning' && <MorningView store={store} onFinish={() => go('Day', today())} />}
        {view === 'Inbox' && <InboxView store={store} />}
        {view === 'Day' && <DayView store={store} date={date} />}
        {view === 'Week' && <WeekView store={store} date={date} onOpenDay={(d) => go('Day', d)} />}
        {view === 'Campaign' && <CampaignView store={store} date={date} onOpenWeek={(w) => go('Week', w)} />}
        {view === 'Year' && <YearView store={store} year={year} onOpenCampaign={(d) => go('Campaign', d)} />}
      </main>
    </div>
  )
}
