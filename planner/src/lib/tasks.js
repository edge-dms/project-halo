import { addDays, today } from './dates.js'

export const isInbox = (t) => !t.done && !t.date && !t.someday
export const isOverdue = (t) => !t.done && !!t.date && t.date < today()
export const byCreated = (a, b) => (a.created || '').localeCompare(b.created || '')

export const catOf = (store, id) => store.state.categories.find((c) => c.id === id)

// Next Monday strictly after today.
export const nextMonday = () => {
  const d = new Date()
  return addDays(today(), ((8 - d.getDay()) % 7) || 7)
}
