import { useCallback, useEffect, useState } from 'react'

const KEY = 'halo-planner-v1'
const EMPTY = { goals: [], tasks: [], notes: {} }

const load = () => {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    return EMPTY
  }
}

export const uid = () => Math.random().toString(36).slice(2, 10)

/**
 * Data model
 *   goals: { id, level: 'year'|'campaign'|'week', period, parentId, title, target, done }
 *     period: '2026' | '2026-C3' | '2026-10-05' (Monday of the week)
 *   tasks: { id, date, title, done, priority, goalId, start, mins }
 *   notes: { [key]: string }  e.g. 'day:2026-10-10:intent', 'week:2026-10-05:review'
 */
export function useStore() {
  const [state, setState] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable; keep working in memory */
    }
  }, [state])

  const addGoal = useCallback(
    (goal) => setState((s) => ({ ...s, goals: [...s.goals, { id: uid(), done: false, ...goal }] })),
    []
  )
  const updateGoal = useCallback(
    (id, patch) =>
      setState((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
    []
  )
  const removeGoal = useCallback(
    (id) =>
      setState((s) => {
        // Remove the goal and everything beneath it; tasks just lose their link.
        const doomed = new Set([id])
        let grew = true
        while (grew) {
          grew = false
          for (const g of s.goals) {
            if (!doomed.has(g.id) && doomed.has(g.parentId)) {
              doomed.add(g.id)
              grew = true
            }
          }
        }
        return {
          ...s,
          goals: s.goals.filter((g) => !doomed.has(g.id)),
          tasks: s.tasks.map((t) => (doomed.has(t.goalId) ? { ...t, goalId: null } : t)),
        }
      }),
    []
  )

  const addTask = useCallback(
    (task) => setState((s) => ({ ...s, tasks: [...s.tasks, { id: uid(), done: false, ...task }] })),
    []
  )
  const updateTask = useCallback(
    (id, patch) =>
      setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
    []
  )
  const removeTask = useCallback(
    (id) => setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })),
    []
  )

  const setNote = useCallback(
    (key, value) => setState((s) => ({ ...s, notes: { ...s.notes, [key]: value } })),
    []
  )

  const replaceAll = useCallback((next) => setState({ ...EMPTY, ...next }), [])

  return { state, addGoal, updateGoal, removeGoal, addTask, updateTask, removeTask, setNote, replaceAll }
}
