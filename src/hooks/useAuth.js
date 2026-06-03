import { useCallback, useEffect, useState } from 'react'

const USERS_KEY = 'nova-auth-users'
const CURRENT_KEY = 'nova-auth-current-user'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function publicUser(user) {
  if (!user) return null
  const { password, ...safeUser } = user
  return safeUser
}

function makeId(email, provider = 'password') {
  return `${provider}:${email.trim().toLowerCase()}`
}

export function useAuth() {
  const [user, setUser] = useState(() => {
    const currentId = localStorage.getItem(CURRENT_KEY)
    const users = readJson(USERS_KEY, [])
    return publicUser(users.find(item => item.id === currentId))
  })

  useEffect(() => {
    if (user?.id) localStorage.setItem(CURRENT_KEY, user.id)
    else localStorage.removeItem(CURRENT_KEY)
  }, [user])

  const signUp = useCallback(({ name, email, password }) => {
    const normalizedEmail = email.trim().toLowerCase()
    const id = makeId(normalizedEmail)
    const users = readJson(USERS_KEY, [])

    if (users.some(item => item.id === id)) {
      throw new Error('An account already exists with this email.')
    }

    const nextUser = {
      id,
      name: name.trim() || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      password,
      provider: 'password',
      createdAt: new Date().toISOString(),
    }

    saveUsers([...users, nextUser])
    setUser(publicUser(nextUser))
  }, [])

  const signIn = useCallback(({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase()
    const id = makeId(normalizedEmail)
    const users = readJson(USERS_KEY, [])
    const match = users.find(item => item.id === id && item.password === password)

    if (!match) {
      throw new Error('Email or password is incorrect.')
    }

    setUser(publicUser(match))
  }, [])

  const signInWithGoogle = useCallback((googleUser) => {
    const normalizedEmail = googleUser.email?.trim().toLowerCase()
    const id = googleUser.id || makeId(normalizedEmail, 'google')
    const users = readJson(USERS_KEY, [])
    let nextUser = users.find(item => item.id === id)

    if (!nextUser) {
      nextUser = {
        id,
        name: googleUser.name || normalizedEmail?.split('@')[0] || 'Google User',
        email: normalizedEmail,
        picture: googleUser.picture,
        provider: 'google',
        createdAt: new Date().toISOString(),
      }
      saveUsers([...users, nextUser])
    } else {
      nextUser = {
        ...nextUser,
        name: googleUser.name || nextUser.name,
        email: normalizedEmail || nextUser.email,
        picture: googleUser.picture || nextUser.picture,
        provider: 'google',
      }
      saveUsers(users.map(item => item.id === id ? nextUser : item))
    }

    setUser(publicUser(nextUser))
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
  }, [])

  return { user, signIn, signUp, signInWithGoogle, signOut }
}
