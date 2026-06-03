import { useState, useCallback } from 'react'
import { getBotReplyStream } from '../api/geminiApi'

export function useChat(messages, setMessages, sessionId, schema) {
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showChips, setShowChips] = useState(true)
  const [error, setError] = useState(null)
  const [pendingImage, setPendingImage] = useState(null)

  const sendMessage = useCallback(async (text) => {
    const msg = (typeof text === 'string' ? text : input).trim()
    if ((!msg && !pendingImage) || isStreaming) return

    setError(null)
    setShowChips(false)
    setInput('')

    const userMessage = {
      id: Date.now(),
      role: 'user',
      text: msg,
      ...(pendingImage && {
        image: pendingImage.base64,
        image_type: pendingImage.type,
        previewUrl: pendingImage.previewUrl,
      }),
    }

    setPendingImage(null)
    setMessages(prev => [...prev, userMessage])
    setIsStreaming(true)

    try {
      const history = [...messages, userMessage]
      const botId = Date.now() + 1

      setMessages(prev => [...prev, { id: botId, role: 'bot', text: '' }])

      await getBotReplyStream(
        history,
        String(sessionId),
        (chunk) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === botId ? { ...m, text: m.text + chunk } : m
            )
          )
        },
        schema   // ← pass schema through
      )
    } catch (err) {
      const message = err?.message || 'Something went wrong.'
      setError(message)
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, role: 'bot', text: `⚠️ ${message}` },
      ])
    } finally {
      setIsStreaming(false)
    }
  }, [input, isStreaming, messages, pendingImage, sessionId, setMessages, schema])

  const handleChip = useCallback((text) => {
    sendMessage(text)
  }, [sendMessage])

  return {
    input,
    setInput,
    typing: isStreaming,
    showChips,
    error,
    sendMessage,
    handleChip,
    pendingImage,
    setPendingImage,
  }
}
