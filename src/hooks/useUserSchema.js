import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const SAVE_DELAY_MS = 800

/**
 * Load and persist the SQL workspace schema per Supabase user.
 * Migrates any existing localStorage schema on first login.
 */
export function useUserSchema(userId) {
  const [schema, setSchemaState] = useState('')
  const [loading, setLoading] = useState(!!userId)
  const schemaRef = useRef('')
  const saveTimerRef = useRef(null)

  useEffect(() => {
    schemaRef.current = schema
  }, [schema])

  useEffect(() => {
    if (!userId) {
      setSchemaState('')
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)

      const { data, error } = await supabase
        .from('user_schemas')
        .select('schema_text')
        .eq('user_id', userId)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('[useUserSchema] load error:', error)
        setLoading(false)
        return
      }

      const local = localStorage.getItem('schema') || ''

      if (data?.schema_text != null) {
        setSchemaState(data.schema_text)
      } else if (local.trim()) {
        setSchemaState(local)
        const { error: upsertErr } = await supabase.from('user_schemas').upsert({
          user_id: userId,
          schema_text: local,
          updated_at: new Date().toISOString(),
        })
        if (upsertErr) console.error('[useUserSchema] migrate error:', upsertErr)
        else localStorage.removeItem('schema')
      }

      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  const persist = useCallback((text) => {
    if (!userId) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const { error } = await supabase.from('user_schemas').upsert({
        user_id: userId,
        schema_text: text,
        updated_at: new Date().toISOString(),
      })
      if (error) console.error('[useUserSchema] save error:', error)
    }, SAVE_DELAY_MS)
  }, [userId])

  const setSchema = useCallback((value) => {
    setSchemaState(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      schemaRef.current = next
      persist(next)
      return next
    })
  }, [persist])

  const clearSchema = useCallback(async () => {
    clearTimeout(saveTimerRef.current)
    setSchemaState('')
    schemaRef.current = ''
    localStorage.removeItem('schema')
    if (!userId) return
    const { error } = await supabase.from('user_schemas').upsert({
      user_id: userId,
      schema_text: '',
      updated_at: new Date().toISOString(),
    })
    if (error) console.error('[useUserSchema] clear error:', error)
  }, [userId])

  return { schema, setSchema, clearSchema, loading }
}
