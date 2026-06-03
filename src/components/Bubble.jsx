import React from 'react'
import ReactMarkdown from 'react-markdown'
import { format } from 'sql-formatter'
import Avatar from './Avatar'


function formatTime(id) {
  const date = id ? new Date(id) : new Date()
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  const isTyping = !isUser && !msg.text
  const isSQL =
  !isUser &&
  msg.text &&
  /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(
    msg.text.trim()
  )
  let formattedSQL = msg.text
  if (isSQL) {
    try {
      formattedSQL = format(msg.text, { language: 'mysql' })
    } catch (e) {
      formattedSQL = msg.text
    }
  }

  return (
    <div className={`msg-row${isUser ? ' user' : ''}`}>
      <Avatar role={msg.role} />
      <div className="bubble-wrap">
        {isTyping ? (
          <div className="typing">
            <span /><span /><span />
          </div>
        ) : (
          <div className={`bubble ${isUser ? 'user-bubble' : 'bot-bubble'}`}>
            {isUser && msg.previewUrl && (
              <img src={msg.previewUrl} alt="Attached" className="bubble-img" />
            )}
            {isSQL ? (
              <pre className="sql-block">
               <code>{formattedSQL}</code>
              </pre>
            ) : (
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            )}
          </div>
        )}
        <span className="msg-time">{formatTime(msg.id)}</span>
      </div>
    </div>
  )
}
