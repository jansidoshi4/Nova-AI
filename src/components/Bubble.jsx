import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { format } from 'sql-formatter'
import Avatar from './Avatar'
import Doodle from './Doodles'

function formatTime(msg) {
  const date = msg.createdAt ? new Date(msg.createdAt) : new Date()
  if (isNaN(date)) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function stripConfTag(text) {
  if (!text) return text
  return text.replace(/__CONF:(high|medium|low)__/gi, '').trim()
}

function SQLBlock({ sql, onCopy, copied }) {
  return (
    <pre className="sql-block">
      <code>{sql}</code>
    </pre>
  )
}

export default function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  const isTyping = !isUser && !msg.text
  const cleanText = stripConfTag(msg.text)
  const [copied, setCopied] = useState(false)

  const isSQL =
    !isUser &&
    cleanText &&
    /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(cleanText.trim())

  let formattedSQL = cleanText
  if (isSQL) {
    try {
      formattedSQL = format(cleanText, { language: 'mysql' })
    } catch (e) {
      formattedSQL = cleanText
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(formattedSQL).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
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
              <SQLBlock sql={formattedSQL} />
            ) : cleanText?.startsWith('⚠️') ? (
              <span className="bubble-error">
                <Doodle name="warning" size={18} className="doodle--inline" />
                {cleanText.replace(/^⚠️\s*/, '')}
              </span>
            ) : msg.doodle ? (
              <div className="bubble-welcome">
                <Doodle name={msg.doodle} size={26} />
                <ReactMarkdown>{cleanText}</ReactMarkdown>
              </div>
            ) : (
              <ReactMarkdown>{cleanText}</ReactMarkdown>
            )}
          </div>
        )}
        <div className="msg-meta">
          <span className="msg-time">{formatTime(msg)}</span>
          {isSQL && (
            <button
              className={`sql-copy-btn ${copied ? 'sql-copy-btn--done' : ''}`}
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy SQL'}
            >
              <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}