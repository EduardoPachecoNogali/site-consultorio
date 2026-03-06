'use client'

import { useEffect, useState } from 'react'
import { AuthScreen } from '@/components/auth-screen'
import { PatientDashboard } from '@/components/patient-dashboard'
import { PsychologistDashboard } from '@/components/psychologist-dashboard-complete'
import { PsychologistProfile } from '@/lib/psychologists'
import { appConfig } from '@/lib/app-config'
import { readJson } from '@/lib/http'

type ViewType = 'auth' | 'dashboard' | 'psychologist'

export default function Page() {
  const [currentView, setCurrentView] = useState<ViewType>('auth')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [psychologistId, setPsychologistId] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const restoreSession = async () => {
      let parsed: {
        currentView?: ViewType
        userName?: string
        userEmail?: string
      } | null = null

      try {
        const stored = localStorage.getItem('mindcare-session')
        if (stored) {
          parsed = JSON.parse(stored) as {
            currentView?: ViewType
            userName?: string
            userEmail?: string
          }
        }
      } catch (error) {
        console.warn('[session] falha ao restaurar sessão', error)
        localStorage.removeItem('mindcare-session')
      }

      try {
        if (parsed?.currentView === 'psychologist') {
          const response = await fetch('/api/psychologists/me', { credentials: 'include' })
          if (response.ok) {
            const data = await readJson<{ psychologist?: PsychologistProfile | null }>(response, {})
            if (data.psychologist) {
              setUserName(
                data.psychologist.name ||
                  data.psychologist.email.split('@')[0] ||
                  `Profissional ${appConfig.name}`,
              )
              setPsychologistId(data.psychologist.id)
              setCurrentView('psychologist')
              return
            }
          }
          localStorage.removeItem('mindcare-session')
        } else if (parsed) {
          if (parsed.currentView === 'dashboard' && parsed.userEmail) {
            fetch('/api/patients/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: parsed.userEmail }),
            }).catch((error) => {
              console.warn('[session] falha ao restaurar sessão do paciente', error)
            })
          }
          if (parsed.currentView) setCurrentView(parsed.currentView)
          if (parsed.userName) setUserName(parsed.userName)
          if (parsed.userEmail) setUserEmail(parsed.userEmail)
        }
      } catch (error) {
        console.warn('[session] falha ao validar sessão do psicólogo', error)
        localStorage.removeItem('mindcare-session')
      } finally {
        setIsHydrated(true)
      }
    }

    restoreSession()
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    try {
      if (currentView === 'psychologist') {
        localStorage.setItem(
          'mindcare-session',
          JSON.stringify({
            currentView,
          }),
        )
        return
      }

      localStorage.setItem(
        'mindcare-session',
        JSON.stringify({
          currentView,
          userName,
          userEmail,
        }),
      )
    } catch (error) {
      console.warn('[session] falha ao salvar sessão', error)
    }
  }, [currentView, userName, userEmail, isHydrated])

  const handleLogin = (name: string, email: string) => {
    fetch('/api/patients/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .catch((error) => {
        console.warn('[session] falha ao criar sessão do paciente', error)
      })
      .finally(() => {
        setUserName(name)
        setUserEmail(email)
        setCurrentView('dashboard')
      })
  }

  const handlePsychologistLogin = (profile: PsychologistProfile) => {
    setUserName(
      profile.name || profile.email.split('@')[0] || `Profissional ${appConfig.name}`,
    )
    setPsychologistId(profile.id)
    setCurrentView('psychologist')
  }

  const handleJoinCall = (meetingUrl: string) => {
    try {
      const parsed = new URL(meetingUrl)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Protocolo inválido.')
      }
      window.open(parsed.toString(), '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.warn('[meeting] link inválido', error)
    }
  }

  const handleLogout = async () => {
    if (currentView === 'psychologist') {
      try {
        await fetch('/api/psychologists/logout', { method: 'POST' })
      } catch (error) {
        console.warn('[session] falha ao encerrar sessão do psicólogo', error)
      }
    } else if (currentView === 'dashboard') {
      try {
        await fetch('/api/patients/logout', { method: 'POST' })
      } catch (error) {
        console.warn('[session] falha ao encerrar sessão do paciente', error)
      }
    }

    setUserName('')
    setUserEmail('')
    setPsychologistId(null)
    setCurrentView('auth')
    try {
      localStorage.removeItem('mindcare-session')
    } catch (error) {
      console.warn('[session] falha ao limpar sessão', error)
    }
  }

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {currentView === 'auth' && (
        <AuthScreen 
          onLogin={handleLogin} 
          onPsychologistLogin={handlePsychologistLogin}
        />
      )}
      {currentView === 'dashboard' && (
        <PatientDashboard 
          userName={userName} 
          userEmail={userEmail}
          onJoinCall={handleJoinCall}
          onLogout={handleLogout}
        />
      )}
      {currentView === 'psychologist' && (
        <PsychologistDashboard
          psychologistName={userName}
          psychologistId={psychologistId ?? ''}
          onLogout={handleLogout}
        />
      )}
    </main>
  )
}
