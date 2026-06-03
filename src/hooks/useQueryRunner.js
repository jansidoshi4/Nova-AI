import { useState, useEffect } from 'react'

export function useQueryRunner(schema, sql) {
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!schema?.trim() || !sql?.trim()) {
      setResult(null)
      setError(null)
      return
    }

    async function run() {
      try {
        const alasql = (await import('alasql')).default

        const dbName = 'db_' + Math.random().toString(36).slice(2)
        alasql(`CREATE DATABASE ${dbName}`)
        alasql(`USE ${dbName}`)

        const statements = splitStatements(schema)
        for (const stmt of statements) {
          if (!stmt.trim()) continue
          try { alasql(stmt) } catch (e) { /* skip bad stmts */ }
        }

        const rows = alasql(sql)

        if (!rows || rows.length === 0) {
          setResult({ columns: [], rows: [] })
        } else {
          setResult({ columns: Object.keys(rows[0]), rows })
        }
        setError(null)
      } catch (e) {
        let msg = e.message || 'Query failed'
        if (msg.includes('undefined') && msg.includes('databaseid')) {
          msg = 'Incomplete or invalid SQL query.'
        }
        setError(msg)
        setResult(null)
      }
    }

    run()
  }, [schema, sql])

  return { result, error }
}

function splitStatements(sql) {
  const stmts = []
  let current = ''
  let inString = false
  let stringChar = ''

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    if (inString) {
      current += ch
      if (ch === stringChar && sql[i - 1] !== '\\') inString = false
    } else if (ch === "'" || ch === '"' || ch === '`') {
      inString = true
      stringChar = ch
      current += ch
    } else if (ch === ';') {
      stmts.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) stmts.push(current.trim())
  return stmts
}