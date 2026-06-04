import React, { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'

const initialForm = { name: '', email: '', password: '' }

const PREVIEW_MESSAGES = [
  { role: 'user',  text: 'Can you summarise our Q3 sales data?' },
  { role: 'ai',    text: 'Sure! Revenue was up 18% vs Q2. Top category: Enterprise subscriptions.' },
  { role: 'user',  text: 'Which region underperformed?' },
  { role: 'ai',    text: 'APAC came in 11% below target — mainly due to delayed onboarding.' },
]

export default function AuthScreen({ onSignIn, onSignUp, onGoogle }) {
  const [mode, setMode]   = useState('signin')
  const [form, setForm]   = useState(initialForm)
  const [error, setError] = useState('')

  const isSignup = mode === 'signup'

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const submit = (e) => {
    e.preventDefault()
    setError('')
    try {
      isSignup ? onSignUp(form) : onSignIn(form)
    } catch (err) {
      setError(err.message || 'Unable to continue.')
    }
  }

  const submitGoogle = ({ credential }) => {
    setError('')
    try {
      const payload = JSON.parse(atob(credential.split('.')[1]))
      onGoogle({
        id: `google:${payload.sub}`,
        name: payload.name || payload.email,
        email: payload.email,
        picture: payload.picture,
        provider: 'google',
      })
    } catch {
      setError('Google sign-in failed. Please try again.')
    }
  }

  const switchMode = (next) => {
    setMode(next)
    setForm(initialForm)
    setError('')
  }

  return (
    <div className="auth-page">

      {/* ── Left: brand panel ── */}
      <div className="auth-brand">
        <div className="auth-brand-inner">
          <div className="auth-wordmark">
            <span className="auth-wordmark-dot" aria-hidden="true" />
            Nova AI
          </div>
          <p className="auth-tagline">Your conversations, your context, always remembered.</p>

          {/* Floating chat preview */}
          <div className="auth-chat-preview">
            {PREVIEW_MESSAGES.map((m, i) => (
              <div
                key={i}
                className={`auth-msg auth-msg--${m.role}`}
                style={{ animationDelay: `${i * 0.18}s` }}
              >
                {m.role === 'ai' && (
                  <div className="auth-msg-avatar" aria-hidden="true">
                    <i className="ti ti-sparkles" />
                  </div>
                )}
                <div className="auth-msg-bubble">{m.text}</div>
              </div>
            ))}

            {/* Typing indicator */}
            <div className="auth-msg auth-msg--ai" style={{ animationDelay: '0.8s' }}>
              <div className="auth-msg-avatar" aria-hidden="true">
                <i className="ti ti-sparkles" />
              </div>
              <div className="auth-msg-bubble auth-typing">
                <span /><span /><span />
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
              <label>
                Name
                <input
                  value={form.name}
                  onChange={e => updateForm('name', e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  required
                />
              </label>
            )}
            <label>
              Email
              <input
                value={form.email}
                onChange={e => updateForm('email', e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                required
              />
            </label>
            <label>
              Password
              <input
                value={form.password}
                onChange={e => updateForm('password', e.target.value)}
                placeholder={isSignup ? 'Create a password' : 'Enter password'}
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                minLength={4}
                required
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-primary" type="submit">
              <i className={isSignup ? 'ti ti-user-plus' : 'ti ti-login-2'} aria-hidden="true" />
              {isSignup ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <div className="google-login-wrap">
            <GoogleLogin
              onSuccess={submitGoogle}
              onError={() => setError('Google sign-in failed.')}
              useOneTap={false}
              text="signin_with"
              shape="rectangular"
              width="100%"
            />
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