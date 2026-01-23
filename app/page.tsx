'use client'

import { useState } from 'react'
import { AuthScreen } from '@/components/auth-screen'
import { PatientDashboard } from '@/components/patient-dashboard'
import { VideoConsultation } from '@/components/video-consultation'
import { PsychologistDashboard } from '@/components/psychologist-dashboard-complete'
import { PsychologistProfile } from '@/lib/psychologists'

type ViewType = 'auth' | 'dashboard' | 'video' | 'psychologist'

export default function Page() {
  const [currentView, setCurrentView] = useState<ViewType>('auth')
  const [userName, setUserName] = useState('')

  const handleLogin = (name: string) => {
    setUserName(name)
    setCurrentView('dashboard')
  }

  const handlePsychologistLogin = (profile: PsychologistProfile) => {
    setUserName(profile.name || profile.email.split('@')[0] || 'Profissional MindCare')
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
          onLogout={handleLogout}
        />
      )}
    </main>
  )
}
