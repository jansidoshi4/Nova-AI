export const ER_DIAGRAM_PREFIX = '__ER_DIAGRAM__'

export const SQL_WELCOME_TEXT =
  "Hey! I'm Nova — I can help you with SQL doubts. Paste your schema above, then ask about queries, joins, filters, or your table design."

/**
 * Parse CREATE TABLE blocks from a SQL schema string.
 */
export function parseSchemaTables(schema) {
  const tables = []
  const tableRegex = /CREATE\s+TABLE\s+[`"]?(\w+)[`"]?\s*\(([\s\S]*?)\)\s*;/gi
  let match

  while ((match = tableRegex.exec(schema)) !== null) {
    const name = match[1]
    const body = match[2]
    const columns = []
    const fkRefs = []

    for (const line of body.split('\n')) {
      const trimmed = line.trim().replace(/,$/, '')
      if (!trimmed) continue

      const fkMatch = trimmed.match(
        /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+[`"]?(\w+)[`"]?\s*\(([^)]+)\)/i
      )
      if (fkMatch) {
        fkRefs.push({ column: fkMatch[1].trim(), refTable: fkMatch[2], refColumn: fkMatch[3].trim() })
        continue
      }

      if (/^(PRIMARY|UNIQUE|INDEX|KEY|CONSTRAINT)/i.test(trimmed)) continue

      const colMatch = trimmed.match(/^[`"]?(\w+)[`"]?\s+(\w+(?:\s*\([^)]*\))?)/i)
      if (!colMatch) continue

      const colName = colMatch[1]
      const colType = colMatch[2].trim()
      const isPk = /PRIMARY\s+KEY/i.test(trimmed)

      columns.push({ name: colName, type: colType, isPk })
    }

    for (const fk of fkRefs) {
      const col = columns.find(c => c.name === fk.column)
      if (col) col.isFk = true
    }

    tables.push({ name, columns, fkRefs })
  }

  return tables
}

function singularize(word) {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (word.endsWith('ses')) return word.slice(0, -2)
  if (word.endsWith('s') && word.length > 1) return word.slice(0, -1)
  return word
}

function inferForeignKey(colName, tables, currentTable) {
  if (!colName.endsWith('_id')) return null
  const stem = colName.slice(0, -3)
  if (!stem) return null

  const candidates = [
    stem,
    stem + 's',
    singularize(stem),
    singularize(stem) + 's',
  ].map(s => s.toLowerCase())

  const parent = tables.find(
    t => t.name !== currentTable && candidates.includes(t.name.toLowerCase())
  )
  return parent ? { parent: parent.name, child: currentTable } : null
}

function mermaidType(sqlType) {
  const t = sqlType.toLowerCase()
  if (/int|serial|bigint|smallint|tinyint/.test(t)) return 'int'
  if (/float|double|decimal|numeric|real/.test(t)) return 'float'
  if (/bool/.test(t)) return 'boolean'
  if (/date|time/.test(t)) return 'date'
  return 'string'
}

function safeEntityName(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, '_')
}

/**
 * Build Mermaid erDiagram source from a SQL schema string.
 * Returns null if no tables were found.
 */
export function buildMermaidEr(schema) {
  const tables = parseSchemaTables(schema)
  if (!tables.length) return null

  const lines = ['erDiagram']
  const relationKeys = new Set()

  for (const table of tables) {
    for (const fk of table.fkRefs) {
      const key = `${fk.refTable}->${table.name}`
      if (!relationKeys.has(key)) {
        relationKeys.add(key)
        lines.push(`    ${safeEntityName(fk.refTable)} ||--o{ ${safeEntityName(table.name)} : references`)
      }
    }

    for (const col of table.columns) {
      const inferred = inferForeignKey(col.name, tables, table.name)
      if (inferred) {
        const key = `${inferred.parent}->${inferred.child}`
        if (!relationKeys.has(key)) {
          relationKeys.add(key)
          lines.push(`    ${safeEntityName(inferred.parent)} ||--o{ ${safeEntityName(inferred.child)} : has`)
        }
      }
    }
  }

  for (const table of tables) {
    lines.push(`    ${safeEntityName(table.name)} {`)
    for (const col of table.columns) {
      const tags = []
      if (col.isPk) tags.push('PK')
      if (col.isFk) tags.push('FK')
      const tagStr = tags.length ? ` ${tags.join(',')}` : ''
      lines.push(`        ${mermaidType(col.type)} ${col.name}${tagStr}`)
    }
    lines.push('    }')
  }

  return lines.join('\n')
}
