import React from 'react'

export default function ChatHeader({ onToggleSidebar, user, onSignOut }) {
  return (
    <div className="chat-header">
      <button className="icon-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <i className="ti ti-layout-sidebar" aria-hidden="true" />
      </button>
      <div className="bot-avatar">
        <i className="ti ti-robot" aria-hidden="true" />
      </div>
      <div className="header-info">
        <h2>Nova AI</h2>
        <div className="status">
          <div className="dot" />
          Online
        </div>
      </div>
      <div className="header-actions">
        <div className="signed-user" title={user?.email}>
          <span>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          <strong>{user?.name || 'User'}</strong>
        </div>
        <button className="icon-btn" onClick={onSignOut} aria-label="Sign out">
          <i className="ti ti-logout" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
