import React, { useState, useEffect, useRef } from 'react'

function toTitle(text) {
  if (!text?.trim()) return 'New Chat'
  const t = text.trim()
  return t.length > 30 ? `${t.slice(0, 30)}…` : t
}

/**
 * Reveals the session title character-by-character when the target changes.
 */
export default function StreamingSessionLabel({ target, animate = true }) {
  const fullTarget = toTitle(target)
  const [display, setDisplay] = useState(fullTarget)
  const displayRef = useRef(fullTarget)
  const prevTargetRef = useRef(fullTarget)

  useEffect(() => {
    displayRef.current = display
  }, [display])

  useEffect(() => {
    if (!animate) {
      setDisplay(fullTarget)
      prevTargetRef.current = fullTarget
      return
    }

    if (fullTarget === prevTargetRef.current) return

    // Snap back to "New Chat" when input is cleared
    if (fullTarget === 'New Chat') {
      setDisplay('New Chat')
      prevTargetRef.current = fullTarget
      return
    }

    const startFrom = fullTarget.startsWith(displayRef.current)
      ? displayRef.current.length
      : 0

    if (startFrom === 0) setDisplay('')

    let i = startFrom
    const timer = setInterval(() => {
      i += 1
      const next = fullTarget.slice(0, i)
      setDisplay(next)
      if (i >= fullTarget.length) {
        clearInterval(timer)
        prevTargetRef.current = fullTarget
      }
    }, 28)

    return () => clearInterval(timer)
  }, [fullTarget, animate])

  return <span className="session-label">{display || 'New Chat'}</span>
}
