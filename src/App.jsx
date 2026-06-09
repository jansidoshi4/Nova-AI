import React, { useState, useMemo, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import ChatHeader from './components/ChatHeader'
import MessageList from './components/MessageList'
import SuggestionChips from './components/SuggestionChips'
import InputBar from './components/InputBar'
import Sidebar from './components/Sidebar'
import AuthScreen from './components/AuthScreen'
import Dashboard from './components/Dashboard'
import SchemaPanel from './components/SchemaPanel'
import ResultTable from './components/ResultTable'
import PdfChatPanel from './components/PdfChatPanel'
import Doodle from './components/Doodles'
import { useAuth } from './hooks/useAuth'
import { useChat } from './hooks/useChat'
import { useChatHistory } from './hooks/useChatHistory'
import { useUserSchema } from './hooks/useUserSchema'
import { useQueryRunner } from './hooks/useQueryRunner'
import { buildMermaidEr, ER_DIAGRAM_PREFIX } from './utils/erDiagram'

function isSQL(text) {
  if (!text) return false
  return /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH)\b/i.test(text.trim())
}

const THEMES = ['light', 'dark']
const THEME_LABELS = { light: 'Light', dark: 'Dark' }

function normalizeTheme(stored) {
  return THEMES.includes(stored) ? stored : 'light'
}

function openChatInNewTab(path) {
  window.open(`${window.location.origin}${path}`, '_blank', 'noopener,noreferrer')
}

function SqlChatPage({
  user, signOut, theme, themeLabel, cycleTheme,
  sqlHistory, schema, setSchema, clearSchema,
}) {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const { sessions, activeId, activeSession, setMessages, newChat, selectSession, renameSession, deleteSession } = sqlHistory
  const messages = activeSession?.messages || []
  const hasUserMessage = messages.some(m => m.role === 'user')

  const {
    input, setInput, typing, showChips,
    sendMessage, handleChip,
    pendingImage, setPendingImage,
  } = useChat(messages, setMessages, activeId, schema)

  const lastSQL = useMemo(() => {
    const botMessages = messages.filter(m => m.role === 'bot' && isSQL(m.text))
    return botMessages.length > 0 ? botMessages[botMessages.length - 1].text : null
  }, [messages])

  const { result, error: queryError } = useQueryRunner(schema, lastSQL)

  const resetWorkspace = async () => {
    if (!window.confirm('Clear schema, chat history, and start a new workspace?')) return
    await clearSchema()
    newChat()
  }

  const handleErDiagram = () => {
    if (!schema.trim()) return
    const mermaid = buildMermaidEr(schema)
    if (!mermaid) {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'bot',
          text: '⚠️ Could not parse any tables from your schema. Make sure it includes CREATE TABLE statements.',
          createdAt: new Date().toISOString(),
        },
      ])
      return
    }
    setMessages(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'bot',
        text: ER_DIAGRAM_PREFIX + mermaid,
        createdAt: new Date().toISOString(),
      },
    ])
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
        activeDraftTitle={hasUserMessage ? '' : input}
        streamActiveTitle
      />

      <div className="chat-wrap">
        <ChatHeader
          user={user}
          onSignOut={signOut}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          themeLabel={themeLabel}
          onCycleTheme={cycleTheme}
          onBackToDashboard={() => navigate('/')}
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
              <Doodle name="clipboard" size={18} /> Load Sample
            </button>
            <button className="schema-tool-btn" onClick={resetWorkspace}>
              <Doodle name="brush" size={18} /> Reset Workspace
            </button>
          </div>
        </div>

        <MessageList messages={messages} typing={typing} />
        <SuggestionChips show={showChips} onChipClick={handleChip} />
        <InputBar
          mode="sql"
          input={input}
          setInput={setInput}
          onSend={sendMessage}
          disabled={typing}
          pendingImage={pendingImage}
          setPendingImage={setPendingImage}
          onErDiagram={handleErDiagram}
          erDisabled={!schema.trim()}
        />
      </div>

      <div className="right-col">
        <SchemaPanel schema={schema} />
        <ResultTable result={result} error={queryError} sql={lastSQL} />
      </div>
    </div>
  )
}

function PdfChatPage({ user, signOut, theme, themeLabel, cycleTheme, pdfHistory }) {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

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
          themeLabel={themeLabel}
          onCycleTheme={cycleTheme}
          onBackToDashboard={() => navigate('/')}
        />

        <PdfChatPanel
          theme={theme}
          activeSession={pdfHistory.activeSession}
          setMessages={pdfHistory.setMessages}
          activeId={pdfHistory.activeId}
        />
      </div>
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => normalizeTheme(localStorage.getItem('nova-theme')))

  useEffect(() => {
    localStorage.setItem('nova-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [])

  const { user, loading, signIn, signUp, signInWithGoogle, signOut } = useAuth()
  const { schema, setSchema, clearSchema } = useUserSchema(user?.id)
  const sqlHistory = useChatHistory(user?.id, 'sql')
  const pdfHistory = useChatHistory(user?.id, 'pdf')

  const cycleTheme = () => {
    const idx = THEMES.indexOf(theme)
    setTheme(THEMES[(idx + 1) % THEMES.length])
  }

  const themeLabel = THEME_LABELS[theme]

  if (loading) {
    return null
  }

  if (!user) {
    return (
      <AuthScreen
        onSignIn={signIn}
        onSignUp={signUp}
        onGoogle={signInWithGoogle}
        themeLabel={themeLabel}
        onCycleTheme={cycleTheme}
      />
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={(
          <Dashboard
            user={user}
            onSignOut={signOut}
            themeLabel={themeLabel}
            onCycleTheme={cycleTheme}
            onOpenSQLChat={() => openChatInNewTab('/sql')}
            onOpenPDFChat={() => openChatInNewTab('/pdf')}
          />
        )}
      />
      <Route
        path="/sql"
        element={(
          <SqlChatPage
            user={user}
            signOut={signOut}
            theme={theme}
            themeLabel={themeLabel}
            cycleTheme={cycleTheme}
            sqlHistory={sqlHistory}
            schema={schema}
            setSchema={setSchema}
            clearSchema={clearSchema}
          />
        )}
      />
      <Route
        path="/pdf"
        element={(
          <PdfChatPage
            user={user}
            signOut={signOut}
            theme={theme}
            themeLabel={themeLabel}
            cycleTheme={cycleTheme}
            pdfHistory={pdfHistory}
          />
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
