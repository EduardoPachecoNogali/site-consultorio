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
