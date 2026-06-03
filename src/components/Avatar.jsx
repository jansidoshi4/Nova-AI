import React from 'react'

export default function Avatar({ role }) {
  return (
    <div className={`msg-avatar ${role === 'bot' ? 'bot-av' : 'user-av'}`}>
      <i
        className={`ti ti-${role === 'bot' ? 'robot' : 'user'}`}
        aria-hidden="true"
      />
    </div>
  )
}
