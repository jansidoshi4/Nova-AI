import React from 'react'

const CHIPS = [
  'What can you do?',
  'Tell me a fun fact',
  'Help me brainstorm',
]

export default function SuggestionChips({ show, onChipClick }) {
  if (!show) return null

  return (
    <div className="chips">
      {CHIPS.map(chip => (
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
