import { useState } from 'react'

// Always-visible brain dump. Enter saves straight to the Inbox with zero decisions.
export default function CaptureBar({ store }) {
  const [v, setV] = useState('')
  const [flash, setFlash] = useState(false)
  return (
    <form
      className="capturebar"
      onSubmit={(e) => {
        e.preventDefault()
        if (!v.trim()) return
        store.addTask({ title: v.trim(), source: 'capture' })
        setV('')
        setFlash(true)
        setTimeout(() => setFlash(false), 900)
      }}
    >
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="🧠 Brain dump — type it, press Enter, move on" />
      {flash && <span className="saved">Saved to Inbox ✓</span>}
    </form>
  )
}
