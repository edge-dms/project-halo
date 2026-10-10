import { useEffect, useRef, useState } from 'react'

// Full-screen, dim, one-purpose page for 3am ideas. Open it at #capture.
export default function CapturePage({ store }) {
  const [v, setV] = useState('')
  const [recent, setRecent] = useState([])
  const ref = useRef(null)
  useEffect(() => ref.current?.focus(), [])

  const save = () => {
    const lines = v.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) return
    store.addTasks(lines, { source: 'capture' })
    setRecent((r) => [...lines, ...r].slice(0, 6))
    setV('')
    ref.current?.focus()
  }

  return (
    <div className="nightcap">
      <p>Get it out of your head. It'll be in your Inbox at coffee time.</p>
      <textarea
        ref={ref}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            save()
          }
        }}
        placeholder="What's the thought?"
        rows={4}
      />
      <button onClick={save}>Save it</button>
      {recent.length > 0 && (
        <ul>
          {recent.map((r, i) => <li key={i}>✓ {r}</li>)}
        </ul>
      )}
      <a href="#" onClick={() => { window.location.hash = '' }}>Open planner</a>
    </div>
  )
}
