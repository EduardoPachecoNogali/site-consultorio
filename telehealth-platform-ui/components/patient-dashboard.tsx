'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Brain, Calendar, Clock, Video, User, LogOut } from 'lucide-react'

interface PatientDashboardProps {
  userName: string
  onJoinCall: () => void
  onLogout: () => void
}

export function PatientDashboard({ userName, onJoinCall, onLogout }: PatientDashboardProps) {
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
              <h1 className="text-xl font-semibold text-foreground">MindCare</h1>
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
                <div className="space-y-3">
                  <div className="flex items-start gap-4 rounded-lg bg-muted/50 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="font-semibold text-foreground">Dra. Sarah Mitchell</p>
                        <p className="text-sm text-muted-foreground">Psicóloga Clínica</p>
                      </div>
                      
                      <Separator className="bg-border/50" />
                      
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Data</p>
                            <p className="text-sm font-medium text-foreground">Segunda, 27 Jan 2026</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Horário</p>
                            <p className="text-sm font-medium text-foreground">14:00 - 15:00</p>
                          </div>
                        </div>
                      </div>

                      <Button 
                        onClick={onJoinCall}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                      >
                        <Video className="mr-2 h-4 w-4" />
                        Entrar na Chamada
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-accent/20 p-3">
                  <p className="text-sm text-accent-foreground">
                    <strong>Nota:</strong> Entre 5 minutos antes do horário agendado. Certifique-se de estar em um local silencioso e privado.
                  </p>
                </div>
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
                {[
                  { date: '20 Jan 2026', doctor: 'Dra. Sarah Mitchell', duration: '50 min' },
                  { date: '13 Jan 2026', doctor: 'Dra. Sarah Mitchell', duration: '50 min' },
                  { date: '6 Jan 2026', doctor: 'Dra. Sarah Mitchell', duration: '50 min' },
                ].map((appointment, i) => (
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
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
