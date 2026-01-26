'use client'

import { useState } from 'react'
import { AuthScreen } from '@/components/auth-screen'
import { PatientDashboard } from '@/components/patient-dashboard'
import { VideoConsultation } from '@/components/video-consultation'
import { PsychologistDashboard } from '@/components/psychologist-dashboard-complete'
import { PsychologistProfile } from '@/lib/psychologists'
import { appConfig } from '@/lib/app-config'

type ViewType = 'auth' | 'dashboard' | 'video' | 'psychologist'

export default function Page() {
  const [currentView, setCurrentView] = useState<ViewType>('auth')
  const [userName, setUserName] = useState('')
  const [psychologistId, setPsychologistId] = useState<string | null>(null)

  const handleLogin = (name: string) => {
    setUserName(name)
    setCurrentView('dashboard')
  }

  const handlePsychologistLogin = (profile: PsychologistProfile) => {
    setUserName(
      profile.name || profile.email.split('@')[0] || `Profissional ${appConfig.name}`,
    )
    setPsychologistId(profile.id)
    setCurrentView('psychologist')
  }

  const handleJoinCall = () => {
    setCurrentView('video')
  }

  const handleEndCall = () => {
    setCurrentView('dashboard')
  }

  const handleLogout = () => {
    setUserName('')
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
          onJoinCall={handleJoinCall}
          onLogout={handleLogout}
        />
      )}
      {currentView === 'video' && <VideoConsultation onEndCall={handleEndCall} />}
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
