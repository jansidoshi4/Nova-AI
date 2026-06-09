import React, { useState, useRef, useEffect } from 'react'
import { uploadPDF, getPDFChatReplyStream, deletePDF } from '../api/pdfApi'
import Avatar from './Avatar'
import Doodle from './Doodles'
import '../styles/pdfChat.css'

/**
 * We persist pdfInfo by storing it as a hidden system message in the session:
 *   { role: 'system', text: '__PDF_INFO__' + JSON.stringify(pdfInfo) }
 * On load we extract it from messages so pdfInfo survives page refresh / navigation.
 */
function extractPdfInfo(messages) {
  const sys = messages?.find(
    m => m.role === 'system' && m.text?.startsWith('__PDF_INFO__')
  )
  if (!sys) return null
  try { return JSON.parse(sys.text.slice('__PDF_INFO__'.length)) } catch { return null }
}

export default function PdfChatPanel({ theme = 'dark', activeSession, setMessages, activeId }) {
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [input, setInput]         = useState('')
  const [thinking, setThinking]   = useState(false)
  const [dragOver, setDragOver]   = useState(false)

  const fileInputRef = useRef(null)
  const bottomRef    = useRef(null)

  const messages = activeSession?.messages || []

  // Derive pdfInfo from session messages — survives navigation & page refresh
  const pdfInfo = extractPdfInfo(messages)

  // Visible chat messages (hide the system marker)
  const visibleMessages = messages.filter(m => m.role !== 'system')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visibleMessages, thinking])

  // When session changes, just clear upload error
  useEffect(() => {
    setUploadErr('')
  }, [activeId])

  async function processFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadErr('Please upload a valid PDF file.')
      return
    }
    setUploadErr('')
    setUploading(true)
    setMessages([]) // clear previous session messages
    try {
      const info = await uploadPDF(file)

      // Persist pdfInfo as a hidden system message so it survives reload
      const sysMsg = {
        id: crypto.randomUUID(),
        role: 'system',
        text: '__PDF_INFO__' + JSON.stringify(info),
        createdAt: new Date().toISOString(),
      }
      const welcomeMsg = {
        id: crypto.randomUUID(),
        role: 'bot',
        text: `**${info.filename}** uploaded successfully! Ask me anything about this document.`,
        doodle: 'document',
        confidence: null,
        createdAt: new Date().toISOString(),
      }
      setMessages([sysMsg, welcomeMsg])
    } catch (err) {
      setUploadErr(err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function handleDragOver(e) { e.preventDefault(); setDragOver(true) }
  function handleDragLeave(e) { e.preventDefault(); setDragOver(false) }
  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || thinking || !pdfInfo) return

    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      confidence: null,
      createdAt: new Date().toISOString(),
    }
    const botShell = {
      id: crypto.randomUUID(),
      role: 'bot',
      text: '',
      confidence: null,
      streaming: true,
      createdAt: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg, botShell])
    setInput('')
    setThinking(true)

    try {
      // Pass only visible messages as history (exclude system marker)
      const history = [...visibleMessages, userMsg].map(m => ({ role: m.role, text: m.text }))
      let confidenceSet = false
      let buffer = ''

      await getPDFChatReplyStream(pdfInfo.pdf_id, history, (chunk) => {
        setMessages(prev => {
          const updated = [...prev]
          const last = { ...updated[updated.length - 1] }

          if (!confidenceSet) {
            buffer += chunk
            const confMatch = buffer.match(/__CONF:(high|medium|low)__/)
            if (confMatch) {
              last.confidence = confMatch[1]
              confidenceSet = true
              last.text = buffer.replace(/__CONF:(high|medium|low)__/, '').trimStart()
              buffer = ''
            } else if (buffer.length > 30) {
              last.text = buffer.replace(/__CONF:(high|medium|low)__/g, '')
              buffer = ''
              confidenceSet = true
            }
          } else {
            last.text = (last.text + chunk).replace(/__CONF:(high|medium|low)__/g, '')
          }

          updated[updated.length - 1] = last
          return updated
        })
      })

      // Mark streaming done → triggers useChatHistory to persist to Supabase
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { ...updated[updated.length - 1], streaming: false }
        return updated
      })

    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          text: `⚠️ ${err.message}`,
          confidence: null,
          streaming: false,
        }
        return updated
      })
    } finally {
      setThinking(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleRemovePdf() {
    if (pdfInfo) await deletePDF(pdfInfo.pdf_id)
    setMessages([])
    setUploadErr('')
  }

  return (
    <div className="pdf-chat-panel" data-theme={theme}>

      {/* ── Header ── */}
      <div className="pdf-chat-header">
        <span className="pdf-chat-title">
          <Doodle name="document" size={20} />
          PDF Chat
        </span>
        {pdfInfo ? (
          <div className="pdf-badge">
            <span className="pdf-badge-name">{pdfInfo.filename}</span>
            <span className="pdf-badge-meta">{pdfInfo.pages}p</span>
            <button className="pdf-remove-btn" onClick={handleRemovePdf} title="Remove PDF">✕</button>
          </div>
        ) : (
          <button
            className="pdf-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Processing…' : (
              <><Doodle name="upload" size={16} className="doodle--inline" /> Upload PDF</>
            )}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {uploadErr && (
        <div className="pdf-error">
          <Doodle name="warning" size={18} />
          {uploadErr}
        </div>
      )}

      {/* ── Messages ── */}
      <div className="pdf-messages">

        {!pdfInfo && !uploading && (
          <div
            className={`pdf-drop-zone ${dragOver ? 'pdf-drop-zone--active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="pdf-drop-glow" />
            <div className="pdf-drop-icon-wrap">
              <Doodle name="document" size={56} />
            </div>
            <p className="pdf-drop-title">Drop your PDF here</p>
            <p className="pdf-drop-sub">or click to browse</p>
            <p className="pdf-drop-hint">Nova reads your PDF and answers questions about it</p>
          </div>
        )}

        {uploading && (
          <div className="pdf-processing">
            <div className="pdf-spinner" />
            <p>Reading PDF…</p>
          </div>
        )}

        {pdfInfo && visibleMessages.map((msg, i) => (
          <div key={msg.id || i} className={`pdf-bubble pdf-bubble--${msg.role}`}>
            <Avatar role={msg.role} />
            <div className="pdf-bubble-content">
              {msg.role === 'bot' && msg.streaming && msg.text === '' ? (
                <div className="pdf-typing"><span /><span /><span /></div>
              ) : (
                <div className={`pdf-bubble-text ${msg.streaming ? 'pdf-bubble-text--streaming' : ''}`}>
                  {msg.doodle && (
                    <div className="bubble-welcome" style={{ marginBottom: msg.text ? 8 : 0 }}>
                      <Doodle name={msg.doodle} size={24} />
                    </div>
                  )}
                  <TypewriterText text={msg.text} streaming={msg.streaming} />
                </div>
              )}
              {msg.role === 'bot' && msg.confidence && (
                <ConfidenceBadge level={msg.confidence} />
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="pdf-input-row">
        <textarea
          className="pdf-input"
          rows={2}
          placeholder={pdfInfo ? 'Ask a question about the PDF…' : 'Upload a PDF first'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!pdfInfo || thinking}
        />
        <button
          className="pdf-send-btn"
          onClick={handleSend}
          disabled={!pdfInfo || !input.trim() || thinking}
        >
          {thinking ? '…' : '➤'}
        </button>
      </div>
    </div>
  )
}

/* ── Typewriter effect ── */
function TypewriterText({ text = '', streaming = false }) {
  const lines = text.split('\n')
  return (
    <div className={streaming ? 'typewriter-active' : ''}>
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={j}>{part.slice(2, -2)}</strong>
          return part.split(/(\*[^*]+\*)/).map((p, k) => {
            if (p.startsWith('*') && p.endsWith('*'))
              return <em key={k}>{p.slice(1, -1)}</em>
            return p
          })
        })
        return (
          <React.Fragment key={i}>
            <span>{parts}</span>
            {i < lines.length - 1 && <br />}
          </React.Fragment>
        )
      })}
    </div>
  )
}

/* ── Confidence badge ── */
function ConfidenceBadge({ level }) {
  const config = {
    high:   { label: 'High relevance',   className: 'conf-high',   icon: '●' },
    medium: { label: 'Medium relevance', className: 'conf-medium', icon: '●' },
    low:    { label: 'Low relevance',    className: 'conf-low',    icon: '●' },
  }
  const c = config[level] || config.medium
  return (
    <div className={`pdf-confidence ${c.className}`}>
      <span className="conf-dot">{c.icon}</span>
      {c.label}
    </div>
  )
}