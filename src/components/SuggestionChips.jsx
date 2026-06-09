import React from 'react'

export const SQL_CHIPS = [
  'Show all rows from a table',
  'Write a JOIN query',
  'Add a WHERE filter',
]

export default function SuggestionChips({ show, onChipClick, chips = SQL_CHIPS }) {
  if (!show) return null

  return (
    <div className="chips">
      {chips.map(chip => (
        <button
          key={chip}
          className="chip"
          onClick={() => onChipClick(chip)}
        >
          {chip}
        </button>
      ))}
    </div>
  )
}
