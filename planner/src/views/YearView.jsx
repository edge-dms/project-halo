import GoalList from '../GoalList.jsx'
import { campaignsOfYear, campaignOf, today } from '../lib/dates.js'

export default function YearView({ store, year, onOpenCampaign }) {
  const goals = store.state.goals
  const current = campaignOf(today()).key
  return (
    <div className="stack">
      <GoalList
        title={`${year} goals`}
        hint="The few things that would make this year a success."
        goals={goals.filter((g) => g.level === 'year' && g.period === String(year))}
        store={store}
        level="year"
        period={String(year)}
      />
      <div className="grid3">
        {campaignsOfYear(year).map((c) => {
          const cg = goals.filter((g) => g.level === 'campaign' && g.period === c.key)
          return (
            <button key={c.key} className={`card campaign ${c.key === current ? 'now' : ''}`} onClick={() => onOpenCampaign(c.start)}>
              <h3>{c.name} · {c.span}</h3>
              {c.key === current && <span className="chip target">current</span>}
              <ul className="mini">
                {cg.slice(0, 5).map((g) => (
                  <li key={g.id} className={g.done ? 'done' : ''}>{g.title}{g.target ? ` — ${g.target}` : ''}</li>
                ))}
                {!cg.length && <li className="empty">No goals set</li>}
              </ul>
              <small>{cg.filter((g) => g.done).length}/{cg.length} done</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}
