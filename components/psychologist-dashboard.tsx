'use client'

import { useState } from 'react'
import { Calendar as CalendarIcon, Clock, User, Search, Plus, Edit, ChevronLeft, ChevronRight, LogOut, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Appointment {
  id: string
  patientName: string
  time: string
  duration: string
  status: 'upcoming' | 'in-progress' | 'completed'
  notes: string
  date: Date
}

interface PsychologistDashboardProps {
  psychologistName: string
  onLogout: () => void
}

export function PsychologistDashboard({ psychologistName, onLogout }: PsychologistDashboardProps) {
  console.log('[v0] PsychologistDashboard rendering for:', psychologistName)
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  const [appointments, setAppointments] = useState<Appointment[]>([])

  const todayAppointments = appointments.filter(
    (apt) => apt.date.toDateString() === selectedDate.toDateString()
  )

  const filteredAppointments = todayAppointments.filter((apt) =>
    apt.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSaveAppointment = () => {
    if (editingAppointment) {
      setAppointments(
        appointments.map((apt) =>
          apt.id === editingAppointment.id ? editingAppointment : apt
        )
      )
      setIsEditDialogOpen(false)
      setEditingAppointment(null)
    }
  }

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-700 border-green-500/20'
      case 'in-progress':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
      case 'upcoming':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
    }
  }

  const getStatusLabel = (status: Appointment['status']) => {
    switch (status) {
      case 'completed':
        return 'Concluída'
      case 'in-progress':
        return 'Em andamento'
      case 'upcoming':
        return 'Agendada'
    }
  }

  const stats = {
    total: todayAppointments.length,
    completed: todayAppointments.filter((a) => a.status === 'completed').length,
    upcoming: todayAppointments.filter((a) => a.status === 'upcoming').length,
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Área do Psicólogo</h1>
                <p className="text-xs text-muted-foreground">Dr(a). {psychologistName}</p>
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
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content - Appointments List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Consultas Hoje</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                      <Clock className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">{stats.completed}</p>
                      <p className="text-xs text-muted-foreground">Concluídas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">{stats.upcoming}</p>
                      <p className="text-xs text-muted-foreground">Pendentes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Date Navigation & Search */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newDate = new Date(selectedDate)
                        newDate.setDate(newDate.getDate() - 1)
                        setSelectedDate(newDate)
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2 bg-transparent">
                          <CalendarIcon className="h-4 w-4" />
                          {selectedDate.toLocaleDateString('pt-BR', {
                            weekday: 'long',
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                        />
                      </PopoverContent>
                    </Popover>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newDate = new Date(selectedDate)
                        newDate.setDate(newDate.getDate() + 1)
                        setSelectedDate(newDate)
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar paciente..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Appointments Timeline */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground">Agenda do Dia</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {filteredAppointments.length} consulta(s) para hoje
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  {filteredAppointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CalendarIcon className="h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-4 text-sm text-muted-foreground">
                        Nenhuma consulta encontrada para esta data
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="group relative rounded-lg border border-border/50 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-foreground">
                                      {appointment.patientName}
                                    </h3>
                                    <Badge
                                      variant="outline"
                                      className={getStatusColor(appointment.status)}
                                    >
                                      {getStatusLabel(appointment.status)}
                                    </Badge>
                                  </div>
                                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5" />
                                      {appointment.time}
                                    </span>
                                    <span>•</span>
                                    <span>{appointment.duration}</span>
                                  </div>
                                </div>

                                <Dialog
                                  open={isEditDialogOpen && editingAppointment?.id === appointment.id}
                                  onOpenChange={(open) => {
                                    setIsEditDialogOpen(open)
                                    if (!open) setEditingAppointment(null)
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                                      onClick={() => setEditingAppointment(appointment)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                      <DialogTitle>Editar Consulta</DialogTitle>
                                      <DialogDescription>
                                        Altere os detalhes da consulta de {appointment.patientName}
                                      </DialogDescription>
                                    </DialogHeader>
                                    {editingAppointment && (
                                      <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="edit-time">Horário</Label>
                                          <Input
                                            id="edit-time"
                                            type="time"
                                            value={editingAppointment.time}
                                            onChange={(e) =>
                                              setEditingAppointment({
                                                ...editingAppointment,
                                                time: e.target.value,
                                              })
                                            }
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="edit-duration">Duração</Label>
                                          <Input
                                            id="edit-duration"
                                            value={editingAppointment.duration}
                                            onChange={(e) =>
                                              setEditingAppointment({
                                                ...editingAppointment,
                                                duration: e.target.value,
                                              })
                                            }
                                            placeholder="Ex: 50 min"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="edit-notes">Anotações Confidenciais</Label>
                                          <Textarea
                                            id="edit-notes"
                                            value={editingAppointment.notes}
                                            onChange={(e) =>
                                              setEditingAppointment({
                                                ...editingAppointment,
                                                notes: e.target.value,
                                              })
                                            }
                                            placeholder="Adicione suas observações sobre o paciente..."
                                            rows={6}
                                            className="resize-none"
                                          />
                                          <p className="text-xs text-muted-foreground">
                                            Estas anotações são privadas e confidenciais
                                          </p>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                          <Button
                                            variant="outline"
                                            onClick={() => setIsEditDialogOpen(false)}
                                          >
                                            Cancelar
                                          </Button>
                                          <Button onClick={handleSaveAppointment}>
                                            Salvar Alterações
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                              </div>

                              {appointment.notes && (
                                <div className="rounded-md bg-muted/50 p-3">
                                  <div className="flex items-start gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                      {appointment.notes}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Calendar & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Calendar Widget */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground">Calendário</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Selecione uma data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start gap-2 bg-transparent" variant="outline">
                  <Plus className="h-4 w-4" />
                  Nova Consulta
                </Button>
                <Button className="w-full justify-start gap-2 bg-transparent" variant="outline">
                  <CalendarIcon className="h-4 w-4" />
                  Ver Semana Completa
                </Button>
                <Button className="w-full justify-start gap-2 bg-transparent" variant="outline">
                  <FileText className="h-4 w-4" />
                  Relatórios
                </Button>
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground">Lembretes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <p className="text-sm text-amber-700">
                    Lembrete: Atualizar prontuário da Ana Costa
                  </p>
                </div>
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <p className="text-sm text-blue-700">
                    Próxima supervisão: Segunda às 10h
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
