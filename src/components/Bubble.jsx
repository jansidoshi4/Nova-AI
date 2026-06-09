import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { format } from 'sql-formatter'
import Avatar from './Avatar'
import Doodle from './Doodles'
import ErDiagramBlock from './ErDiagramBlock'
import { ER_DIAGRAM_PREFIX, SQL_WELCOME_TEXT } from '../utils/erDiagram'

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
  const isErDiagram = msg.text?.startsWith(ER_DIAGRAM_PREFIX)
  const cleanText = isErDiagram
    ? msg.text.slice(ER_DIAGRAM_PREFIX.length)
    : stripConfTag(msg.text)

  // Show updated welcome for older persisted sessions
  const displayText = (
    !isUser &&
    !isErDiagram &&
    msg.doodle &&
    cleanText?.includes('send me images')
  ) ? SQL_WELCOME_TEXT : cleanText

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
            {isErDiagram ? (
              <div className="bubble-er">
                <p className="bubble-er-caption">Here&apos;s your ER diagram:</p>
                <ErDiagramBlock source={cleanText} />
              </div>
            ) : isSQL ? (
              <SQLBlock sql={formattedSQL} />
            ) : displayText?.startsWith('⚠️') ? (
              <span className="bubble-error">
                <Doodle name="warning" size={18} className="doodle--inline" />
                {displayText.replace(/^⚠️\s*/, '')}
              </span>
            ) : msg.doodle ? (
              <div className="bubble-welcome">
                <Doodle name={msg.doodle} size={26} />
                <ReactMarkdown>{displayText}</ReactMarkdown>
              </div>
            ) : (
              <ReactMarkdown>{displayText}</ReactMarkdown>
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