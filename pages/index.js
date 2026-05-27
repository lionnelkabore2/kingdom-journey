// pages/index.js
// Page principale de Kingdom Journey
// Next.js sert cette page sur http://localhost:3000

import Head from 'next/head'
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirige vers le fichier HTML statique de l'app
    window.location.href = '/index.html'
  }, [])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0D3B5E, #4A9FD4)',
      color: 'white',
      fontFamily: 'sans-serif',
      fontSize: '18px'
    }}>
      <Head>
        <title>Kingdom Journey</title>
      </Head>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '60px', marginBottom: '16px' }}>✦</div>
        <div>Chargement de Kingdom Journey...</div>
      </div>
    </div>
  )
}
