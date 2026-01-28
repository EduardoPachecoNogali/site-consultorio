'use client'

import { useState } from 'react'
import { Calendar as CalendarIcon, Clock, User, Search, Plus, Edit, ChevronLeft, ChevronRight, LogOut, FileText, Video, Trash2, Mail, Check, X, Calendar as CalendarDays } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { appConfig } from '@/lib/app-config'

type AppointmentStatus = 'upcoming' | 'in-progress' | 'completed' | 'cancelled' | 'rescheduled'

interface Appointment {
  id: string
  patientName: string
  time: string
  duration: string
  status: AppointmentStatus
  notes: string
  date: Date
  notificationPreference: 'email'
  patientContact: string
  meetingUrl?: string
}

interface Reminder {
  id: string
  text: string
  color: 'amber' | 'blue' | 'green' | 'red'
}

interface PsychologistDashboardProps {
  psychologistName: string
  onLogout: () => void
}

export function PsychologistDashboard({ psychologistName, onLogout }: PsychologistDashboardProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [showWeekView, setShowWeekView] = useState(false)
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false)
  const [newReminderText, setNewReminderText] = useState('')
  const [newReminderColor, setNewReminderColor] = useState<'amber' | 'blue' | 'green' | 'red'>('blue')
  
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])

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

  const handleDeleteAppointment = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta consulta?')) {
      setAppointments(appointments.filter((apt) => apt.id !== id))
    }
  }

  const handleStartCall = (appointment: Appointment) => {
    const contact = appointment.patientContact
    const baseUrl = appConfig.videoBaseUrl.replace(/\/$/, '')
    const message = `Olá ${appointment.patientName}, sua consulta está iniciando. Entre no link: ${baseUrl}/${appointment.id}`

    alert(`Email enviado para ${contact}\n\nAssunto: Sua consulta está iniciando\n\n${message}`)
    // Em produção: integrar com serviço de email
  }

  const handleSaveReminder = () => {
    if (editingReminder) {
      setReminders(
        reminders.map((rem) =>
          rem.id === editingReminder.id ? editingReminder : rem
        )
      )
      setIsReminderDialogOpen(false)
      setEditingReminder(null)
    }
  }

  const handleAddReminder = () => {
    if (newReminderText.trim()) {
      const newReminder: Reminder = {
        id: Date.now().toString(),
        text: newReminderText,
        color: newReminderColor,
      }
      setReminders([...reminders, newReminder])
      setNewReminderText('')
      setNewReminderColor('blue')
      setIsAddReminderOpen(false)
    }
  }

  const handleDeleteReminder = (id: string) => {
    setReminders(reminders.filter((rem) => rem.id !== id))
  }

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-700 border-green-500/20'
      case 'in-progress':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
      case 'upcoming':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 border-red-500/20'
      case 'rescheduled':
        return 'bg-purple-500/10 text-purple-700 border-purple-500/20'
    }
  }

  const getStatusLabel = (status: AppointmentStatus) => {
    switch (status) {
      case 'completed':
        return 'Concluída'
      case 'in-progress':
        return 'Em andamento'
      case 'upcoming':
        return 'Agendada'
      case 'cancelled':
        return 'Cancelada'
      case 'rescheduled':
        return 'Remarcada'
    }
  }

  const getReminderColorClasses = (color: Reminder['color']) => {
    switch (color) {
      case 'amber':
        return 'bg-amber-500/10 border-amber-500/20'
      case 'blue':
        return 'bg-blue-500/10 border-blue-500/20'
      case 'green':
        return 'bg-green-500/10 border-green-500/20'
      case 'red':
        return 'bg-red-500/10 border-red-500/20'
    }
  }

  const getReminderTextColor = (color: Reminder['color']) => {
    switch (color) {
      case 'amber':
        return 'text-amber-700'
      case 'blue':
        return 'text-blue-700'
      case 'green':
        return 'text-green-700'
      case 'red':
        return 'text-red-700'
    }
  }

  const stats = {
    total: todayAppointments.length,
    completed: todayAppointments.filter((a) => a.status === 'completed').length,
    upcoming: todayAppointments.filter((a) => a.status === 'upcoming').length,
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Área do Psicólogo</h1>
                <p className="text-xs text-muted-foreground">{psychologistName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent" disabled>
                <Mail className="h-4 w-4" />
                Preferência: Email
              </Button>
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
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
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
                      <Check className="h-5 w-5 text-green-600" />
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

                                <div className="flex items-center gap-1">
                                  {appointment.status === 'upcoming' && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="gap-2"
                                      onClick={() => handleStartCall(appointment)}
                                    >
                                      <Video className="h-4 w-4" />
                                      Iniciar Chamada
                                    </Button>
                                  )}
                                  
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
                                        className="h-8 w-8"
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
                                          <div className="grid gap-4 sm:grid-cols-2">
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
                                          </div>
                                          <div className="space-y-2">
                                            <Label htmlFor="edit-status">Status</Label>
                                            <Select
                                              value={editingAppointment.status}
                                              onValueChange={(value: AppointmentStatus) =>
                                                setEditingAppointment({
                                                  ...editingAppointment,
                                                  status: value,
                                                })
                                              }
                                            >
                                              <SelectTrigger id="edit-status">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="upcoming">Agendada</SelectItem>
                                                <SelectItem value="in-progress">Em andamento</SelectItem>
                                                <SelectItem value="completed">Concluída</SelectItem>
                                                <SelectItem value="cancelled">Cancelada</SelectItem>
                                                <SelectItem value="rescheduled">Remarcada</SelectItem>
                                              </SelectContent>
                                            </Select>
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

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteAppointment(appointment.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
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

          <div className="lg:col-span-1 space-y-6">
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

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Dialog open={isNewAppointmentOpen} onOpenChange={setIsNewAppointmentOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full justify-start gap-2 bg-transparent" variant="outline">
                      <Plus className="h-4 w-4" />
                      Nova Consulta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Consulta</DialogTitle>
                      <DialogDescription>
                        Agende uma nova consulta com um paciente
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <p className="text-sm text-muted-foreground">
                        Funcionalidade de agendamento será implementada em breve.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  className="w-full justify-start gap-2 bg-transparent"
                  variant="outline"
                  onClick={() => setShowWeekView(!showWeekView)}
                >
                  <CalendarDays className="h-4 w-4" />
                  {showWeekView ? 'Ver Dia' : 'Ver Semana Completa'}
                </Button>

                <Button className="w-full justify-start gap-2 bg-transparent" variant="outline">
                  <FileText className="h-4 w-4" />
                  Relatórios
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground">Lembretes</CardTitle>
                  <Dialog open={isAddReminderOpen} onOpenChange={setIsAddReminderOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Novo Lembrete</DialogTitle>
                        <DialogDescription>
                          Adicione um novo lembrete à sua lista
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-reminder">Texto do Lembrete</Label>
                          <Textarea
                            id="new-reminder"
                            value={newReminderText}
                            onChange={(e) => setNewReminderText(e.target.value)}
                            placeholder="Digite seu lembrete..."
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reminder-color">Cor</Label>
                          <Select
                            value={newReminderColor}
                            onValueChange={(value: 'amber' | 'blue' | 'green' | 'red') =>
                              setNewReminderColor(value)
                            }
                          >
                            <SelectTrigger id="reminder-color">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="amber">Amarelo (Aviso)</SelectItem>
                              <SelectItem value="blue">Azul (Info)</SelectItem>
                              <SelectItem value="green">Verde (Sucesso)</SelectItem>
                              <SelectItem value="red">Vermelho (Urgente)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsAddReminderOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button onClick={handleAddReminder}>
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`group relative rounded-lg border p-3 ${getReminderColorClasses(reminder.color)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${getReminderTextColor(reminder.color)} flex-1`}>
                        {reminder.text}
                      </p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Dialog
                          open={isReminderDialogOpen && editingReminder?.id === reminder.id}
                          onOpenChange={(open) => {
                            setIsReminderDialogOpen(open)
                            if (!open) setEditingReminder(null)
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setEditingReminder(reminder)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Lembrete</DialogTitle>
                            </DialogHeader>
                            {editingReminder && (
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-reminder">Texto</Label>
                                  <Textarea
                                    id="edit-reminder"
                                    value={editingReminder.text}
                                    onChange={(e) =>
                                      setEditingReminder({
                                        ...editingReminder,
                                        text: e.target.value,
                                      })
                                    }
                                    rows={3}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-reminder-color">Cor</Label>
                                  <Select
                                    value={editingReminder.color}
                                    onValueChange={(value: 'amber' | 'blue' | 'green' | 'red') =>
                                      setEditingReminder({
                                        ...editingReminder,
                                        color: value,
                                      })
                                    }
                                  >
                                    <SelectTrigger id="edit-reminder-color">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="amber">Amarelo (Aviso)</SelectItem>
                                      <SelectItem value="blue">Azul (Info)</SelectItem>
                                      <SelectItem value="green">Verde (Sucesso)</SelectItem>
                                      <SelectItem value="red">Vermelho (Urgente)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => setIsReminderDialogOpen(false)}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button onClick={handleSaveReminder}>
                                    Salvar
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDeleteReminder(reminder.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
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
