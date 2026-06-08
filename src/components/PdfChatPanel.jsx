import React, { useState, useRef, useEffect } from 'react'
import { uploadPDF, getPDFChatReplyStream, deletePDF } from '../api/pdfApi'
import '../styles/pdfChat.css'

export default function PdfChatPanel({ theme = 'dark' }) {
  const [pdfInfo, setPdfInfo]       = useState(null)
  const [uploading, setUploading]   = useState(false)
  const [uploadErr, setUploadErr]   = useState('')
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [thinking, setThinking]     = useState(false)
  const [dragOver, setDragOver]     = useState(false)

  const fileInputRef = useRef(null)
  const bottomRef    = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  async function processFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadErr('Please upload a valid PDF file.')
      return
    }
    setUploadErr('')
    setUploading(true)
    setMessages([])
    setPdfInfo(null)
    try {
      const info = await uploadPDF(file)
      setPdfInfo(info)
      setMessages([{
        role: 'bot',
        text: `📄 **${info.filename}** uploaded successfully!\n\n• **${info.pages}** page(s) · **${info.chunks}** text chunks\n• Embeddings: *${info.embedding_method}*\n\nAsk me anything about this document!`,
        confidence: null,
      }])
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

  function handleDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setDragOver(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || thinking || !pdfInfo) return

    const userMsg  = { role: 'user', text, confidence: null }
    const botShell = { role: 'bot', text: '', confidence: null, streaming: true }

    setMessages(prev => [...prev, userMsg, botShell])
    setInput('')
    setThinking(true)

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, text: m.text }))

      // confidence comes as first chunk: "__CONF:high__" etc.
      let confidenceSet = false

      await getPDFChatReplyStream(pdfInfo.pdf_id, history, (chunk) => {
        setMessages(prev => {
          const updated = [...prev]
          const last = { ...updated[updated.length - 1] }

          // Parse confidence tag sent from backend
          if (!confidenceSet && chunk.startsWith('__CONF:')) {
            const level = chunk.replace('__CONF:', '').replace('__', '').trim()
            last.confidence = level
            confidenceSet = true
          } else {
            last.text = last.text + chunk
          }

          updated[updated.length - 1] = last
          return updated
        })
      })

      // Mark streaming done
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { ...updated[updated.length - 1], streaming: false }
        return updated
      })

    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'bot', text: `⚠️ ${err.message}`, confidence: null, streaming: false }
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
    setPdfInfo(null)
    setMessages([])
    setUploadErr('')
  }

  return (
    <div className="pdf-chat-panel" data-theme={theme}>

      {/* ── Header ── */}
      <div className="pdf-chat-header">
        <span className="pdf-chat-title">📄 PDF Chat</span>
        {pdfInfo ? (
          <div className="pdf-badge">
            <span className="pdf-badge-name">{pdfInfo.filename}</span>
            <span className="pdf-badge-meta">{pdfInfo.pages}p · {pdfInfo.chunks} chunks</span>
            <button className="pdf-remove-btn" onClick={handleRemovePdf} title="Remove PDF">✕</button>
          </div>
        ) : (
          <button
            className="pdf-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Processing…' : '⬆ Upload PDF'}
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

      {uploadErr && <div className="pdf-error">⚠️ {uploadErr}</div>}

      {/* ── Messages ── */}
      <div className="pdf-messages">

        {/* Glassmorphism drag-and-drop zone */}
        {!pdfInfo && !uploading && (
          <div
            className={`pdf-drop-zone ${dragOver ? 'pdf-drop-zone--active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="pdf-drop-glow" />
            <div className="pdf-drop-icon">📄</div>
            <p className="pdf-drop-title">Drop your PDF here</p>
            <p className="pdf-drop-sub">or click to browse</p>
            <p className="pdf-drop-hint">Nova uses <strong>embeddings</strong> to find the most relevant passages before answering</p>
          </div>
        )}

        {uploading && (
          <div className="pdf-processing">
            <div className="pdf-spinner" />
            <p>Extracting text and building embeddings…</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`pdf-bubble pdf-bubble--${msg.role}`}>
            <div className="pdf-bubble-avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
            <div className="pdf-bubble-content">
              <div className={`pdf-bubble-text ${msg.streaming ? 'pdf-bubble-text--streaming' : ''}`}>
                <TypewriterText text={msg.text} streaming={msg.streaming} />
              </div>
              {msg.role === 'bot' && msg.confidence && (
                <ConfidenceBadge level={msg.confidence} />
              )}
            </div>
          </div>
        ))}

        {thinking && messages[messages.length - 1]?.text === '' && (
          <div className="pdf-typing"><span /><span /><span /></div>
        )}

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

/* ── Typewriter effect for streaming text ── */
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