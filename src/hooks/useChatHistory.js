import { useState, useCallback, useEffect, useMemo, useRef } from 'react'

const INITIAL_BOT_MSG = () => ({
  id: 1,
  role: 'bot',
  text: "Hey! I'm Nova, your AI assistant 👋 How can I help you today? You can also send me images!",
})

function makeSession(id) {
  return {
    id,
    title: 'New Chat',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    messages: [INITIAL_BOT_MSG()],
  }
}

export function useChatHistory(userId) {
  const storageKey = useMemo(() => userId ? `nova-history:${userId}` : null, [userId])
  const loadedKeyRef = useRef(null)
  const [sessions, setSessions] = useState([])
  const [activeId, setActiveId] = useState(null)

  useEffect(() => {
    if (!storageKey) return

    let saved = null
    try {
      saved = JSON.parse(localStorage.getItem(storageKey))
    } catch {
      saved = null
    }

    if (saved?.sessions?.length) {
      setSessions(saved.sessions)
      setActiveId(saved.activeId || saved.sessions[0].id)
    } else {
      const firstId = Date.now()
      setSessions([makeSession(firstId)])
      setActiveId(firstId)
    }

    loadedKeyRef.current = storageKey
  }, [storageKey])

  useEffect(() => {
    if (!storageKey || loadedKeyRef.current !== storageKey || sessions.length === 0) return
    localStorage.setItem(storageKey, JSON.stringify({ sessions, activeId }))
  }, [activeId, sessions, storageKey])

  const activeSession = sessions.find(s => s.id === activeId)

  const setMessages = useCallback((updater) => {
    if (!activeId) return
    setSessions(prev => prev.map(s => {
      if (s.id !== activeId) return s
      const newMessages = typeof updater === 'function' ? updater(s.messages) : updater
      const firstUser = newMessages.find(m => m.role === 'user')
      const title = firstUser
        ? (firstUser.text?.slice(0, 30) || 'Image message') + (firstUser.text?.length > 30 ? '…' : '')
        : s.title
      return { ...s, messages: newMessages, title }
    }))
  }, [activeId])

  const newChat = useCallback(() => {
    const id = Date.now()
    setSessions(prev => [makeSession(id), ...prev])
    setActiveId(id)
  }, [])

  const selectSession = useCallback((id) => setActiveId(id), [])

  const renameSession = useCallback((id, newTitle) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s))
  }, [])

  const deleteSession = useCallback((id) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id)
      if (remaining.length === 0) {
        const newId = Date.now()
        setActiveId(newId)
        return [makeSession(newId)]
      }
      if (id === activeId) setActiveId(remaining[0].id)
      return remaining
    })
  }, [activeId])

  return {
    sessions, activeId, activeSession,
    setMessages, newChat, selectSession,
    renameSession, deleteSession,
  }
}
