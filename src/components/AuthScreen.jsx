import React, { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'

const initialForm = {
  name: '',
  email: '',
  password: '',
}

export default function AuthScreen({ onSignIn, onSignUp, onGoogle }) {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  const isSignup = mode === 'signup'

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const submit = (event) => {
    event.preventDefault()
    setError('')

    try {
      if (isSignup) {
        onSignUp(form)
      } else {
        onSignIn(form)
      }
    } catch (err) {
      setError(err.message || 'Unable to continue.')
    }
  }

  const submitGoogle = async ({ credential }) => {
    setError('')
    setGoogleLoading(true)

    try {
      const res = await fetch('http://localhost:8000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.detail || 'Google verification failed.')
      }

      onGoogle(data)
    } catch (err) {
      setError(err.message || 'Unable to continue with Google.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setForm(initialForm)
    setError('')
  }

  return (
    <div className="auth-page">
      <div className="auth-orbit auth-orbit-one" />
      <div className="auth-orbit auth-orbit-two" />

      <section className="auth-showcase" aria-hidden="true">
        <div className="auth-logo">
          <i className="ti ti-sparkles" />
        </div>
        <h1>Nova AI</h1>
        <p>Personal chat spaces with memory for every account.</p>
        <div className="auth-preview">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className={`auth-panel ${isSignup ? 'signup-mode' : ''}`}>
        <div className="auth-tabs" role="tablist" aria-label="Authentication">
          <button
            className={!isSignup ? 'active' : ''}
            type="button"
            onClick={() => switchMode('signin')}
          >
            Login
          </button>
          <button
            className={isSignup ? 'active' : ''}
            type="button"
            onClick={() => switchMode('signup')}
          >
            Sign up
          </button>
        </div>

        <div className="auth-copy">
          <h2>{isSignup ? 'Create your ID' : 'Welcome back'}</h2>
          <p>{isSignup ? 'Start a private Nova chat history.' : 'Pick up from your saved conversations.'}</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {isSignup && (
            <label>
              Name
              <input
                value={form.name}
                onChange={event => updateForm('name', event.target.value)}
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </label>
          )}

          <label>
            Email ID
            <input
              value={form.email}
              onChange={event => updateForm('email', event.target.value)}
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
              onChange={event => updateForm('password', event.target.value)}
              placeholder="Enter password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              minLength={4}
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-primary" type="submit">
            <i className={isSignup ? 'ti ti-user-plus' : 'ti ti-login-2'} />
            {isSignup ? 'Create ID' : 'Login'}
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
          {googleLoading && (
            <div className="google-loading">
              <span />
              Verifying Google account
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
