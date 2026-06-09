import React, { useRef } from 'react'

export default function InputBar({
  input,
  setInput,
  onSend,
  disabled,
  pendingImage,
  setPendingImage,
  mode = 'default',
  onErDiagram,
  erDisabled = false,
}) {
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const isSqlMode = mode === 'sql'

  const handleInput = (e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    if ((!input.trim() && !pendingImage) || disabled) return
    onSend(input)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      const base64 = dataUrl.split(',')[1]
      setPendingImage({
        base64,
        type: file.type,
        previewUrl: dataUrl,
      })
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e) => {
    processFile(e.target.files[0])
    e.target.value = ''
  }

  const removePendingImage = () => setPendingImage(null)

  return (
    <div className="input-area">
      {pendingImage && (
        <div className="image-preview">
          <img src={pendingImage.previewUrl} alt="Attachment preview" />
          <button className="remove-img" onClick={removePendingImage} aria-label="Remove image">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="input-row">
        {!isSqlMode && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div className="input-actions">
              <button
                className="action-btn"
                onClick={() => fileInputRef.current.click()}
                disabled={disabled}
                aria-label="Upload image"
                title="Upload image"
              >
                <i className="ti ti-photo" aria-hidden="true" />
              </button>
              <button
                className="action-btn"
                onClick={() => cameraInputRef.current.click()}
                disabled={disabled}
                aria-label="Take photo"
                title="Take a photo"
              >
                <i className="ti ti-camera" aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        <div className={`input-wrap${isSqlMode ? ' input-wrap--sql' : ''}`}>
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={pendingImage ? 'Add a message or send image…' : 'Type a message…'}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            aria-label="Message input"
            disabled={disabled}
          />
          {isSqlMode && (
            <button
              type="button"
              className="er-btn"
              onClick={onErDiagram}
              disabled={disabled || erDisabled}
              aria-label="Generate ER diagram"
              title={erDisabled ? 'Paste a schema first' : 'Generate ER diagram from schema'}
            >
              <i className="ti ti-hierarchy-2" aria-hidden="true" />
            </button>
          )}
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={(!input.trim() && !pendingImage) || disabled}
            aria-label="Send message"
          >
            <i className="ti ti-send" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
