import React, { useState, useMemo, useEffect } from 'react'
import ChatHeader from './components/ChatHeader'
import MessageList from './components/MessageList'
import SuggestionChips from './components/SuggestionChips'
import InputBar from './components/InputBar'
import Sidebar from './components/Sidebar'
import AuthScreen from './components/AuthScreen'
import Dashboard from './components/Dashboard'
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

const THEMES = ['pink', 'dark', 'light']
const THEME_LABELS = { pink: '🌸 Pink', dark: '🌑 Dark', light: '☀️ Light' }

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('nova-theme') || 'pink')
  const [schema, setSchema] = useState(() => localStorage.getItem('schema') || '')
  const [pdfFile, setPdfFile] = useState(null)

  useEffect(() => { localStorage.setItem('schema', schema) }, [schema])
  useEffect(() => {
    localStorage.setItem('nova-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [])

  const { user, signIn, signUp, signInWithGoogle, signOut } = useAuth()

  // Separate chat histories for each bot
  const sqlHistory = useChatHistory(user ? `${user.id}:sql` : null)
  const pdfHistory = useChatHistory(user ? `${user.id}:pdf` : null)

  const {
    sessions, activeId, activeSession,
    setMessages, newChat, selectSession,
    renameSession, deleteSession,
  } = currentScreen === 'pdf-chat' ? pdfHistory : sqlHistory

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

  const cycleTheme = () => {
    const idx = THEMES.indexOf(theme)
    setTheme(THEMES[(idx + 1) % THEMES.length])
  }

  const resetWorkspace = () => {
    if (!window.confirm('Clear schema, chat history, and start a new workspace?')) return
    setSchema('')
    localStorage.removeItem('schema')
    newChat()
  }

  const loadSampleSchema = () => {
    setSchema(`CREATE TABLE Students (
  student_id INT PRIMARY KEY,
  name VARCHAR(50)
);

CREATE TABLE Courses (
  course_id INT PRIMARY KEY,
  course_name VARCHAR(50),
  student_id INT
);

INSERT INTO Students VALUES
(1, 'Jansi'),
(2, 'Rahul');

INSERT INTO Courses VALUES
(101, 'Java', 1),
(102, 'Python', 1),
(103, 'DBMS', 2);`)
  }

  if (!user) {
    return (
      <AuthScreen
        onSignIn={signIn}
        onSignUp={signUp}
        onGoogle={signInWithGoogle}
      />
    )
  }

  if (currentScreen === 'dashboard') {
    return (
      <Dashboard
        user={user}
        onSignOut={signOut}
        themeLabel={THEME_LABELS[theme]}
        onCycleTheme={cycleTheme}
        onOpenSQLChat={() => setCurrentScreen('sql-chat')}
        onOpenPDFChat={() => setCurrentScreen('pdf-chat')}
      />
    )
  }

  if (currentScreen === 'pdf-chat') {
    return (
      <div className="page">
        <Sidebar
          isOpen={sidebarOpen}
          sessions={pdfHistory.sessions}
          activeId={pdfHistory.activeId}
          onSelect={pdfHistory.selectSession}
          onNew={() => { pdfHistory.newChat(); setSidebarOpen(false) }}
          onClose={() => setSidebarOpen(false)}
          onRename={pdfHistory.renameSession}
          onDelete={pdfHistory.deleteSession}
        />

        <div className="chat-wrap">
          <ChatHeader
            user={user}
            onSignOut={signOut}
            onToggleSidebar={() => setSidebarOpen(o => !o)}
            themeLabel={THEME_LABELS[theme]}
            onCycleTheme={cycleTheme}
            onBackToDashboard={() => setCurrentScreen('dashboard')}
          />

          <div className="schema-input-area">
            <label className="pdf-upload-label">
              <input
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={e => setPdfFile(e.target.files[0] || null)}
              />
              <div className="pdf-upload-box">
                <i className="ti ti-file-type-pdf" style={{ fontSize: '1.6rem' }} aria-hidden="true" />
                {pdfFile
                  ? <span className="pdf-filename">📄 {pdfFile.name}</span>
                  : <span>Click to upload a PDF</span>
                }
              </div>
            </label>
            {pdfFile && (
              <div className="schema-toolbar">
                <button className="schema-tool-btn" onClick={() => setPdfFile(null)}>
                  🗑️ Remove PDF
                </button>
              </div>
            )}
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
      </div>
    )
  }

  // sql-chat screen
  return (
    <div className="page">
      <Sidebar
        isOpen={sidebarOpen}
        sessions={sqlHistory.sessions}
        activeId={sqlHistory.activeId}
        onSelect={sqlHistory.selectSession}
        onNew={() => { sqlHistory.newChat(); setSidebarOpen(false) }}
        onClose={() => setSidebarOpen(false)}
        onRename={sqlHistory.renameSession}
        onDelete={sqlHistory.deleteSession}
      />

      <div className="chat-wrap">
        <ChatHeader
          user={user}
          onSignOut={signOut}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          themeLabel={THEME_LABELS[theme]}
          onCycleTheme={cycleTheme}
          onBackToDashboard={() => setCurrentScreen('dashboard')}
        />
        <div className="schema-input-area">
          <textarea
            className="schema-textarea"
            placeholder="Paste your database schema here (CREATE TABLE + INSERT statements)…"
            value={schema}
            onChange={e => setSchema(e.target.value)}
          />
          <div className="schema-toolbar">
            <button className="schema-tool-btn" onClick={loadSampleSchema}>
              📋 Load Sample
            </button>
            <button className="schema-tool-btn" onClick={resetWorkspace}>
              🧹 Reset Workspace
            </button>
          </div>
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

      <div className="right-col">
        <SchemaPanel schema={schema} />
        <ResultTable result={result} error={queryError} sql={lastSQL} />
      </div>
    </div>
  )
}