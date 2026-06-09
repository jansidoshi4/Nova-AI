import React from 'react'
import Doodle from './Doodles'

export default function SchemaPanel({ schema }) {
  const tables = parseSchema(schema)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="schema-panel-header">
        <span className="schema-panel-icon"><Doodle name="database" size={20} /></span>
        <span>Schema</span>
      </div>
      <div className="schema-panel-body" style={{ flex: 1, overflowY: 'auto' }}>
        {!schema.trim() ? (
          <p className="schema-empty">No schema pasted yet.</p>
        ) : tables.length > 0 ? (
          tables.map((table, i) => (
            <div key={i} className="schema-table-block">
              <div className="schema-table-name">
                <Doodle name="clipboard" size={16} />
                {table.name}
              </div>
              <div className="schema-columns">
                {table.columns.map((col, j) => (
                  <div key={j} className="schema-column">
                    <span className="col-name">{col.name}</span>
                    <span className="col-type">{col.type}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <pre className="schema-raw">{schema}</pre>
        )}
      </div>
    </div>
  )
}

function parseSchema(schema) {
  const tables = []
  const tableRegex = /CREATE\s+TABLE\s+[`"]?(\w+)[`"]?\s*\(([^;]+)\)/gi
  let match
  while ((match = tableRegex.exec(schema)) !== null) {
    const name = match[1]
    const body = match[2]
    const columns = []
    for (const line of body.split('\n')) {
      const trimmed = line.trim().replace(/,$/, '')
      if (!trimmed || /^(PRIMARY|FOREIGN|UNIQUE|INDEX|KEY|CONSTRAINT)/i.test(trimmed)) continue
      const colMatch = trimmed.match(/^[`"]?(\w+)[`"]?\s+(\w+(\s*\([^)]*\))?)/i)
      if (colMatch) columns.push({ name: colMatch[1], type: colMatch[2].trim() })
    }
    tables.push({ name, columns })
  }
  return tables
}
