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
import { Brain, Calendar as CalendarIcon, Clock, Video, User, LogOut, CalendarClock, CheckCircle2, AlertCircle, Link2 } from 'lucide-react'
import { appConfig } from '@/lib/app-config'
import { readJson } from '@/lib/http'

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
          throw new Error(data.error || 'Não foi possível carregar a próxima consulta.')
        }
        return readJson<{ appointment: { id: string; psychologistName: string; specialty: string; date: string; time: string; meetingUrl: string } }>(response)
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
    console.log('[patient] carregando psicólogos aprovados')
    fetch('/api/psychologists/public')
      .then(async (response) => {
        if (!response.ok) {
          const data = await readJson<{ error?: string }>(response, {})
          throw new Error(data.error || 'Não foi possível carregar os profissionais.')
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
        throw new Error(data.error || 'Não foi possível carregar horários.')
      }
      const data = await readJson<{ slots?: AvailabilitySlot[]; suggestedSlots?: AvailabilitySlot[] }>(response)
      setAvailableSlots(data.slots || [])
      setSuggestedSlots(data.suggestedSlots || [])
      if (data.slots?.length) {
        setSelectedDate(new Date(`${data.slots[0].date}T12:00:00`))
      }
    } catch (error: any) {
      setSlotsError(error.message || 'Não foi possível carregar horários.')
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
      setLoadError('Link da consulta indisponível no momento.')
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
    const startDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    )
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
        body: JSON.stringify({
          name: userName,
          email: userEmail,
          phone: patientPhone,
        }),
      })
    } catch (error) {
      console.log('[patient] não foi possível vincular paciente', error)
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
      setBookingError('Selecione um horário disponível.')
      return
    }

    try {
      console.log('[patient] criando consulta', selectedSlot)
      const response = await fetch(
        `/api/psychologists/${selectedPsychologistId}/appointments`,
        {
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
        },
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Não foi possível agendar a consulta.')
      }

      setBookingSuccess('Consulta agendada com sucesso! Confira sua próxima sessão.')
      setReason('')
      setGroupRequestNote('')
      setGroupRequested(false)
      setSelectedSlot(null)
      fetchAvailability(selectedPsychologistId, preferredPeriod)
    } catch (error: any) {
      setBookingError(error.message || 'Não foi possível agendar a consulta.')
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

  const calendarModifiers = useMemo(
    () => ({
      available: availableDates,
    }),
    [availableDates],
  )

  const CalendarDayContent = ({ day, modifiers, className, ...props }: DayButtonProps) => {
    const dayNumber = day.date.getDate()
    const hasAvailability = Boolean(modifiers.available)
    return (
      <button {...props} className={className}>
        <div className="flex flex-col items-center">
          <span>{dayNumber}</span>
          <span className="mt-1 flex items-center">
            {hasAvailability && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
          </span>
        </div>
      </button>
    )
  }

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

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
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                  <CalendarIcon className="h-5 w-5 text-primary" />
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
                            <CalendarIcon className="h-4 w-4 text-primary" />
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

                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={handleJoinCall}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                          >
                            <Video className="mr-2 h-4 w-4" />
                            Entrar na Chamada
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => {
                              const link = buildGoogleCalendarLink()
                              if (link) {
                                window.open(link, '_blank', 'noopener,noreferrer')
                              }
                            }}
                          >
                            <Link2 className="mr-2 h-4 w-4" />
                            Google Calendar
                          </Button>
                        </div>
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

            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  Agendar Consulta
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Escolha um profissional, selecione o horário e informe o motivo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {(bookingError || bookingSuccess) && (
                  <div
                    className={`flex items-start gap-2 rounded-md border px-4 py-3 text-sm ${
                      bookingError
                        ? 'border-destructive/30 bg-destructive/10 text-destructive'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                    }`}
                  >
                    {bookingError ? (
                      <AlertCircle className="mt-0.5 h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4" />
                    )}
                    <span>{bookingError || bookingSuccess}</span>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="psychologist-select">Psicólogo</Label>
                    <Select value={selectedPsychologistId} onValueChange={handleSelectPsychologist}>
                      <SelectTrigger id="psychologist-select">
                        <SelectValue placeholder="Escolha um profissional" />
                      </SelectTrigger>
                      <SelectContent>
                        {psychologists.map((psychologist) => (
                          <SelectItem key={psychologist.id} value={psychologist.id}>
                            {psychologist.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isLoadingPsychologists && (
                      <p className="text-xs text-muted-foreground">Carregando profissionais...</p>
                    )}
                    {psychologistError && (
                      <p className="text-xs text-destructive">{psychologistError}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patient-phone">Telefone</Label>
                    <Input
                      id="patient-phone"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="+55 11 99999-9999"
                    />
                    <p className="text-xs text-muted-foreground">
                      Esse número será sincronizado com o psicólogo.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Motivo da consulta</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Conte brevemente o que você gostaria de trabalhar na sessão."
                    rows={3}
                  />
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Solicitar terapia em grupo</p>
                      <p className="text-xs text-muted-foreground">
                        O psicólogo irá montar e nomear o grupo após sua solicitação.
                      </p>
                    </div>
                    <Switch checked={groupRequested} onCheckedChange={setGroupRequested} />
                  </div>
                  {groupRequested && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="group-request-note">Observações da solicitação</Label>
                        <Textarea
                          id="group-request-note"
                          value={groupRequestNote}
                          onChange={(e) => setGroupRequestNote(e.target.value)}
                          placeholder="Conte brevemente como deve ser o grupo, tema ou objetivo."
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                  <div className="rounded-lg border border-border/60 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-foreground">Horários disponíveis</p>
                      <Select
                        value={preferredPeriod}
                        onValueChange={(value: 'morning' | 'afternoon' | 'evening' | 'none') =>
                          setPreferredPeriod(value)
                        }
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue placeholder="Preferência" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem preferência</SelectItem>
                          <SelectItem value="morning">Manhã</SelectItem>
                          <SelectItem value="afternoon">Tarde</SelectItem>
                          <SelectItem value="evening">Noite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      modifiers={calendarModifiers}
                      components={{ DayButton: CalendarDayContent }}
                      className="rounded-md border-0"
                    />

                    {!selectedPsychologistId && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Selecione um profissional para carregar horários disponíveis.
                      </p>
                    )}
                    {isLoadingSlots && (
                      <p className="mt-3 text-xs text-muted-foreground">Carregando horários...</p>
                    )}
                    {slotsError && (
                      <p className="mt-3 text-xs text-destructive">{slotsError}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-lg border border-border/60 p-4">
                      <p className="text-sm font-medium text-foreground mb-2">Horários do dia</p>
                      {slotsForSelectedDate.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Nenhum horário disponível para esta data.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {slotsForSelectedDate.map((slot) => (
                            <Button
                              key={`${slot.date}-${slot.time}`}
                              type="button"
                              variant={
                                selectedSlot?.date === slot.date && selectedSlot?.time === slot.time
                                  ? 'default'
                                  : 'outline'
                              }
                              size="sm"
                              onClick={() => setSelectedSlot(slot)}
                            >
                              {slot.time}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-border/60 p-4">
                      <p className="text-sm font-medium text-foreground mb-2">Sugestões inteligentes</p>
                      {suggestedSlots.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Selecione um profissional para ver sugestões.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {suggestedSlots.map((slot) => (
                            <button
                              key={`suggest-${slot.date}-${slot.time}`}
                              type="button"
                              className="flex w-full items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-muted/50"
                              onClick={() => {
                                setSelectedSlot(slot)
                                setSelectedDate(new Date(`${slot.date}T12:00:00`))
                              }}
                            >
                              <span>
                                {new Date(`${slot.date}T12:00:00`).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="font-medium text-foreground">{slot.time}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Button onClick={handleBookAppointment} className="w-full sm:w-auto">
                  Agendar consulta
                </Button>
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
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
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
