import GoalList from '../GoalList.jsx'
import { campaignOf, weeksOfCampaign, fmtShort, addDays, today, weekStart } from '../lib/dates.js'

export default function CampaignView({ store, date, onOpenWeek }) {
  const c = campaignOf(date)
  const goals = store.state.goals
  const yearGoals = goals.filter((g) => g.level === 'year' && g.period === String(c.year))
  const mine = goals.filter((g) => g.level === 'campaign' && g.period === c.key)
  const thisWeek = weekStart(today())

  return (
    <div className="stack">
      <GoalList
        title={`${c.name} goals · ${c.span} ${c.year}`}
        hint="What this 4-month campaign must deliver. Link each to a yearly goal."
        goals={mine}
        parentOptions={yearGoals}
        parentLabel="Yearly goal…"
        store={store}
        level="campaign"
        period={c.key}
      />
      <section className="card">
        <h2>Month focus</h2>
        <div className="grid4">
          {c.months.map((m) => {
            const key = `month:${c.year}-${m.month}:focus`
            return (
              <label key={m.month} className="field">
                <span>{m.label}</span>
                <textarea
                  rows={3}
                  value={store.state.notes[key] || ''}
                  onChange={(e) => store.setNote(key, e.target.value)}
                  placeholder="Theme / milestone"
                />
              </label>
            )
          })}
        </div>
      </section>
      <section className="card">
        <h2>Weeks</h2>
        <ul className="weeks">
          {weeksOfCampaign(c).map((w, i) => {
            const wg = goals.filter((g) => g.level === 'week' && g.period === w)
            return (
              <li key={w}>
                <button className={w === thisWeek ? 'now' : ''} onClick={() => onOpenWeek(w)}>
                  <strong>Wk {i + 1}</strong>
                  <span>{fmtShort(w)}–{fmtShort(addDays(w, 6))}</span>
                  <small>{wg.length ? `${wg.filter((g) => g.done).length}/${wg.length} outcomes` : 'unplanned'}</small>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
