'use client'

import { useState } from 'react'
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
