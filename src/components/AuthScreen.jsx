import React, { useState } from 'react'
import Doodle from './Doodles'


const initialForm = { name: '', email: '', password: '' }

const PREVIEW_MESSAGES = [
  { role: 'user',  text: 'Can you summarise our Q3 sales data?' },
  { role: 'ai',    text: 'Sure! Revenue was up 18% vs Q2. Top category: Enterprise subscriptions.' },
  { role: 'user',  text: 'Which region underperformed?' },
  { role: 'ai',    text: 'APAC came in 11% below target — mainly due to delayed onboarding.' },
]

export default function AuthScreen({ onSignIn, onSignUp, onGoogle, themeLabel, onCycleTheme }) {
  const [mode, setMode]   = useState('signin')
  const [form, setForm]   = useState(initialForm)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isSignup = mode === 'signup'

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      if (isSignup) {
        await onSignUp(form)
      } else {
        await onSignIn(form)
      }
    } catch (err) {
      setError(err.message || 'Unable to continue.')
      setIsLoading(false)
    }
  }



  const switchMode = (next) => {
    setMode(next)
    setForm(initialForm)
    setError('')
  }

  return (
    <div className="auth-page">

      {onCycleTheme && (
        <div className="auth-topbar">
          <button className="theme-toggle-btn" type="button" onClick={onCycleTheme}>
            {themeLabel}
          </button>
        </div>
      )}

      {/* ── Left: brand panel ── */}
      <div className="auth-brand">
        <div className="auth-brand-inner">
          <div className="auth-wordmark">
            <span className="auth-wordmark-icon" aria-hidden="true">
              <i className="ti ti-box" />
            </span>
            Nova AI
          </div>

          <h1 className="auth-hero-title">
            The only AI workspace<br />
            <span>built for your team</span>
          </h1>
          <p className="auth-tagline">Your conversations, your context, always remembered.</p>

          <div className="auth-chat-preview">
            <div className="auth-window-bar">
              <span className="auth-window-dot auth-window-dot--red" />
              <span className="auth-window-dot auth-window-dot--yellow" />
              <span className="auth-window-dot auth-window-dot--green" />
              <span className="auth-window-label">Nova AI / Preview</span>
            </div>
            <div className="auth-chat-messages">
              {PREVIEW_MESSAGES.map((m, i) => (
                <div
                  key={i}
                  className={`auth-msg auth-msg--${m.role}`}
                  style={{ animationDelay: `${i * 0.18}s` }}
                >
                  {m.role === 'ai' && (
                    <div className="auth-msg-avatar" aria-hidden="true">
                      <Doodle name="sparkle" size={14} />
                    </div>
                  )}
                  <div className="auth-msg-bubble">{m.text}</div>
                </div>
              ))}

              <div className="auth-msg auth-msg--ai" style={{ animationDelay: '0.8s' }}>
                <div className="auth-msg-avatar" aria-hidden="true">
                  <Doodle name="sparkle" size={14} />
                </div>
                <div className="auth-msg-bubble auth-typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          </div>

          {/* Stat pills */}
          <div className="auth-stats">
            <div className="auth-stat">
              <span className="auth-stat-num">∞</span>
              <span className="auth-stat-label">chat history</span>
            </div>
            <div className="auth-stat-divider" aria-hidden="true" />
            <div className="auth-stat">
              <span className="auth-stat-num">SQL</span>
              <span className="auth-stat-label">aware queries</span>
            </div>
            <div className="auth-stat-divider" aria-hidden="true" />
            <div className="auth-stat">
              <span className="auth-stat-num">1-click</span>
              <span className="auth-stat-label">Google sign-in</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div className="auth-panel">
        <div className="auth-panel-inner">

          <div className="auth-tabs" role="tablist">
            <button className={!isSignup ? 'active' : ''} onClick={() => switchMode('signin')} type="button">Sign in</button>
            <button className={isSignup  ? 'active' : ''} onClick={() => switchMode('signup')} type="button">Create account</button>
          </div>

          <div className="auth-copy">
            <h2>{isSignup ? 'Create your account' : 'Welcome back'}</h2>
            <p>{isSignup ? 'Start your private Nova workspace.' : 'Pick up where you left off.'}</p>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {isSignup && (
              <div className="auth-field">
                <label htmlFor="auth-name">Name</label>
                <input
                  id="auth-name"
                  value={form.name}
                  onChange={e => updateForm('name', e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  required
                  disabled={isLoading}
                />
              </div>
            )}
            <div className="auth-field">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                value={form.email}
                onChange={e => updateForm('email', e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                required
                disabled={isLoading}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                value={form.password}
                onChange={e => updateForm('password', e.target.value)}
                placeholder={isSignup ? 'Create a password' : 'Enter password'}
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                minLength={4}
                required
                disabled={isLoading}
              />
            </div>

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button className="auth-primary" type="submit" disabled={isLoading}>
              {isLoading ? (
                <div className="auth-spinner" aria-hidden="true" />
              ) : (
                <i className={isSignup ? 'ti ti-user-plus' : 'ti ti-login-2'} aria-hidden="true" />
              )}
              {isLoading ? (isSignup ? 'Creating...' : 'Signing in...') : (isSignup ? 'Create account' : 'Sign in')}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <div className="google-login-wrap">
          <button
              className="google-btn"
              type="button"
              onClick={onGoogle}
            >
              <img src="/google.svg" alt="Google" />
              <span>Sign in with Google</span>
            </button>
          </div>

          <p className="auth-footnote">
            {isSignup
              ? <>Already have an account? <button type="button" onClick={() => switchMode('signin')}>Sign in</button></>
              : <>No account yet? <button type="button" onClick={() => switchMode('signup')}>Create one</button></>
            }
          </p>
        </div>
      </div>
    </div>
  )
}