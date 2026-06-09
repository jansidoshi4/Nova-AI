import React, { useEffect, useRef, useState, useId } from 'react'
import mermaid from 'mermaid'

let mermaidReady = false

function initMermaid() {
  if (mermaidReady) return
  mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    securityLevel: 'loose',
    er: { useMaxWidth: true },
  })
  mermaidReady = true
}

export default function ErDiagramBlock({ source }) {
  const containerRef = useRef(null)
  const renderId = useId().replace(/:/g, '')
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!source || !containerRef.current) return

    let cancelled = false
    initMermaid()
    setError(null)

    mermaid
      .render(`er-diagram-${renderId}`, source)
      .then(({ svg }) => {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Could not render diagram')
      })

    return () => { cancelled = true }
  }, [source, renderId])

  function handleCopy() {
    navigator.clipboard.writeText(source).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="er-diagram-block">
      <div className="er-diagram-header">
        <span className="er-diagram-label">ER Diagram</span>
        <button
          type="button"
          className={`er-copy-btn ${copied ? 'er-copy-btn--done' : ''}`}
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy Mermaid source'}
        >
          <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {error ? (
        <pre className="er-diagram-fallback">{source}</pre>
      ) : (
        <div ref={containerRef} className="er-diagram-svg" />
      )}
    </div>
  )
}
