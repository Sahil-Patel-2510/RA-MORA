
import { useState, type FormEvent } from 'react'

interface AdminLoginProps {
  onLogin: () => void
}

const API_URL = 'http://localhost:8788'

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      const data = await result.json()

      if (!result.ok || data.success !== true) {
        throw new Error(data.message || 'Login failed')
      }

      // Verify that the session cookie is working
      const sessionResponse = await fetch(
        `${API_URL}/api/admin/me`,
        {
          method: 'GET',
          credentials: 'include',
        }
      )

      const sessionData = await sessionResponse.json()

      if (
        !sessionResponse.ok ||
        sessionData.authenticated !== true
      ) {
        throw new Error(
          'Login successful, but session verification failed. Please try again.'
        )
      }

      setPassword('')
      onLogin()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: '#080b18',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
    }}>
      <form
        onSubmit={handleLogin}
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '40px',
          background: '#11182b',
          border: '1px solid #303b58',
          borderRadius: '18px',
          boxSizing: 'border-box',
        }}
      >
        <h1 style={{ textAlign: 'center', marginBottom: '8px' }}>
          RA-MORA
        </h1>

        <p style={{ textAlign: 'center', color: '#9ba8c4' }}>
          Technologies | Admin Portal
        </p>

        <h2 style={{ marginTop: '35px' }}>Admin Login</h2>

        <label htmlFor="admin-password">Password</label>

        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter admin password"
          required
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '14px',
            marginTop: '10px',
            marginBottom: '20px',
            borderRadius: '8px',
            border: '1px solid #394765',
            background: '#080f20',
            color: 'white',
          }}
        />

        {error && (
          <p style={{ color: '#ff7777' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            border: 'none',
            borderRadius: '8px',
            background: 'linear-gradient(90deg, #7047ed, #2879f5)',
            color: 'white',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Signing in...' : 'Secure Login →'}
        </button>

        <p style={{
          textAlign: 'center',
          color: '#8390aa',
          fontSize: '12px',
          marginTop: '25px',
        }}>
          Protected Admin Access © RA-MORA Technologies
        </p>
      </form>
    </div>
  )
}
