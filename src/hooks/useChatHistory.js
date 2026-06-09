import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const INITIAL_BOT_MSG = () => ({
  id: crypto.randomUUID(),
  role: 'bot',
  text: "Hey! I'm Nova, your AI assistant. How can I help you today? You can also send me images!",
  doodle: 'wave',
  createdAt: new Date().toISOString(),
})

export function useChatHistory(userId, type = 'sql') {
  const [sessions, setSessions]   = useState([])
  const [activeId, setActiveId]   = useState(null)

  // Use a combined key so we reliably reload when either changes
  const loadKey = `${userId}::${type}`
  const loadKeyRef   = useRef(null)
  const insertedIds  = useRef(new Set())
  const userIdRef    = useRef(userId)
  const typeRef      = useRef(type)

  useEffect(() => { userIdRef.current = userId }, [userId])
  useEffect(() => { typeRef.current   = type    }, [type])

  // Stable createNewSession — reads userId / type from refs so it never changes identity
  const createNewSession = useCallback(async () => {
    const uid = userIdRef.current
    const t   = typeRef.current
    if (!uid) return

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: uid, title: 'New Chat', type: t })
      .select()
      .single()

    if (error) { console.error('[useChatHistory] createNewSession error:', error); return }

    const initialMessages = []

    if (t === 'sql') {
      const botMsg = INITIAL_BOT_MSG()
      const { error: msgErr } = await supabase.from('messages').insert({
        id: botMsg.id,
        session_id: data.id,
        role: botMsg.role,
        text: botMsg.text,
      })
      if (!msgErr) {
        insertedIds.current.add(botMsg.id)
        initialMessages.push(botMsg)
      }
    }

    const newSession = {
      id: data.id,
      title: data.title,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: initialMessages,
    }

    setSessions(prev => [newSession, ...prev])
    setActiveId(data.id)
    return data.id
  }, []) // stable — reads via refs

  // Load sessions whenever userId or type changes
  useEffect(() => {
    // Wait until we actually have a real userId — auth is async on page load
    if (!userId) return

    // Skip if we already loaded for this exact userId+type combination
    if (loadKeyRef.current === loadKey) return
    loadKeyRef.current = loadKey

    // Reset state for new user/type
    setSessions([])
    setActiveId(null)
    insertedIds.current = new Set()

    async function load() {
      const { data: sessionRows, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', type)
        .order('updated_at', { ascending: false })

      if (error) { console.error('[useChatHistory] load error:', error); return }

      if (!sessionRows || sessionRows.length === 0) {
        await createNewSession()
        return
      }

      const { data: msgRows, error: msgErr } = await supabase
        .from('messages')
        .select('*')
        .in('session_id', sessionRows.map(s => s.id))
        .order('created_at', { ascending: true })

      if (msgErr) console.error('[useChatHistory] messages load error:', msgErr)

      const built = sessionRows.map(s => ({
        id: s.id,
        title: s.title,
        time: new Date(s.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        messages: (msgRows || [])
          .filter(m => m.session_id === s.id)
          .map(m => ({ id: m.id, role: m.role, text: m.text, createdAt: m.created_at })),
      }))

      built.forEach(s => s.messages.forEach(m => insertedIds.current.add(m.id)))

      setSessions(built)
      setActiveId(built[0].id)
    }

    load()
  }, [userId, type, loadKey, createNewSession])

  const activeSession = sessions.find(s => s.id === activeId) ?? null

  const setMessages = useCallback((updater) => {
    if (!activeId) return

    setSessions(prev => prev.map(s => {
      if (s.id !== activeId) return s

      const newMessages = typeof updater === 'function' ? updater(s.messages) : updater

      // Derive title from first real user message (skip system marker messages)
      const firstUser = newMessages.find(m => m.role === 'user')
      const titleText = firstUser?.text?.trim() || ''
      const title = titleText
        ? titleText.slice(0, 30) + (titleText.length > 30 ? '…' : '')
        : s.title // keep existing title (e.g. 'New Chat') — don't overwrite with blank

      // Only persist messages that are fully done (not streaming) and not already saved
      const toInsert = newMessages.filter(m =>
        m.id && !m.streaming && !insertedIds.current.has(m.id)
      )

      if (toInsert.length > 0) {
        toInsert.forEach(m => insertedIds.current.add(m.id))

        supabase.from('messages').insert(
          toInsert.map(m => ({
            id: m.id,
            session_id: activeId,
            role: m.role,
            text: m.text,
          }))
        ).then(({ error }) => {
          if (error) console.error('[useChatHistory] insert error:', error)
        })

        // Always bump updated_at when new messages are saved so ordering stays correct
        supabase.from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', activeId)
          .then(({ error }) => { if (error) console.error('[useChatHistory] updated_at error:', error) })
      }

      // Persist new title to Supabase as soon as it changes (fires on first user message)
      if (title !== s.title) {
        supabase.from('chat_sessions')
          .update({ title, updated_at: new Date().toISOString() })
          .eq('id', activeId)
          .then(({ error }) => { if (error) console.error('[useChatHistory] title update error:', error) })
      }

      return { ...s, messages: newMessages, title }
    }))
  }, [activeId])

  const newChat = useCallback(() => createNewSession(), [createNewSession])

  const selectSession = useCallback((id) => setActiveId(id), [])

  const renameSession = useCallback(async (id, newTitle) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s))
    const { error } = await supabase.from('chat_sessions').update({ title: newTitle }).eq('id', id)
    if (error) console.error('[useChatHistory] rename error:', error)
  }, [])

  const deleteSession = useCallback(async (id) => {
    // Delete messages first, then the session
    await supabase.from('messages').delete().eq('session_id', id)
    const { error } = await supabase.from('chat_sessions').delete().eq('id', id)
    if (error) { console.error('[useChatHistory] delete error:', error); return }

    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id)
      if (remaining.length === 0) {
        createNewSession()
        return []
      }
      if (id === activeId) setActiveId(remaining[0].id)
      return remaining
    })
  }, [activeId, createNewSession])

  return {
    sessions, activeId, activeSession,
    setMessages, newChat, selectSession,
    renameSession, deleteSession,
  }
}