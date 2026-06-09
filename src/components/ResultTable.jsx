import React from 'react'
import Doodle from './Doodles'

export default function ResultTable({ result, error, sql }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="schema-panel-header">
        <span className="result-table-icon"><Doodle name="chart" size={20} /></span>
        <span>Query Result</span>
        {result && (
          <span className="result-row-count">{result.rows.length} row{result.rows.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {!sql && <div className="result-empty">No query yet.</div>}
        {error && (
          <div className="result-error">
            <Doodle name="warning" size={18} />
            {error}
          </div>
        )}
        {result && result.rows.length === 0 && !error && (
          <div className="result-empty">No rows returned.</div>
        )}
        {result && result.rows.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table className="result-table">
              <thead>
                <tr>{result.columns.map(col => <th key={col}>{col}</th>)}</tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i}>
                    {result.columns.map(col => (
                      <td key={col}>
                        {row[col] == null ? <span className="null-val">NULL</span> : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
