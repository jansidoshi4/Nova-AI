import React, { useState, useRef, useEffect } from 'react'
import Doodle from './Doodles'

function SessionItem({ session, isActive, onSelect, onRename, onDelete, onClose }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameVal, setNameVal] = useState(session.title)
  const menuRef = useRef(null)
  const inputRef = useRef(null)

  // close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // focus input when renaming starts
  useEffect(() => {
    if (renaming) inputRef.current?.focus()
  }, [renaming])

  const startRename = () => {
    setMenuOpen(false)
    setNameVal(session.title)
    setRenaming(true)
  }

  const commitRename = () => {
    const trimmed = nameVal.trim()
    if (trimmed) onRename(session.id, trimmed)
    setRenaming(false)
  }

  const handleRenameKey = (e) => {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') setRenaming(false)
  }

  return (
    <div className={`session-item-wrap${isActive ? ' active' : ''}${menuOpen ? ' menu-open' : ''}`} ref={menuRef}>
      <button
        className="session-item"
        onClick={() => { onSelect(session.id); onClose(); }}
      >
        <i className="ti ti-message-circle" />
        {renaming ? (
          <input
            ref={inputRef}
            className="rename-input"
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleRenameKey}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="session-label">{session.title}</span>
        )}
        <span className="session-time">{session.time}</span>
      </button>

      {/* Three-dot button */}
      <button
        className="session-menu-btn"
        onClick={e => { e.stopPropagation(); setMenuOpen(o => !o) }}
        aria-label="Chat options"
      >
        <i className="ti ti-dots-vertical" />
      </button>

      {/* Dropdown */}
      {menuOpen && (
        <div className="session-dropdown">
          <button onClick={startRename}>
            <i className="ti ti-pencil" /> Rename
          </button>
          <button className="danger" onClick={() => { setMenuOpen(false); onDelete(session.id) }}>
            <i className="ti ti-trash" /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ isOpen, sessions, activeId, onSelect, onNew, onClose, onRename, onDelete }) {
  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar${isOpen ? ' open' : ' closed-desktop'}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">Chats</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close sidebar">
            <i className="ti ti-x" />
          </button>
        </div>

        <button className="new-chat-btn" onClick={onNew}>
          <i className="ti ti-plus" /> New Chat
        </button>

        <div className="session-list">
          {sessions.length === 0 && (
            <p className="no-sessions">
              <Doodle name="flower" size={28} />
              No chats yet
            </p>
          )}
          {sessions.map(s => (
            <SessionItem
              key={s.id}
              session={s}
              isActive={s.id === activeId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onClose={onClose}
            />
          ))}
        </div>
      </aside>
    </>
  )
}
