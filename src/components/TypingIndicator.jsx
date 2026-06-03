import React from 'react'
import Avatar from './Avatar'

export default function TypingIndicator() {
  return (
    <div className="msg-row" aria-label="Nova is typing">
      <Avatar role="bot" />
      <div className="typing">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
