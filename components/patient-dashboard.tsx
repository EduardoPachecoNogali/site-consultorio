'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import type { DayButtonProps } from 'react-day-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Brain,
  Calendar as CalendarIcon,
  Clock,
  Video,
  User,
  LogOut,
  CalendarClock,
  Link2,
  Loader2,
  Sparkles,
  PhoneCall,
} from 'lucide-react'
import { appConfig } from '@/lib/app-config'
import { cn } from '@/lib/utils'
import { readJson } from '@/lib/http'
import { FeedbackAlert } from '@/components/feedback-alert'

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

type PsychologistOption = {
  id: string
  name: string
  email: string
}

type AvailabilitySlot = {
  date: string
  time: string
}

export function PatientDashboard({ userName, userEmail, onJoinCall, onLogout }: PatientDashboardProps) {
  const [nextAppointment, setNextAppointment] = useState<NextAppointment>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedNext, setHasLoadedNext] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [psychologists, setPsychologists] = useState<PsychologistOption[]>([])
  const [psychologistError, setPsychologistError] = useState('')
  const [isLoadingPsychologists, setIsLoadingPsychologists] = useState(false)
  const [hasLoadedPsychologists, setHasLoadedPsychologists] = useState(false)
  const [selectedPsychologistId, setSelectedPsychologistId] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([])
  const [suggestedSlots, setSuggestedSlots] = useState<AvailabilitySlot[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState('')
  const [preferredPeriod, setPreferredPeriod] = useState<'morning' | 'afternoon' | 'evening' | 'none'>('none')
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [reason, setReason] = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [groupRequested, setGroupRequested] = useState(false)
  const [groupRequestNote, setGroupRequestNote] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState('')
  const [isBooking, setIsBooking] = useState(false)

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
          const data = await readJson<{ error?: string }>(response, {})
          throw new Error(data.error || 'Não foi possível carregar sua próxima consulta. Tente recarregar a página.')
        }
        return readJson<{
          appointment: {
            id: string
            psychologistName: string
            specialty: string
            date: string
            time: string
            meetingUrl: string
          }
        }>(response)
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
      .finally(() => {
        setIsLoading(false)
        setHasLoadedNext(true)
      })
  }, [userEmail])

  useEffect(() => {
    setIsLoadingPsychologists(true)
    setPsychologistError('')
    fetch('/api/psychologists/public')
      .then(async (response) => {
        if (!response.ok) {
          const data = await readJson<{ error?: string }>(response, {})
          throw new Error(
            data.error || 'Não foi possível carregar a lista de profissionais. Tente recarregar a página.',
          )
        }
        return readJson<{ psychologists: PsychologistOption[] }>(response)
      })
      .then((data) => {
        setPsychologists(data.psychologists || [])
      })
      .catch((error: Error) => {
        setPsychologistError(error.message)
      })
      .finally(() => {
        setIsLoadingPsychologists(false)
        setHasLoadedPsychologists(true)
      })
  }, [])

  const isInitialLoading = !hasLoadedNext || !hasLoadedPsychologists

  const fetchAvailability = async (psychologistId: string, preference: string) => {
    if (!psychologistId) return
    setIsLoadingSlots(true)
    setSlotsError('')
    setAvailableSlots([])
    setSuggestedSlots([])

    try {
      const from = new Date()
      const dateParam = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(
        from.getDate(),
      ).padStart(2, '0')}`
      const response = await fetch(
        `/api/psychologists/${psychologistId}/availability/slots?from=${dateParam}&days=14${
          preference && preference !== 'none' ? `&preference=${preference}` : ''
        }`,
      )
      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response, {})
        throw new Error(data.error || 'Não foi possível carregar os horários disponíveis. Tente novamente.')
      }
      const data = await readJson<{ slots?: AvailabilitySlot[]; suggestedSlots?: AvailabilitySlot[] }>(response)
      setAvailableSlots(data.slots || [])
      setSuggestedSlots(data.suggestedSlots || [])
      if (data.slots?.length) {
        setSelectedDate(new Date(`${data.slots[0].date}T12:00:00`))
      }
    } catch (error: any) {
      setSlotsError(error.message || 'Não foi possível carregar os horários. Tente novamente.')
    } finally {
      setIsLoadingSlots(false)
    }
  }

  useEffect(() => {
    if (!selectedPsychologistId) return
    fetchAvailability(selectedPsychologistId, preferredPeriod)
  }, [selectedPsychologistId, preferredPeriod])

  const handleJoinCall = () => {
    if (!nextAppointment?.meetingUrl) {
      setLoadError('O link da consulta ainda não está disponível. Entre em contato com o suporte.')
      return
    }
    onJoinCall(nextAppointment.meetingUrl)
  }

  const formatGoogleDate = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
      date.getUTCHours(),
    )}${pad(date.getUTCMinutes())}00Z`
  }

  const buildGoogleCalendarLink = () => {
    if (!nextAppointment) return ''
    const [day, month, year] = nextAppointment.date.split('/')
    const [hour, minute] = nextAppointment.time.split(':')
    const startDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
    const endDate = new Date(startDate)
    endDate.setMinutes(endDate.getMinutes() + 50)
    const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Consulta com ${nextAppointment.doctor}`,
      details: nextAppointment.meetingUrl,
      dates,
    })
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  const handleSelectPsychologist = async (value: string) => {
    setSelectedPsychologistId(value)
    setSelectedSlot(null)
    setBookingError('')
    setBookingSuccess('')
    if (!value) return
    try {
      await fetch(`/api/psychologists/${value}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName, email: userEmail, phone: patientPhone }),
      })
    } catch {
      // silently ignore — non-critical
    }
  }

  const handleBookAppointment = async () => {
    setBookingError('')
    setBookingSuccess('')

    if (!selectedPsychologistId) {
      setBookingError('Selecione um psicólogo para continuar.')
      return
    }
    if (!selectedSlot) {
      setBookingError('Selecione um horário disponível no calendário.')
      return
    }

    try {
      setIsBooking(true)
      const response = await fetch(`/api/psychologists/${selectedPsychologistId}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: userName,
          patientEmail: userEmail,
          patientPhone,
          duration: '50 min',
          notes: '',
          reason,
          isGroup: false,
          groupRequested,
          groupRequestNote,
          createdBy: 'patient',
          tags: [],
          groupTags: [],
          slots: [{ date: selectedSlot.date, time: selectedSlot.time }],
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Não foi possível agendar a consulta. Tente outro horário ou contate o suporte.')
      }

      setBookingSuccess('Consulta agendada com sucesso! Você receberá uma confirmação em breve.')
      setReason('')
      setGroupRequestNote('')
      setGroupRequested(false)
      setSelectedSlot(null)
      fetchAvailability(selectedPsychologistId, preferredPeriod)
    } catch (error: any) {
      setBookingError(error.message || 'Não foi possível agendar a consulta. Tente novamente.')
    } finally {
      setIsBooking(false)
    }
  }

  const pastAppointments: { date: string; doctor: string; duration: string }[] = []

  const availableDates = useMemo(() => {
    const dateMap = new Map<string, Date>()
    availableSlots.forEach((slot) => {
      if (!dateMap.has(slot.date)) {
        dateMap.set(slot.date, new Date(`${slot.date}T12:00:00`))
      }
    })
    return Array.from(dateMap.values())
  }, [availableSlots])

  const slotsForSelectedDate = useMemo(() => {
    const key = selectedDate.toISOString().slice(0, 10)
    return availableSlots.filter((slot) => slot.date === key)
  }, [availableSlots, selectedDate])

  const selectedSlotDates = useMemo(() => {
    if (!selectedSlot) return []
    return [new Date(`${selectedSlot.date}T12:00:00`)]
  }, [selectedSlot])

  const calendarModifiers = useMemo(
    () => ({ available: availableDates, selectedSlot: selectedSlotDates }),
    [availableDates, selectedSlotDates],
  )

  const CalendarDayContent = ({ day, modifiers, className, ...props }: DayButtonProps) => {
    const dayNumber = day.date.getDate()
    const hasAvailability = Boolean(modifiers.available)
    const isSelectedSlot = Boolean(modifiers.selectedSlot)
    return (
      <button
        {...props}
        className={cn(
          className,
          isSelectedSlot &&
            'bg-primary/15 text-primary ring-2 ring-primary/30 shadow-sm',
          'transition-colors',
        )}
      >
        <div className="flex flex-col items-center">
          <span>{dayNumber}</span>
          <span className="mt-0.5 flex items-center">
            {hasAvailability && (
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isSelectedSlot ? 'bg-primary' : 'bg-primary/60',
                )}
              />
            )}
          </span>
        </div>
      </button>
    )
  }

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary animate-pulse-soft">
          <Brain className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando seu painel...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-none">{appConfig.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Plataforma de Teleatendimento</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-medium text-foreground">{userName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-1.5"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in-up">
          <h2 className="text-2xl font-bold text-foreground text-balance">
            Olá, {userName.split(' ')[0]}
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Bem-vindo de volta à sua jornada de bem-estar mental.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Next Appointment Card */}
            <Card className="border-border/60 shadow-sm animate-fade-in-up" style={{ animationDelay: '60ms' }}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                  </div>
                  Próxima Consulta
                </CardTitle>
                <CardDescription>Detalhes da sua próxima sessão agendada</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 p-5 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando próxima consulta...
                  </div>
                ) : loadError ? (
                  <FeedbackAlert
                    type="error"
                    title="Erro ao carregar consulta"
                    message={loadError}
                    onDismiss={() => setLoadError('')}
                  />
                ) : nextAppointment ? (
                  <div className="space-y-3 animate-fade-in">
                    <div className="flex items-start gap-4 rounded-xl bg-primary/5 border border-primary/10 p-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-3 min-w-0">
                        <div>
                          <p className="font-semibold text-foreground">{nextAppointment.doctor}</p>
                          <p className="text-sm text-muted-foreground">{nextAppointment.specialty}</p>
                        </div>

                        <Separator className="bg-border/50" />

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Data</p>
                              <p className="text-sm font-medium text-foreground">{nextAppointment.date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Horário</p>
                              <p className="text-sm font-medium text-foreground">{nextAppointment.time}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            onClick={handleJoinCall}
                            className="gap-2 font-semibold"
                            size="sm"
                          >
                            <Video className="h-4 w-4" />
                            Entrar na Chamada
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              const link = buildGoogleCalendarLink()
                              if (link) window.open(link, '_blank', 'noopener,noreferrer')
                            }}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Google Calendar
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 rounded-xl bg-accent/10 border border-accent/20 px-4 py-3">
                      <PhoneCall className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
                      <p className="text-sm text-foreground/80">
                        Entre <strong>5 minutos antes</strong> do horário. Certifique-se de estar em um local silencioso e com boa conexão.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/60 p-6 text-center space-y-2">
                    <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-muted">
                      <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Nenhuma consulta agendada</p>
                    <p className="text-xs text-muted-foreground">
                      Assim que uma sessão for marcada, os detalhes aparecerão aqui.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schedule Card */}
            <Card className="border-border/60 shadow-sm animate-fade-in-up" style={{ animationDelay: '120ms' }}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <CalendarClock className="h-4 w-4 text-primary" />
                  </div>
                  Agendar Consulta
                </CardTitle>
                <CardDescription>
                  Escolha um profissional, selecione o horário e informe o motivo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Booking feedback */}
                {bookingError && (
                  <FeedbackAlert
                    type="error"
                    message={bookingError}
                    onDismiss={() => setBookingError('')}
                  />
                )}
                {bookingSuccess && (
                  <FeedbackAlert
                    type="success"
                    message={bookingSuccess}
                    onDismiss={() => setBookingSuccess('')}
                  />
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Psychologist select */}
                  <div className="space-y-1.5">
                    <Label htmlFor="psychologist-select" className="text-sm font-medium">Psicólogo</Label>
                    <Select value={selectedPsychologistId} onValueChange={handleSelectPsychologist}>
                      <SelectTrigger id="psychologist-select" className="h-10">
                        <SelectValue placeholder={
                          isLoadingPsychologists ? 'Carregando...' : 'Escolha um profissional'
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {psychologists.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {psychologistError && (
                      <FeedbackAlert
                        type="warning"
                        message={psychologistError}
                        className="mt-1.5"
                      />
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="patient-phone" className="text-sm font-medium">Telefone</Label>
                    <Input
                      id="patient-phone"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="+55 11 99999-9999"
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground">Sincronizado com o psicólogo.</p>
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-1.5">
                  <Label htmlFor="reason" className="text-sm font-medium">Motivo da consulta</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Conte brevemente o que você gostaria de trabalhar na sessão..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Group therapy */}
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Solicitar terapia em grupo</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        O psicólogo irá montar e nomear o grupo após sua solicitação.
                      </p>
                    </div>
                    <Switch checked={groupRequested} onCheckedChange={setGroupRequested} />
                  </div>
                  {groupRequested && (
                    <div className="space-y-1.5 animate-fade-in-down">
                      <Label htmlFor="group-request-note" className="text-sm font-medium">Observações do grupo</Label>
                      <Textarea
                        id="group-request-note"
                        value={groupRequestNote}
                        onChange={(e) => setGroupRequestNote(e.target.value)}
                        placeholder="Descreva o tema, objetivo ou perfil do grupo..."
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* Calendar and time slots */}
                <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                  <div className="rounded-xl border border-border/60 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Horários disponíveis</p>
                      <Select
                        value={preferredPeriod}
                        onValueChange={(value: 'morning' | 'afternoon' | 'evening' | 'none') =>
                          setPreferredPeriod(value)
                        }
                      >
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue placeholder="Preferência" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Qualquer período</SelectItem>
                          <SelectItem value="morning">Manhã</SelectItem>
                          <SelectItem value="afternoon">Tarde</SelectItem>
                          <SelectItem value="evening">Noite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (!date) return
                        const prevKey = selectedDate.toISOString().slice(0, 10)
                        const nextKey = date.toISOString().slice(0, 10)
                        setSelectedDate(date)
                        if (prevKey !== nextKey) setSelectedSlot(null)
                      }}
                      modifiers={calendarModifiers}
                      components={{ DayButton: CalendarDayContent }}
                      className="rounded-lg border-0 p-0"
                    />

                    {!selectedPsychologistId && (
                      <p className="text-xs text-muted-foreground">
                        Selecione um profissional para ver os horários.
                      </p>
                    )}
                    {isLoadingSlots && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Carregando horários...
                      </div>
                    )}
                    {slotsError && !isLoadingSlots && (
                      <FeedbackAlert type="error" message={slotsError} />
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Day slots */}
                    <div className="rounded-xl border border-border/60 p-4">
                      <p className="text-sm font-medium text-foreground mb-3">Horários do dia</p>
                      {slotsForSelectedDate.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Nenhum horário disponível para esta data.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {slotsForSelectedDate.map((slot) => {
                            const isSelected =
                              selectedSlot?.date === slot.date && selectedSlot?.time === slot.time
                            return (
                              <Button
                                key={`${slot.date}-${slot.time}`}
                                type="button"
                                variant={isSelected ? 'default' : 'outline'}
                                size="sm"
                                className={cn('h-8 text-xs font-medium transition-all', isSelected && 'shadow-sm')}
                                onClick={() => setSelectedSlot(slot)}
                              >
                                {slot.time}
                              </Button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Suggested slots */}
                    <div className="rounded-xl border border-border/60 p-4">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <p className="text-sm font-medium text-foreground">Sugestões inteligentes</p>
                      </div>
                      {suggestedSlots.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {selectedPsychologistId
                            ? 'Nenhuma sugestão disponível.'
                            : 'Selecione um profissional para ver sugestões.'}
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {suggestedSlots.map((slot) => (
                            <button
                              key={`suggest-${slot.date}-${slot.time}`}
                              type="button"
                              className={cn(
                                'flex w-full items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs transition-colors hover:bg-muted/60',
                                selectedSlot?.date === slot.date && selectedSlot?.time === slot.time &&
                                  'bg-primary/10 border-primary/30 text-primary',
                              )}
                              onClick={() => {
                                setSelectedSlot(slot)
                                setSelectedDate(new Date(`${slot.date}T12:00:00`))
                              }}
                            >
                              <span className="text-muted-foreground">
                                {new Date(`${slot.date}T12:00:00`).toLocaleDateString('pt-BR', {
                                  weekday: 'short',
                                  day: '2-digit',
                                  month: '2-digit',
                                })}
                              </span>
                              <span className="font-semibold text-foreground">{slot.time}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Selected slot summary */}
                {selectedSlot && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-primary/8 border border-primary/20 px-4 py-3 text-sm animate-fade-in-down">
                    <CalendarIcon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground">
                      Horário selecionado:{' '}
                      <strong>
                        {new Date(`${selectedSlot.date}T12:00:00`).toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                        })}{' '}
                        às {selectedSlot.time}
                      </strong>
                    </span>
                  </div>
                )}

                <Button
                  onClick={handleBookAppointment}
                  disabled={isBooking || !selectedSlot || !selectedPsychologistId}
                  className="w-full sm:w-auto font-semibold gap-2"
                >
                  {isBooking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Agendando...
                    </>
                  ) : (
                    'Confirmar agendamento'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card
              className="border-border/60 shadow-sm animate-fade-in-up sticky top-24"
              style={{ animationDelay: '180ms' }}
            >
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  Consultas Anteriores
                </CardTitle>
                <CardDescription>Histórico de sessões realizadas</CardDescription>
              </CardHeader>
              <CardContent>
                {pastAppointments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 p-5 text-center space-y-2">
                    <div className="flex h-9 w-9 mx-auto items-center justify-center rounded-full bg-muted">
                      <Clock className="h-4.5 w-4.5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Nenhuma consulta anterior registrada ainda.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pastAppointments.map((appointment, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 p-3 transition-colors hover:bg-muted/60"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{appointment.date}</p>
                          <p className="text-xs text-muted-foreground truncate">{appointment.doctor}</p>
                          <p className="text-xs text-muted-foreground">{appointment.duration}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
