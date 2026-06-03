import React, { useEffect, useRef } from 'react'
import Bubble from './Bubble'

export default function MessageList({ messages, typing }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  return (
    <div className="messages" role="log" aria-live="polite" aria-label="Chat messages">
      <div className="ts">Today, just now</div>
      {messages.map(msg => (
        <Bubble key={msg.id} msg={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
