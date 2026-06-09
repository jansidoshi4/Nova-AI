import { supabase } from '../lib/supabase'

const BACKEND_URL = 'http://localhost:8000/api'

/**
 * Upload a PDF file to the backend.
 * Returns { pdf_id, filename, pages, chunks, embedding_method }
 */
export async function uploadPDF(file) {
  // Get the currently logged-in user's ID
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id

  const formData = new FormData()
  formData.append('file', file)

  // Pass user_id so backend can save to Supabase pdf_sessions
  if (userId) {
    formData.append('user_id', userId)
  }

  const res = await fetch(`${BACKEND_URL}/pdf/upload`, {
    method: 'POST',
    body: formData,
    // Note: do NOT set Content-Type header — browser sets it with boundary
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Upload failed: ${res.status}`)
  }

  return res.json()
}

/**
 * Send a chat message about a previously uploaded PDF.
 * Streams the response, calling onChunk(text) for each token.
 *
 * @param {string}   pdfId     - ID returned by uploadPDF()
 * @param {Array}    history   - [{role:'user'|'bot', text:string}, ...]
 * @param {Function} onChunk   - called with each streamed text chunk
 */
export async function getPDFChatReplyStream(pdfId, history, onChunk) {
  const response = await fetch(`${BACKEND_URL}/pdf/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdf_id: pdfId, history }),
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
        if (content) onChunk(content)
      } catch {
        // ignore malformed JSON chunks
      }
    }
  }
}

/**
 * Delete a PDF from the backend's in-memory store.
 */
export async function deletePDF(pdfId) {
  await fetch(`${BACKEND_URL}/pdf/${pdfId}`, { method: 'DELETE' })
}