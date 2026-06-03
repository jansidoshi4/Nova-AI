import React, { useState, useMemo } from 'react'
import ChatHeader from './components/ChatHeader'
import MessageList from './components/MessageList'
import SuggestionChips from './components/SuggestionChips'
import InputBar from './components/InputBar'
import Sidebar from './components/Sidebar'
import AuthScreen from './components/AuthScreen'
import SchemaPanel from './components/SchemaPanel'
import ResultTable from './components/ResultTable'
import { useAuth } from './hooks/useAuth'
import { useChat } from './hooks/useChat'
import { useChatHistory } from './hooks/useChatHistory'
import { useQueryRunner } from './hooks/useQueryRunner'

function isSQL(text) {
  if (!text) return false
  return /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH)\b/i.test(text.trim())
}

const rightColStyle = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  width: '260px',
  minWidth: '260px',
  flexShrink: 0,
  borderLeft: '1px solid rgba(244,63,127,0.18)',
  overflow: 'hidden',
  background: 'linear-gradient(175deg, rgba(255,240,248,0.97) 0%, rgba(252,228,236,0.95) 100%)',
}

const halfStyle = {
  height: '50%',
  minHeight: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [schema, setSchema] = useState('')
  const { user, signIn, signUp, signInWithGoogle, signOut } = useAuth()
  const {
    sessions, activeId, activeSession,
    setMessages, newChat, selectSession,
    renameSession, deleteSession,
  } = useChatHistory(user?.id)

  const messages = activeSession?.messages || []

  const {
    input, setInput, typing, showChips,
    sendMessage, handleChip,
    pendingImage, setPendingImage, error,
  } = useChat(messages, setMessages, activeId, schema)

  const lastSQL = useMemo(() => {
    const botMessages = messages.filter(m => m.role === 'bot' && isSQL(m.text))
    return botMessages.length > 0 ? botMessages[botMessages.length - 1].text : null
  }, [messages])

  const { result, error: queryError } = useQueryRunner(schema, lastSQL)

  if (!user) {
    return (
      <AuthScreen
        onSignIn={signIn}
        onSignUp={signUp}
        onGoogle={signInWithGoogle}
      />
    )
  }

  return (
    <div className="page">
      <Sidebar
        isOpen={sidebarOpen}
        sessions={sessions}
        activeId={activeId}
        onSelect={selectSession}
        onNew={() => { newChat(); setSidebarOpen(false) }}
        onClose={() => setSidebarOpen(false)}
        onRename={renameSession}
        onDelete={deleteSession}
      />

      <div className="chat-wrap">
        <ChatHeader
          user={user}
          onSignOut={signOut}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
        />
        <div className="schema-input-area">
          <textarea
            className="schema-textarea"
            placeholder="Paste your database schema here (CREATE TABLE + INSERT statements)…"
            value={schema}
            onChange={e => setSchema(e.target.value)}
          />
        </div>
        <MessageList messages={messages} typing={typing} />
        <SuggestionChips show={showChips} onChipClick={handleChip} />
        <InputBar
          input={input}
          setInput={setInput}
          onSend={sendMessage}
          disabled={typing}
          pendingImage={pendingImage}
          setPendingImage={setPendingImage}
        />
      </div>

      {/* RIGHT COLUMN — exact 50/50 */}
      <div style={rightColStyle}>
        <div style={halfStyle}>
          <SchemaPanel schema={schema} />
        </div>
        <div style={{ ...halfStyle, borderTop: '2px solid rgba(244,63,127,0.25)' }}>
          <ResultTable result={result} error={queryError} sql={lastSQL} />
        </div>
      </div>
    </div>
  )
}
