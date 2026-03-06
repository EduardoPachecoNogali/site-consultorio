'use client'

import { useEffect, useState } from 'react'
import { AuthScreen } from '@/components/auth-screen'
import { PatientDashboard } from '@/components/patient-dashboard'
import { PsychologistDashboard } from '@/components/psychologist-dashboard-complete'
import { PsychologistProfile } from '@/lib/psychologists'
import { appConfig } from '@/lib/app-config'

type ViewType = 'auth' | 'dashboard' | 'psychologist'

export default function Page() {
  const [currentView, setCurrentView] = useState<ViewType>('auth')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [psychologistId, setPsychologistId] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mindcare-session')
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as {
            currentView?: ViewType
            userName?: string
            userEmail?: string
            psychologistId?: string | null
          }
          if (parsed.currentView) setCurrentView(parsed.currentView)
          if (parsed.userName) setUserName(parsed.userName)
          if (parsed.userEmail) setUserEmail(parsed.userEmail)
          if (parsed.psychologistId) setPsychologistId(parsed.psychologistId)
        } catch {
          console.warn('[session] sessão inválida, limpando armazenamento')
          localStorage.removeItem('mindcare-session')
        }
      }
    } catch (error) {
      console.warn('[session] falha ao restaurar sessão', error)
    } finally {
      setIsHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    try {
      localStorage.setItem(
        'mindcare-session',
        JSON.stringify({
          currentView,
          userName,
          userEmail,
          psychologistId,
        }),
      )
    } catch (error) {
      console.warn('[session] falha ao salvar sessão', error)
    }
  }, [currentView, userName, userEmail, psychologistId, isHydrated])

  const handleLogin = (name: string, email: string) => {
    setUserName(name)
    setUserEmail(email)
    setCurrentView('dashboard')
  }

  const handlePsychologistLogin = (profile: PsychologistProfile) => {
    setUserName(
      profile.name || profile.email.split('@')[0] || `Profissional ${appConfig.name}`,
    )
    setPsychologistId(profile.id)
    setCurrentView('psychologist')
  }

  const handleJoinCall = (meetingUrl: string) => {
    window.open(meetingUrl, '_blank', 'noopener,noreferrer')
  }

  const handleLogout = () => {
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
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary animate-pulse">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7 text-primary-foreground"
          >
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
            <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
            <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
            <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
            <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
            <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
            <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
            <path d="M6 18a4 4 0 0 1-1.967-.516" />
            <path d="M19.967 17.484A4 4 0 0 1 18 18" />
          </svg>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Carregando...
        </div>
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
