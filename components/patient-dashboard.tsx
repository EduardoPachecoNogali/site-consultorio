'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Brain, Calendar, Clock, Video, User, LogOut } from 'lucide-react'
import { appConfig } from '@/lib/app-config'

interface PatientDashboardProps {
  userName: string
  userEmail: string
  onJoinCall: (meetingUrl: string) => void
  onLogout: () => void
}

type NextAppointment = null | {
  id: string
  doctor: string
  specialty: string
  date: string
  time: string
  meetingUrl: string
}

export function PatientDashboard({ userName, userEmail, onJoinCall, onLogout }: PatientDashboardProps) {
  const [nextAppointment, setNextAppointment] = useState<NextAppointment>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!userEmail) return
    setIsLoading(true)
    setLoadError('')
    fetch(`/api/patients/next?email=${encodeURIComponent(userEmail)}`)
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 404) {
            setNextAppointment(null)
            return null
          }
          const data = await response.json()
          throw new Error(data.error || 'Não foi possível carregar a próxima consulta.')
        }
        return response.json()
      })
      .then((data) => {
        if (!data) return
        setNextAppointment({
          id: data.appointment.id,
          doctor: data.appointment.psychologistName || 'Psicólogo(a)',
          specialty: data.appointment.specialty || 'Psicologia',
          date: new Date(data.appointment.date).toLocaleDateString('pt-BR'),
          time: data.appointment.time,
          meetingUrl: data.appointment.meetingUrl,
        })
      })
      .catch((error: Error) => {
        setLoadError(error.message)
      })
      .finally(() => setIsLoading(false))
  }, [userEmail])

  const handleJoinCall = () => {
    if (!nextAppointment?.meetingUrl) {
      setLoadError('Link da consulta indisponível no momento.')
      return
    }
    onJoinCall(nextAppointment.meetingUrl)
  }
  const pastAppointments: { date: string; doctor: string; duration: string }[] = []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Brain className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{appConfig.name}</h1>
              <p className="text-xs text-muted-foreground">Plataforma de Teleatendimento</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-foreground"
            onClick={onLogout}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-foreground text-balance">
            Olá, {userName}
          </h2>
          <p className="mt-2 text-muted-foreground">
            Bem-vindo de volta à sua jornada de bem-estar
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Next Appointment - Main Column */}
          <div className="lg:col-span-2">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Calendar className="h-5 w-5 text-primary" />
                  Próxima Consulta
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Detalhes da sua próxima sessão
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                    Carregando próxima consulta...
                  </div>
                ) : loadError ? (
                  <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-destructive">
                    {loadError}
                  </div>
                ) : nextAppointment ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-4 rounded-lg bg-muted/50 p-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="font-semibold text-foreground">{nextAppointment.doctor}</p>
                          <p className="text-sm text-muted-foreground">{nextAppointment.specialty}</p>
                        </div>

                        <Separator className="bg-border/50" />

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Data</p>
                              <p className="text-sm font-medium text-foreground">{nextAppointment.date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Horário</p>
                              <p className="text-sm font-medium text-foreground">{nextAppointment.time}</p>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={handleJoinCall}
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                        >
                          <Video className="mr-2 h-4 w-4" />
                          Entrar na Chamada
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg bg-accent/20 p-3">
                      <p className="text-sm text-accent-foreground">
                        <strong>Nota:</strong> Entre 5 minutos antes do horário agendado. Certifique-se de estar em um local silencioso e privado.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                    Nenhuma consulta agendada. Assim que uma sessão for marcada, ela aparecerá aqui.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Past Appointments */}
          <div className="lg:col-span-1">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-foreground">Consultas Anteriores</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Histórico de sessões
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pastAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma consulta anterior registrada ainda.
                  </p>
                ) : (
                  pastAppointments.map((appointment, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-border/50 bg-card p-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{appointment.date}</p>
                        <p className="text-xs text-muted-foreground">{appointment.doctor}</p>
                        <p className="text-xs text-muted-foreground">{appointment.duration}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
