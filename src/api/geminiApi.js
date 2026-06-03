const BACKEND_URL = 'http://localhost:8000/api'

export async function getBotReplyStream(history, sessionId, onChunk, schema = '') {
  const response = await fetch(`${BACKEND_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      history,
      schema,   // ← new field
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || `Backend error ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    while (true) {
      const lineEnd = buffer.indexOf('\n')
      if (lineEnd === -1) break

      const line = buffer.slice(0, lineEnd).trim()
      buffer = buffer.slice(lineEnd + 1)

      if (!line.startsWith('data: ')) continue

      const data = line.slice(6)
      if (data === '[DONE]') return

      try {
        const parsed = JSON.parse(data)
        const content = parsed?.choices?.[0]?.delta?.content
        if (content) {
          onChunk(content)
        }
      } catch {
        // ignore malformed JSON chunks
      }
    }
  }
}

export async function fetchSessions() {
  const res = await fetch(`${BACKEND_URL}/sessions`)
  return res.json()
}

export async function createSession(sessionId, title = 'New Chat') {
  await fetch(`${BACKEND_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, title }),
  })
}

export async function fetchMessages(sessionId) {
  const res = await fetch(`${BACKEND_URL}/sessions/${sessionId}/messages`)
  return res.json()
}

export async function deleteSession(sessionId) {
  await fetch(`${BACKEND_URL}/sessions/${sessionId}`, { method: 'DELETE' })
}
export async function explainSchema(schema) {
  const response = await fetch(`${BACKEND_URL}/explain-schema`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ schema }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || `Backend error ${response.status}`)
  }

  return response.json()
}