import { ALLOWED_EMAIL_DOMAIN } from '../config'

// Sign-in screen shown in Firebase mode until a valid company user is present.
export default function LoginGate({ onSignIn, error }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg)',
        padding: 24,
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '36px 40px',
          width: 400,
          maxWidth: '100%',
          textAlign: 'center',
          boxShadow: 'var(--sh)',
        }}
      >
        <div
          className="mark"
          style={{
            width: 44,
            height: 44,
            background: 'var(--nav)',
            borderRadius: 9,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 20,
            margin: '0 auto 16px',
          }}
        >
          A
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Access Service Desk</h1>
        <p style={{ color: 'var(--soft)', marginBottom: 24, fontSize: 13.5 }}>
          Sign in with your Fuse Energy Google account to raise and track access requests.
        </p>
        <button className="btn primary" style={{ width: '100%', height: 40, justifyContent: 'center' }} onClick={onSignIn}>
          Continue with Google
        </button>
        {error && (
          <div className="validation" style={{ marginTop: 16, textAlign: 'left' }}>
            {error}
          </div>
        )}
        <p style={{ color: 'var(--faint)', marginTop: 18, fontSize: 12 }}>
          Restricted to @{ALLOWED_EMAIL_DOMAIN} accounts.
        </p>
      </div>
    </div>
  )
}
