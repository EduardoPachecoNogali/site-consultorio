'use client'

import { useCallback, useEffect, useMemo, useState, KeyboardEvent } from 'react'
import { Calendar as CalendarIcon, Clock, User, Search, Plus, Edit, ChevronLeft, ChevronRight, LogOut, FileText, Video, Trash2, Mail, Check, X, Phone, Stethoscope, TrendingUp, Users, Tag, CalendarClock, AlertCircle, CheckCircle2, Download, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import type { DayButtonProps } from 'react-day-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { readJson } from '@/lib/http'
import { LineChart, Line, ResponsiveContainer } from 'recharts';

type AppointmentStatus = 'upcoming' | 'in-progress' | 'completed' | 'cancelled' | 'rescheduled'
type AttendanceStatus = 'pending' | 'present' | 'absent' | 'excused'

interface MedicalRecord {
  id: string
  date: Date
  title: string
  content: string
  tags: string[]
}

interface PatientProfile {
  id: string
  name: string
  email: string
  phone: string
  totalAppointments: number
  completedAppointments: number
  upcomingAppointments: number
  medicalRecords: MedicalRecord[]
  basicInfo: {
    age?: string
    occupation?: string
    emergencyContact?: string
  }
}

interface Appointment {
  id: string
  patientId: string
  patientName: string
  time: string
  duration: string
  status: AppointmentStatus
  notes: string
  reason: string
  isGroup: boolean
  groupName?: string
  groupSize?: number | null
  groupParticipants: string[]
  groupRequested: boolean
  groupRequestNote: string
  attendanceStatus: AttendanceStatus
  tags: string[]
  groupTags: string[]
  date: Date
  notificationPreference: 'email'
  patientContact: string
  meetingUrl?: string
}

interface Reminder {
  id: string
  text: string
  color: 'amber' | 'blue' | 'green' | 'red'
  remindAt?: Date | null
}

interface AppointmentSlot {
  id: string
  date: Date
  time: string
}

interface PsychologistDashboardProps {
  psychologistName: string
  psychologistId: string
  onLogout: () => void
}

type ApiMedicalRecord = Omit<MedicalRecord, 'date'> & { date: string }
type ApiPatientProfile = Omit<PatientProfile, 'medicalRecords'> & {
  medicalRecords: ApiMedicalRecord[]
}
type ApiAppointment = Omit<Appointment, 'date'> & { date: string }
type ApiReminder = Omit<Reminder, 'remindAt'> & { remindAt?: string | null }
type GoogleStatusPayload = {
  connected: boolean
  email?: string
  connectedAt?: string | null
}
type AvailabilityConfig = {
  timezone: string
  slotDurationMinutes: number
  bufferMinutes: number
  allowGroup: boolean
  maxGroupSize: number
  weekly: Record<number, { enabled: boolean; start: string; end: string }>
}
type DashboardPayload = {
  google?: GoogleStatusPayload
  availability?: AvailabilityConfig | null
  patients: ApiPatientProfile[]
  appointments: ApiAppointment[]
  reminders: ApiReminder[]
}

const hydrateDashboard = (payload: DashboardPayload) => ({
  patients: payload.patients.map((patient) => ({
    ...patient,
    medicalRecords: patient.medicalRecords.map((record) => ({
      ...record,
      tags: record.tags ?? [],
      date: new Date(record.date),
    })),
  })),
  appointments: payload.appointments.map((appointment) => ({
    ...appointment,
    notificationPreference: 'email' as const,
    meetingUrl: appointment.meetingUrl || '',
    reason: appointment.reason || '',
    isGroup: appointment.isGroup ?? false,
    groupName: appointment.groupName || '',
    groupSize: appointment.groupSize ?? null,
    groupParticipants: appointment.groupParticipants ?? [],
    groupRequested: appointment.groupRequested ?? false,
    groupRequestNote: appointment.groupRequestNote ?? '',
    attendanceStatus: appointment.attendanceStatus ?? 'pending',
    tags: appointment.tags ?? [],
    groupTags: appointment.groupTags ?? [],
    date: new Date(appointment.date),
  })),
  reminders: payload.reminders.map((reminder) => ({
    ...reminder,
    remindAt: reminder.remindAt ? new Date(reminder.remindAt) : null,
  })),
})

const DEFAULT_AVAILABILITY: AvailabilityConfig = {
  timezone: 'America/Sao_Paulo',
  slotDurationMinutes: 50,
  bufferMinutes: 10,
  allowGroup: false,
  maxGroupSize: 6,
  weekly: {
    0: { enabled: false, start: '09:00', end: '17:00' },
    1: { enabled: true, start: '09:00', end: '18:00' },
    2: { enabled: true, start: '09:00', end: '18:00' },
    3: { enabled: true, start: '09:00', end: '18:00' },
    4: { enabled: true, start: '09:00', end: '18:00' },
    5: { enabled: true, start: '09:00', end: '16:00' },
    6: { enabled: false, start: '09:00', end: '12:00' },
  },
}

const normalizeAvailability = (value?: AvailabilityConfig | null): AvailabilityConfig => {
  if (!value) return DEFAULT_AVAILABILITY
  const weekly: AvailabilityConfig['weekly'] = {}
  for (let day = 0; day <= 6; day += 1) {
    const entry = value.weekly?.[day] ?? DEFAULT_AVAILABILITY.weekly[day]
    weekly[day] = {
      enabled: entry?.enabled ?? DEFAULT_AVAILABILITY.weekly[day].enabled,
      start: entry?.start ?? DEFAULT_AVAILABILITY.weekly[day].start,
      end: entry?.end ?? DEFAULT_AVAILABILITY.weekly[day].end,
    }
  }
  return {
    timezone: value.timezone || DEFAULT_AVAILABILITY.timezone,
    slotDurationMinutes: value.slotDurationMinutes ?? DEFAULT_AVAILABILITY.slotDurationMinutes,
    bufferMinutes: value.bufferMinutes ?? DEFAULT_AVAILABILITY.bufferMinutes,
    allowGroup: value.allowGroup ?? DEFAULT_AVAILABILITY.allowGroup,
    maxGroupSize: value.maxGroupSize ?? DEFAULT_AVAILABILITY.maxGroupSize,
    weekly,
  }
}

const formatDateForApi = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseTags = (value: string) =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

export function PsychologistDashboard({
  psychologistName,
  psychologistId,
  onLogout,
}: PsychologistDashboardProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false)
  const [newReminderText, setNewReminderText] = useState('')
  const [newReminderColor, setNewReminderColor] = useState<'amber' | 'blue' | 'green' | 'red'>('blue')
  const [newReminderDate, setNewReminderDate] = useState<Date | null>(null)
  const [viewingPatient, setViewingPatient] = useState<PatientProfile | null>(null)
  const [isPatientProfileOpen, setIsPatientProfileOpen] = useState(false)
  const [newRecordTitle, setNewRecordTitle] = useState('')
  const [newRecordContent, setNewRecordContent] = useState('')
  const [newRecordTags, setNewRecordTags] = useState('')

  // Novo formulário de consulta
  const [newAppointment, setNewAppointment] = useState({
    patientName: '',
    time: '',
    duration: '50 min',
    date: new Date(),
    notes: '',
    reason: '',
    isGroup: false,
    groupName: '',
    groupSize: 2,
    groupParticipants: [] as string[],
    tags: [] as string[],
    groupTags: [] as string[],
    groupRequested: false,
    groupRequestNote: '',
    notificationPreference: 'email' as 'email',
    patientContact: '',
    patientEmail: '',
    patientPhone: '',
  })
  const [additionalSlots, setAdditionalSlots] = useState<AppointmentSlot[]>([])
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null)
  const [isEditRecordDialogOpen, setIsEditRecordDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')

  const [patientProfiles, setPatientProfiles] = useState<PatientProfile[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedDashboard, setHasLoadedDashboard] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [googleStatus, setGoogleStatus] = useState<GoogleStatusPayload | null>(null)
  const [googleConnectError, setGoogleConnectError] = useState('')
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)
  const [availability, setAvailability] = useState<AvailabilityConfig>(DEFAULT_AVAILABILITY)
  const [availabilityError, setAvailabilityError] = useState('')
  const [isSavingAvailability, setIsSavingAvailability] = useState(false)
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [reportPatientId, setReportPatientId] = useState('')

  const sparklineData = useMemo(() => {
    const data = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const count = appointments.filter(a => a.date.toDateString() === d.toDateString()).length;
      data.push({ name: d.toLocaleDateString('pt-BR', { weekday: 'short' }), uv: count });
    }
    return data.reverse();
  }, [appointments]);

  const loadDashboard = useCallback(async () => {
    if (!psychologistId) return
    setIsLoading(true)
    setLoadError('')
    try {
      console.log('[dashboard] carregando dados', { psychologistId })
      const response = await fetch(`/api/psychologists/${psychologistId}/dashboard`)
      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response, {})
        throw new Error(data.error || 'Erro ao carregar dados.')
      }
      const data = await readJson<DashboardPayload>(response)
      const hydrated = hydrateDashboard(data)
      setPatientProfiles(hydrated.patients)
      setAppointments(hydrated.appointments)
      setReminders(hydrated.reminders)
      setGoogleStatus(data.google ?? { connected: false })
      setAvailability(normalizeAvailability(data.availability))
      setViewingPatient((current) =>
        current
          ? hydrated.patients.find((patient) => patient.id === current.id) ?? null
          : current,
      )
    } catch (error: any) {
      console.error(error)
      setLoadError(error.message || 'Erro ao carregar dados.')
    } finally {
      setIsLoading(false)
      setHasLoadedDashboard(true)
    }
  }, [psychologistId])

  useEffect(() => {
    if (!psychologistId) return
    loadDashboard()
  }, [psychologistId, loadDashboard])

  const todayAppointments = appointments.filter(
    (apt) => apt.date.toDateString() === selectedDate.toDateString()
  )

  const filteredAppointments = todayAppointments.filter((apt) =>
    apt.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const googleConnectedAtLabel = googleStatus?.connectedAt
    ? new Date(googleStatus.connectedAt).toLocaleDateString('pt-BR')
    : ''

  const handleSaveAppointment = async () => {
    if (!editingAppointment || !psychologistId) return

    try {
      setActionError('')
      setActionSuccess('')
      console.log('[dashboard] salvando consulta', editingAppointment.id)
      const response = await fetch(
        `/api/psychologists/${psychologistId}/appointments/${editingAppointment.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: formatDateForApi(editingAppointment.date),
            time: editingAppointment.time,
            duration: editingAppointment.duration,
            status: editingAppointment.status,
            notes: editingAppointment.notes,
            reason: editingAppointment.reason,
            isGroup: editingAppointment.isGroup,
            groupName: editingAppointment.groupName,
            groupSize: editingAppointment.groupSize,
            groupParticipants: editingAppointment.groupParticipants,
            attendanceStatus: editingAppointment.attendanceStatus,
            tags: editingAppointment.tags,
            groupTags: editingAppointment.groupTags,
            notificationPreference: 'email',
            patientContact: editingAppointment.patientContact,
            groupRequested: editingAppointment.groupRequested,
            groupRequestNote: editingAppointment.groupRequestNote,
          }),
        },
      )

      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response, {})
        throw new Error(data.error || 'Erro ao atualizar consulta.')
      }

      await loadDashboard()
      setActionSuccess('Consulta atualizada com sucesso.')
      setIsEditDialogOpen(false)
      setEditingAppointment(null)
    } catch (error: any) {
      console.error(error)
      setActionError(error.message || 'Erro ao atualizar consulta.')
    }
  }

  const resetNewAppointmentForm = () => {
    setNewAppointment({
      patientName: '',
      time: '',
      duration: '50 min',
      date: new Date(),
      notes: '',
      reason: '',
      isGroup: false,
      groupName: '',
      groupSize: 2,
      groupParticipants: [],
      tags: [],
      groupTags: [],
      groupRequested: false,
      groupRequestNote: '',
      notificationPreference: 'email',
      patientContact: '',
      patientEmail: '',
      patientPhone: '',
    })
    setAdditionalSlots([])
  }

  const handleAddAppointment = async () => {
    if (!psychologistId) return

    const normalizedName = newAppointment.patientName.trim()
    const slotsToSchedule: AppointmentSlot[] = []

    if (normalizedName && newAppointment.time) {
      slotsToSchedule.push({
        id: 'main',
        date: newAppointment.date,
        time: newAppointment.time,
      })
    }

    additionalSlots.forEach((slot) => {
      if (slot.time) {
        slotsToSchedule.push(slot)
      }
    })

    if (!normalizedName || slotsToSchedule.length === 0) {
      setActionError('Informe o paciente e ao menos um horário.')
      return
    }

    if (!newAppointment.patientEmail.trim()) {
      setActionError('Informe o email do paciente.')
      return
    }

    const patientContact = newAppointment.patientEmail.trim()

    try {
      setActionError('')
      setActionSuccess('')
      console.log('[dashboard] criando consulta', {
        patient: normalizedName,
        slots: slotsToSchedule.length,
      })
      const response = await fetch(
        `/api/psychologists/${psychologistId}/appointments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientName: normalizedName,
            patientEmail: newAppointment.patientEmail,
            patientPhone: newAppointment.patientPhone,
            duration: newAppointment.duration,
            notes: newAppointment.notes,
            reason: newAppointment.reason,
            isGroup: newAppointment.isGroup,
            groupName: newAppointment.groupName,
            groupSize: newAppointment.groupSize,
            groupParticipants: newAppointment.groupParticipants,
            tags: newAppointment.tags,
            groupTags: newAppointment.groupTags,
            groupRequested: newAppointment.groupRequested,
            groupRequestNote: newAppointment.groupRequestNote,
            createdBy: 'psychologist',
            notificationPreference: 'email',
            patientContact,
            slots: slotsToSchedule.map((slot) => ({
              date: formatDateForApi(slot.date),
              time: slot.time,
            })),
          }),
        },
      )

      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response, {})
        throw new Error(data.error || 'Erro ao criar consulta.')
      }

      await loadDashboard()
      setActionSuccess('Consulta criada com sucesso.')
      setIsNewAppointmentOpen(false)
      resetNewAppointmentForm()
    } catch (error: any) {
      console.error(error)
      setActionError(error.message || 'Erro ao criar consulta.')
    }
  }

  const handleDeleteAppointment = async (id: string) => {
    if (!psychologistId) return
    if (!confirm('Tem certeza que deseja excluir esta consulta?')) return

    try {
      setActionError('')
      setActionSuccess('')
      console.log('[dashboard] excluindo consulta', id)
      const response = await fetch(
        `/api/psychologists/${psychologistId}/appointments/${id}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response, {})
        throw new Error(data.error || 'Erro ao excluir consulta.')
      }
      await loadDashboard()
      setActionSuccess('Consulta excluída.')
    } catch (error: any) {
      console.error(error)
      setActionError(error.message || 'Erro ao excluir consulta.')
    }
  }

  const handleStartCall = async (appointment: Appointment) => {
    if (!psychologistId) return
    const contact = appointment.patientContact

    try {
      setActionError('')
      setActionSuccess('')
      console.log('[dashboard] iniciando chamada', appointment.id)
      const response = await fetch(
        `/api/psychologists/${psychologistId}/appointments/${appointment.id}/notify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      )

      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response, {})
        throw new Error(data.error || 'Erro ao enviar notificação.')
      }

      const data = await readJson<{ contact?: string; mocked?: boolean; meetingUrl?: string }>(response, {})
      const resolvedContact = data.contact || contact
      const label = 'Email'
      const prefix = data.mocked ? '✓ Notificação simulada' : '✓ Notificação enviada'
      const meetingUrl = data.meetingUrl || appointment.meetingUrl
      if (!meetingUrl) {
        throw new Error('Link do Google Meet não encontrado.')
      }
      const message = `Olá ${appointment.patientName}, sua consulta está iniciando. Entre no link: ${meetingUrl}`

      setActionSuccess(`${prefix} via ${label} para ${resolvedContact}.`)

      if (meetingUrl) {
        window.open(meetingUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (error: any) {
      console.error(error)
      setActionError(error.message || 'Erro ao enviar notificação.')
    }
  }

  const handleConnectGoogle = async () => {
    if (!psychologistId) return
    setIsConnectingGoogle(true)
    setGoogleConnectError('')

    try {
      console.log('[dashboard] conectando google calendar', psychologistId)
      const response = await fetch(
        `/api/psychologists/${psychologistId}/google/authorize`,
      )
      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response, {})
        throw new Error(data.error || 'Erro ao iniciar conexão com o Google.')
      }
      const data = await readJson<{ url?: string }>(response, {})
      if (!data?.url) {
        throw new Error('URL de autorização não encontrada.')
      }
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (error: any) {
      console.error(error)
      setGoogleConnectError(error.message || 'Erro ao conectar Google Calendar.')
    } finally {
      setIsConnectingGoogle(false)
    }
  }

  const handleViewPatientProfile = (patientId: string) => {
    const patient = patientProfiles.find((p) => p.id === patientId)
    if (patient) {
      setViewingPatient(patient)
      setIsPatientProfileOpen(true)
    }
  }

  const handleSelectExistingPatient = (patient: PatientProfile) => {
    setNewAppointment((current) => ({
      ...current,
      patientName: patient.name,
      patientEmail: patient.email,
      patientPhone: patient.phone,
    }))
  }

  const handleAddTimeSlot = () => {
    setAdditionalSlots((slots) => [
      ...slots,
      {
        id: Date.now().toString(),
        date: new Date(newAppointment.date),
        time: '',
      },
    ])
  }

  const handleUpdateTimeSlot = (slotId: string, data: Partial<AppointmentSlot>) => {
    setAdditionalSlots((slots) =>
      slots.map((slot) => (slot.id === slotId ? { ...slot, ...data } : slot))
    )
  }

  const handleRemoveTimeSlot = (slotId: string) => {
    setAdditionalSlots((slots) => slots.filter((slot) => slot.id !== slotId))
  }

  const handleUpdateAvailability = (
    day: number,
    field: 'enabled' | 'start' | 'end',
    value: boolean | string,
  ) => {
    setAvailability((current) => ({
      ...current,
      weekly: {
        ...current.weekly,
        [day]: {
          ...current.weekly[day],
          [field]: value,
        },
      },
    }))
  }

  const handleSaveAvailability = async () => {
    if (!psychologistId) return
    setAvailabilityError('')
    setIsSavingAvailability(true)
    setActionError('')
    setActionSuccess('')

    try {
      console.log('[dashboard] salvando disponibilidade', psychologistId)
      const response = await fetch(
        `/api/psychologists/${psychologistId}/availability`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ availability }),
        },
      )

      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response, {})
        throw new Error(data.error || 'Erro ao salvar disponibilidade.')
      }

      const data = await readJson<{ availability?: AvailabilityConfig }>(response)
      setAvailability(normalizeAvailability(data.availability))
      setActionSuccess('Disponibilidade atualizada com sucesso.')
    } catch (error: any) {
      console.error(error)
      const message = error.message || 'Erro ao salvar disponibilidade.'
      setAvailabilityError(message)
      setActionError(message)
    } finally {
      setIsSavingAvailability(false)
    }
  }

  const handleStartEditingField = (fieldId: string, currentValue?: string) => {
    setEditingField(fieldId)
    setEditingValue(currentValue ?? '')
  }

  const handleSaveEditingField = async () => {
    if (!viewingPatient || !editingField || !psychologistId) return
    const trimmedValue = editingValue.trim()

    let payload: Record<string, string> | null = null

    switch (editingField) {
      case 'name':
        if (!trimmedValue) return
        payload = { name: trimmedValue }
        break
      case 'email':
        payload = { email: trimmedValue }
        break
      case 'phone':
        payload = { phone: trimmedValue }
        break
      case 'basicInfo.age':
        payload = { age: trimmedValue }
        break
      case 'basicInfo.occupation':
        payload = { occupation: trimmedValue }
        break
      case 'basicInfo.emergencyContact':
        payload = { emergencyContact: trimmedValue }
        break
      default:
        break
    }

    if (!payload) return

    try {
      setActionError('')
      setActionSuccess('')
      console.log('[dashboard] atualizando paciente', editingField)
      const response = await fetch(
        `/api/psychologists/${psychologistId}/patients/${viewingPatient.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response, {})
        throw new Error(data.error || 'Erro ao atualizar paciente.')
      }

      await loadDashboard()
      setActionSuccess('Dados do paciente atualizados.')
    } catch (error: any) {
      console.error(error)
      setActionError(error.message || 'Erro ao atualizar paciente.')
    } finally {
      setEditingField(null)
      setEditingValue('')
    }
  }

  const handleFieldInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSaveEditingField()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setEditingField(null)
      setEditingValue('')
    }
  }

  const handleAddMedicalRecord = async () => {
    if (!viewingPatient || !psychologistId) return
    if (!newRecordTitle || !newRecordContent) return

    try {
      setActionError('')
      setActionSuccess('')
      console.log('[dashboard] adicionando prontuário', viewingPatient.id)
      const response = await fetch(
        `/api/psychologists/${psychologistId}/patients/${viewingPatient.id}/records`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newRecordTitle,
            content: newRecordContent,
            tags: parseTags(newRecordTags),
          }),
        },
      )

      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response, {})
        throw new Error(data.error || 'Erro ao salvar prontuário.')
      }

      await loadDashboard()
      setActionSuccess('Prontuário salvo com sucesso.')
      setNewRecordTitle('')
      setNewRecordContent('')
      setNewRecordTags('')
    } catch (error: any) {
      console.error(error)
      setActionError(error.message || 'Erro ao salvar prontuário.')
    }
  }

  const handleStartEditMedicalRecord = (record: MedicalRecord) => {
    setEditingRecord({ ...record })
    setIsEditRecordDialogOpen(true)
  }

  const handleSaveEditedMedicalRecord = async () => {
    if (!viewingPatient || !editingRecord || !psychologistId) return

    try {
      const response = await fetch(
        `/api/psychologists/${psychologistId}/patients/${viewingPatient.id}/records/${editingRecord.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editingRecord.title,
            content: editingRecord.content,
            date: editingRecord.date.toISOString(),
            tags: editingRecord.tags,
          }),
        },
      )

      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response, {})
        throw new Error(data.error || 'Erro ao atualizar prontuário.')
      }

      await loadDashboard()
      setActionSuccess('Prontuário atualizado com sucesso.')
      setIsEditRecordDialogOpen(false)
      setEditingRecord(null)
    } catch (error: any) {
      console.error(error)
      setActionError(error.message || 'Erro ao atualizar prontuário.')
    }
  }

  const handleDeleteMedicalRecord = async (recordId: string) => {
    if (!viewingPatient || !psychologistId) return
    if (!confirm('Deseja excluir este prontuário?')) return

    try {
      setActionError('')
      setActionSuccess('')
      console.log('[dashboard] excluindo prontuário', recordId)
      const response = await fetch(
        `/api/psychologists/${psychologistId}/patients/${viewingPatient.id}/records/${recordId}`,
        { method: 'DELETE' },
      )

      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response, {})
        throw new Error(data.error || 'Erro ao excluir prontuário.')
      }

      await loadDashboard()
      setActionSuccess('Prontuário excluído.')
    } catch (error: any) {
      console.error(error)
      setActionError(error.message || 'Erro ao excluir prontuário.')
    }
  }

  const handleSaveReminder = async () => {
    if (!editingReminder || !psychologistId) return

    try {
      setActionError('')
      setActionSuccess('')
      console.log('[dashboard] atualizando lembrete', editingReminder.id)
      const response = await fetch(
        `/api/psychologists/${psychologistId}/reminders/${editingReminder.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: editingReminder.text,
            color: editingReminder.color,
            remindAt: editingReminder.remindAt
              ? editingReminder.remindAt.toISOString()
              : null,
          }),
        },
      )

      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response, {})
        throw new Error(data.error || 'Erro ao atualizar lembrete.')
      }

      await loadDashboard()
      setActionSuccess('Lembrete atualizado.')
      setIsReminderDialogOpen(false)
      setEditingReminder(null)
    } catch (error: any) {
      console.error(error)
      setActionError(error.message || 'Erro ao atualizar lembrete.')
    }
  }

  const handleAddReminder = async () => {
    if (!psychologistId) return
    if (!newReminderText.trim()) return

    try {
      setActionError('')
      setActionSuccess('')
      console.log('[dashboard] adicionando lembrete')
      const response = await fetch(
        `/api/psychologists/${psychologistId}/reminders`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: newReminderText,
            color: newReminderColor,
            remindAt: newReminderDate ? newReminderDate.toISOString() : null,
          }),
        },
      )

      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response, {})
        throw new Error(data.error || 'Erro ao criar lembrete.')
      }

      await loadDashboard()
      setActionSuccess('Lembrete criado.')
      setNewReminderText('')
      setNewReminderColor('blue')
      setNewReminderDate(null)
      setIsAddReminderOpen(false)
    } catch (error: any) {
      console.error(error)
      setActionError(error.message || 'Erro ao criar lembrete.')
    }
  }

  const handleDeleteReminder = async (id: string) => {
    if (!psychologistId) return

    try {
      setActionError('')
      setActionSuccess('')
      console.log('[dashboard] excluindo lembrete', id)
      const response = await fetch(
        `/api/psychologists/${psychologistId}/reminders/${id}`,
        { method: 'DELETE' },
      )

      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response, {})
        throw new Error(data.error || 'Erro ao excluir lembrete.')
      }

      await loadDashboard()
      setActionSuccess('Lembrete removido.')
    } catch (error: any) {
      console.error(error)
      setActionError(error.message || 'Erro ao excluir lembrete.')
    }
  }

  const handleGenerateMonthlyReport = () => {
    if (!reportPatient) {
      setActionError('Selecione um paciente para gerar o relatório.')
      return
    }
    if (!reportMonth) {
      setActionError('Selecione o mês de referência do relatório.')
      return
    }

    const [yearInput, monthInput] = reportMonth.split('-')
    const year = Number(yearInput)
    const monthIndex = Number(monthInput) - 1
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
      setActionError('Mês inválido para o relatório.')
      return
    }

    const monthStart = new Date(year, monthIndex, 1)
    const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59)

    const monthAppointments = appointments.filter(
      (appointment) =>
        appointment.patientId === reportPatient.id &&
        appointment.date >= monthStart &&
        appointment.date <= monthEnd,
    )

    const completed = monthAppointments.filter((apt) => apt.status === 'completed').length
    const absent = monthAppointments.filter((apt) => apt.attendanceStatus === 'absent').length
    const present = monthAppointments.filter((apt) => apt.attendanceStatus === 'present').length

    const monthRecords = reportPatient.medicalRecords.filter(
      (record) => record.date >= monthStart && record.date <= monthEnd,
    )

    const reportWindow = window.open('', '_blank', 'width=900,height=700')
    if (!reportWindow) {
      setActionError('Não foi possível abrir a janela do relatório.')
      return
    }

    const appointmentList = monthAppointments
      .map(
        (apt) => `
        <li>
          <strong>${apt.date.toLocaleDateString('pt-BR')}</strong> - ${apt.time} (${apt.duration})<br/>
          <em>Status:</em> ${getStatusLabel(apt.status)} | <em>Presença:</em> ${apt.attendanceStatus}
          ${apt.reason ? `<br/><em>Motivo:</em> ${apt.reason}` : ''}
          ${apt.notes ? `<br/><em>Notas:</em> ${apt.notes}` : ''}
        </li>
      `,
      )
      .join('')

    const recordList = monthRecords
      .map(
        (record) => `
        <li>
          <strong>${record.date.toLocaleDateString('pt-BR')}</strong> - ${record.title}
          <p>${record.content.replace(/\n/g, '<br/>')}</p>
        </li>
      `,
      )
      .join('')

    const html = `
      <html>
        <head>
          <title>Relatório Mensal - ${reportPatient.name}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; padding: 32px; }
            h1, h2, h3 { color: #1f2937; }
            .meta { display: flex; gap: 24px; margin-bottom: 16px; font-size: 14px; }
            .card { border: 1px solid #e5e7eb; padding: 16px; border-radius: 12px; margin-bottom: 16px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 12px; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
            .summary div { background: #f9fafb; padding: 12px; border-radius: 10px; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Relatório Mensal</h1>
          <div class="meta">
            <div><strong>Paciente:</strong> ${reportPatient.name}</div>
            <div><strong>Período:</strong> ${monthStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div>
            <div><strong>Psicólogo(a):</strong> ${psychologistName}</div>
          </div>

          <div class="card">
            <h2>Resumo do Mês</h2>
            <div class="summary">
              <div><strong>${monthAppointments.length}</strong><br/>Sessões no mês</div>
              <div><strong>${completed}</strong><br/>Concluídas</div>
              <div><strong>${present}</strong><br/>Compareceu</div>
            </div>
            <div class="summary" style="margin-top: 12px;">
              <div><strong>${absent}</strong><br/>Faltas</div>
              <div><strong>${monthRecords.length}</strong><br/>Prontuários</div>
              <div><strong>${reportPatient.upcomingAppointments}</strong><br/>Agendadas</div>
            </div>
          </div>

          <div class="card">
            <h2>Progressão das Sessões</h2>
            <ul>${appointmentList || '<li>Sem consultas registradas no período.</li>'}</ul>
          </div>

          <div class="card">
            <h2>Prontuários e Anotações</h2>
            <ul>${recordList || '<li>Sem prontuários registrados no período.</li>'}</ul>
          </div>
        </body>
      </html>
    `

    reportWindow.document.write(html)
    reportWindow.document.close()
    reportWindow.focus()
    reportWindow.print()
  }

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-secondary/20 text-secondary-foreground border-secondary/20'
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
        return 'bg-secondary/20 border-secondary/20'
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
        return 'text-secondary-foreground'
      case 'red':
        return 'text-red-700'
    }
  }

  const stats = {
    total: todayAppointments.length,
    completed: todayAppointments.filter((a) => a.status === 'completed').length,
    upcoming: todayAppointments.filter((a) => a.status === 'upcoming').length,
  }

  const appointmentDates = useMemo(
    () =>
      appointments.map((appointment) => {
        const date = new Date(appointment.date)
        date.setHours(0, 0, 0, 0)
        return date
      }),
    [appointments],
  )

  const reminderDates = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder.remindAt)
        .map((reminder) => {
          const date = new Date(reminder.remindAt as Date)
          date.setHours(0, 0, 0, 0)
          return date
        }),
    [reminders],
  )

  const calendarModifiers = useMemo(
    () => ({
      hasAppointment: appointmentDates,
      hasReminder: reminderDates,
    }),
    [appointmentDates, reminderDates],
  )

  const reportPatient = useMemo(() => {
    if (reportPatientId) {
      return patientProfiles.find((patient) => patient.id === reportPatientId) ?? null
    }
    return viewingPatient
  }, [patientProfiles, reportPatientId, viewingPatient])

  const CalendarDayContent = ({ day, modifiers, className, ...props }: DayButtonProps) => {
    const dayNumber = day.date.getDate()
    const hasAppointment = Boolean(modifiers.hasAppointment)
    const hasReminder = Boolean(modifiers.hasReminder)

    return (
      <button {...props} className={className}>
        <div className="flex flex-col items-center">
          <span>{dayNumber}</span>
          <span className="mt-1 flex items-center gap-1">
            {hasAppointment && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            {hasReminder && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
          </span>
        </div>
      </button>
    )
  }

  const weekDays = [
    { id: 0, label: 'Dom' },
    { id: 1, label: 'Seg' },
    { id: 2, label: 'Ter' },
    { id: 3, label: 'Qua' },
    { id: 4, label: 'Qui' },
    { id: 5, label: 'Sex' },
    { id: 6, label: 'Sáb' },
  ]

  const patientNameQuery = newAppointment.patientName.trim().toLowerCase()
  const patientSuggestions =
    patientNameQuery.length >= 2
      ? patientProfiles.filter((patient) =>
          patient.name.toLowerCase().includes(patientNameQuery)
        )
      : []

  if (isLoading && !hasLoadedDashboard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        {!psychologistId && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Não foi possível carregar o perfil do profissional. Faça login novamente.
          </div>
        )}
        {loadError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        )}
        {actionError && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <span>{actionError}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {isLoading && (
          <p className="mb-4 text-sm text-muted-foreground">Carregando dados...</p>
        )}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
            <Card className="shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <CalendarIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-3xl font-serif text-foreground">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Consultas Hoje</p>
                    </div>
                  </div>
                  <div className="h-10 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparklineData}>
                        <Line type="monotone" dataKey="uv" stroke="hsl(var(--primary))" strokeWidth={2} dot={false}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/20">
                      <CheckCircle className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-3xl font-serif text-foreground">{stats.completed}</p>
                      <p className="text-xs text-muted-foreground">Concluídas</p>
                    </div>
                  </div>
                   <div className="h-10 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparklineData}>
                        <Line type="monotone" dataKey="uv" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
                      <Clock className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-serif text-foreground">{stats.upcoming}</p>
                      <p className="text-xs text-muted-foreground">Pendentes</p>
                    </div>
                  </div>
                   <div className="h-10 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparklineData}>
                        <Line type="monotone" dataKey="uv" stroke="hsl(var(--accent))" strokeWidth={2} dot={false}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Agenda + Ações rápidas */}
            <Tabs defaultValue="agenda" className="flex flex-col">
              <Card className="border-border/50">
                <CardHeader>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                              modifiers={calendarModifiers}
                            components={{ DayButton: CalendarDayContent }}
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

                      <TabsList className="grid w-full grid-cols-2 lg:w-auto">
                        <TabsTrigger value="agenda">Agenda</TabsTrigger>
                        <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="agenda" className="mt-0">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative w-full lg:w-64">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Buscar paciente..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">Ações rápidas</span>
                          <Dialog
                            open={isNewAppointmentOpen}
                            onOpenChange={(open) => {
                              setIsNewAppointmentOpen(open)
                              if (!open) {
                                resetNewAppointmentForm()
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="default" className="gap-2">
                                <Plus className="h-4 w-4" />
                                Nova Consulta
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Agendar Nova Consulta</DialogTitle>
                                <DialogDescription>
                                  Preencha os dados para criar uma nova consulta
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="new-patient-name">Nome do Paciente</Label>
                                  <Input
                                    id="new-patient-name"
                                    value={newAppointment.patientName}
                                    onChange={(e) =>
                                      setNewAppointment({ ...newAppointment, patientName: e.target.value })
                                    }
                                    placeholder="Nome completo"
                                  />
                                  {patientSuggestions.length > 0 && (
                                    <div className="rounded-md border border-border/50 bg-muted/30">
                                      <p className="px-3 py-2 text-xs text-muted-foreground">
                                        Clique para preencher os dados automaticamente
                                      </p>
                                      <div className="divide-y divide-border/50">
                                        {patientSuggestions.slice(0, 5).map((patient) => (
                                          <button
                                            key={patient.id}
                                            type="button"
                                            onClick={() => handleSelectExistingPatient(patient)}
                                            className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-card"
                                          >
                                            <div>
                                              <p className="text-sm font-medium text-foreground">
                                                {patient.name}
                                              </p>
                                              <p className="text-xs text-muted-foreground">{patient.email}</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                              {patient.phone}
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label htmlFor="new-patient-email">Email</Label>
                                    <Input
                                      id="new-patient-email"
                                      type="email"
                                      value={newAppointment.patientEmail}
                                      onChange={(e) =>
                                        setNewAppointment({ ...newAppointment, patientEmail: e.target.value })
                                      }
                                      placeholder="email@exemplo.com"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="new-patient-phone">Telefone</Label>
                                    <Input
                                      id="new-patient-phone"
                                      value={newAppointment.patientPhone}
                                      onChange={(e) =>
                                        setNewAppointment({ ...newAppointment, patientPhone: e.target.value })
                                      }
                                      placeholder="+55 11 99999-9999"
                                    />
                                  </div>
                                </div>

                                <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium text-foreground">Consulta em grupo</p>
                                      <p className="text-xs text-muted-foreground">
                                        Ative para adicionar participantes e tags coletivas.
                                      </p>
                                    </div>
                                    <Switch
                                      checked={newAppointment.isGroup}
                                      onCheckedChange={(checked) =>
                                        setNewAppointment({ ...newAppointment, isGroup: checked })
                                      }
                                    />
                                  </div>
                                  {newAppointment.isGroup && (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label htmlFor="new-group-name">Nome do grupo</Label>
                                        <Input
                                          id="new-group-name"
                                          value={newAppointment.groupName}
                                          onChange={(e) =>
                                            setNewAppointment({ ...newAppointment, groupName: e.target.value })
                                          }
                                          placeholder="Ex: Grupo ansiedade"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="new-group-size">Tamanho do grupo</Label>
                                        <Input
                                          id="new-group-size"
                                          type="number"
                                          min={2}
                                          value={newAppointment.groupSize}
                                          onChange={(e) =>
                                            setNewAppointment({
                                              ...newAppointment,
                                              groupSize: Number(e.target.value),
                                            })
                                          }
                                        />
                                      </div>
                                      <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="new-group-participants">Participantes (emails)</Label>
                                        <Input
                                          id="new-group-participants"
                                          value={newAppointment.groupParticipants.join(', ')}
                                          onChange={(e) =>
                                            setNewAppointment({
                                              ...newAppointment,
                                              groupParticipants: parseTags(e.target.value),
                                            })
                                          }
                                          placeholder="email1@exemplo.com, email2@exemplo.com"
                                        />
                                      </div>
                                      <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="new-group-tags">Tags do grupo</Label>
                                        <Input
                                          id="new-group-tags"
                                          value={newAppointment.groupTags.join(', ')}
                                          onChange={(e) =>
                                            setNewAppointment({
                                              ...newAppointment,
                                              groupTags: parseTags(e.target.value),
                                            })
                                          }
                                          placeholder="ansiedade, suporte, terapia em grupo"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label htmlFor="new-time">Horário</Label>
                                    <Input
                                      id="new-time"
                                      type="time"
                                      value={newAppointment.time}
                                      onChange={(e) =>
                                        setNewAppointment({ ...newAppointment, time: e.target.value })
                                      }
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="new-duration">Duração</Label>
                                    <Select
                                      value={newAppointment.duration}
                                      onValueChange={(value) =>
                                        setNewAppointment({ ...newAppointment, duration: value })
                                      }
                                    >
                                      <SelectTrigger id="new-duration">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="30 min">30 minutos</SelectItem>
                                        <SelectItem value="50 min">50 minutos</SelectItem>
                                        <SelectItem value="60 min">60 minutos</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="new-date">Data</Label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                                        <CalendarIcon className="h-4 w-4" />
                                        {newAppointment.date.toLocaleDateString('pt-BR')}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      <Calendar
                                        mode="single"
                                        selected={newAppointment.date}
                                        onSelect={(date) =>
                                          date && setNewAppointment({ ...newAppointment, date })
                                        }
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>

                                <div className="space-y-3">
                                  {additionalSlots.map((slot, index) => (
                                    <div
                                      key={slot.id}
                                      className="rounded-md border border-dashed border-border/60 p-4 space-y-3"
                                    >
                                      <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-foreground">
                                          Data extra #{index + 1}
                                        </p>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleRemoveTimeSlot(slot.id)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                          <Label>Data</Label>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button
                                                variant="outline"
                                                className="w-full justify-start gap-2 bg-transparent"
                                              >
                                                <CalendarIcon className="h-4 w-4" />
                                                {slot.date.toLocaleDateString('pt-BR')}
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                              <Calendar
                                                mode="single"
                                                selected={slot.date}
                                                onSelect={(date) =>
                                                  date && handleUpdateTimeSlot(slot.id, { date })
                                                }
                                              />
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Horário</Label>
                                          <Input
                                            type="time"
                                            value={slot.time}
                                            onChange={(e) =>
                                              handleUpdateTimeSlot(slot.id, { time: e.target.value })
                                            }
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-dashed border-border/70"
                                    onClick={handleAddTimeSlot}
                                  >
                                    + Adicionar outra data/horário
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="new-notification">Preferência de Notificação</Label>
                                  <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    Email
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="new-reason">Motivo da Consulta</Label>
                                  <Textarea
                                    id="new-reason"
                                    value={newAppointment.reason}
                                    onChange={(e) =>
                                      setNewAppointment({ ...newAppointment, reason: e.target.value })
                                    }
                                    placeholder="Descreva o motivo principal da consulta..."
                                    rows={3}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="new-notes">Notas</Label>
                                  <Textarea
                                    id="new-notes"
                                    value={newAppointment.notes}
                                    onChange={(e) =>
                                      setNewAppointment({ ...newAppointment, notes: e.target.value })
                                    }
                                    placeholder="Observações sobre a consulta..."
                                    rows={3}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="new-tags">Tags privadas</Label>
                                  <Input
                                    id="new-tags"
                                    value={newAppointment.tags.join(', ')}
                                    onChange={(e) =>
                                      setNewAppointment({ ...newAppointment, tags: parseTags(e.target.value) })
                                    }
                                    placeholder="ansiedade, acompanhamento, retorno"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    resetNewAppointmentForm()
                                    setIsNewAppointmentOpen(false)
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button type="button" onClick={handleAddAppointment}>
                                  Agendar
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog
                            open={isReportDialogOpen}
                            onOpenChange={(open) => {
                              setIsReportDialogOpen(open)
                              if (open && viewingPatient && !reportPatientId) {
                                setReportPatientId(viewingPatient.id)
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline" className="gap-2 bg-transparent">
                                <FileText className="h-4 w-4" />
                                Relatórios
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Relatório mensal</DialogTitle>
                                <DialogDescription>
                                  Gere um PDF com o resumo do mês e progressão das sessões.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="report-patient">Paciente</Label>
                                  <Select
                                    value={reportPatientId}
                                    onValueChange={(value) => setReportPatientId(value)}
                                  >
                                    <SelectTrigger id="report-patient">
                                      <SelectValue placeholder="Selecione um paciente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {patientProfiles.map((patient) => (
                                        <SelectItem key={patient.id} value={patient.id}>
                                          {patient.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="report-month">Mês</Label>
                                  <Input
                                    id="report-month"
                                    type="month"
                                    value={reportMonth}
                                    onChange={(e) => setReportMonth(e.target.value)}
                                  />
                                </div>
                                <div className="rounded-md border border-dashed border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                                  O relatório inclui sessões, presença, prontuários e anotações do mês selecionado.
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
                                  Cancelar
                                </Button>
                                <Button onClick={handleGenerateMonthlyReport} className="gap-2">
                                  <Download className="h-4 w-4" />
                                  Gerar PDF
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <TabsContent value="agenda" className="mt-0">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-foreground">Agenda do Dia</h3>
                      <p className="text-sm text-muted-foreground">
                        {filteredAppointments.length} consulta(s) para hoje
                      </p>
                    </div>
                    <ScrollArea className="h-[600px] pr-4">
                      {filteredAppointments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <svg
                            className="h-24 w-24 text-muted-foreground/30"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                            <path d="M8 14h.01"></path>
                            <path d="M12 14h.01"></path>
                            <path d="M16 14h.01"></path>
                            <path d="M8 18h.01"></path>
                            <path d="M12 18h.01"></path>
                            <path d="M16 18h.01"></path>
                          </svg>
                          <p className="mt-4 text-sm font-medium text-foreground">
                            Nenhuma consulta para hoje
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            A agenda para o dia selecionado aparecerá aqui.
                          </p>
                        </div>
                      ) : (
                        <div className="relative space-y-4">
                          <div className="absolute left-4 top-4 bottom-4 w-px bg-border -z-10"></div>
                          {filteredAppointments.map((appointment) => (
                             <div key={appointment.id} className="relative flex gap-4 items-start">
                               <div className="flex-shrink-0 w-20 text-right">
                                  <p className="text-sm font-semibold text-foreground">{appointment.time}</p>
                                  <p className="text-xs text-muted-foreground">{parseInt(appointment.time) + 1}:00</p>
                               </div>
                               <div className="flex-shrink-0 mt-1">
                                  <div className={`w-3 h-3 rounded-full ${getStatusColor(appointment.status)}`}></div>
                               </div>
                               <div className="flex-1 space-y-2">
                                <div className="group relative rounded-lg border border-border/50 bg-card p-3 transition-all hover:border-primary/50 hover:shadow-md">
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
                                      </div>
                                    </div>
                                    {appointment.reason && (
                                      <div className="text-sm text-muted-foreground">
                                        <span className="font-medium text-foreground">Motivo:</span>{' '}
                                        {appointment.reason}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 bg-transparent"
                                    onClick={() => handleViewPatientProfile(appointment.patientId)}
                                  >
                                    <User className="h-4 w-4" />
                                    Ver Perfil
                                  </Button>
                                  <Dialog
                                    open={isEditDialogOpen && editingAppointment?.id === appointment.id}
                                    onOpenChange={(open) => {
                                      setIsEditDialogOpen(open)
                                      if (!open) setEditingAppointment(null)
                                    }}
                                  >
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 bg-transparent"
                                        onClick={() => {
                                          setEditingAppointment({
                                            ...appointment,
                                            notificationPreference: 'email',
                                          })
                                          setIsEditDialogOpen(true)
                                        }}
                                      >
                                        <Edit className="h-4 w-4" />
                                        Editar
                                      </Button>
                                    </DialogTrigger>
                                  </Dialog>
                                </div>
                              </div>
                               </div>
                             </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="availability" className="mt-0">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-foreground">Disponibilidade Semanal</h3>
                        <p className="text-sm text-muted-foreground">
                          Defina seus horários de atendimento recorrentes.
                        </p>
                      </div>
                      <div className="space-y-3">
                        {weekDays.map(({ id, label }) => (
                          <div key={id} className="grid gap-3 rounded-md border border-border/50 p-3 sm:grid-cols-[120px_1fr_1fr_auto] sm:items-center sm:border-0 sm:p-0">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={availability.weekly[id].enabled}
                                onCheckedChange={(checked) => handleUpdateAvailability(id, 'enabled', checked)}
                              />
                              <Label className="font-medium">{label}</Label>
                            </div>
                            <Input
                              type="time"
                              value={availability.weekly[id].start}
                              onChange={(e) => handleUpdateAvailability(id, 'start', e.target.value)}
                              disabled={!availability.weekly[id].enabled}
                            />
                            <Input
                              type="time"
                              value={availability.weekly[id].end}
                              onChange={(e) => handleUpdateAvailability(id, 'end', e.target.value)}
                              disabled={!availability.weekly[id].enabled}
                            />
                          </div>
                        ))}
                      </div>
                      <Button onClick={handleSaveAvailability} disabled={isSavingAvailability}>
                        {isSavingAvailability ? 'Salvando...' : 'Salvar Disponibilidade'}
                      </Button>
                      {availabilityError && (
                        <p className="text-sm text-destructive">{availabilityError}</p>
                      )}
                    </div>
                  </TabsContent>
                </CardContent>
              </Card>
            </Tabs>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Conexão com Google</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Conecte sua agenda do Google para sincronizar automaticamente seus horários e criar links de videochamada.
                </p>
                {googleStatus?.connected ? (
                  <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700">
                    Conectado como <span className="font-medium">{googleStatus.email}</span> em {googleConnectedAtLabel}.
                  </div>
                ) : (
                  <Button onClick={handleConnectGoogle} disabled={isConnectingGoogle} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5.03,16.42 5.03,12.5C5.03,8.58 8.36,5.73 12.19,5.73C14.03,5.73 15.6,6.33 16.84,7.48L18.83,5.48C17.06,3.87 14.86,3 12.19,3C7.24,3 3.19,6.66 3.19,12.5C3.19,18.34 7.24,22 12.19,22C17.14,22 21.5,18.33 21.5,12.71C21.5,12.09 21.43,11.59 21.35,11.1Z"></path>
                    </svg>
                    Conectar com Google Calendar
                  </Button>
                )}
                {googleConnectError && (
                  <p className="text-sm text-destructive">{googleConnectError}</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Lembretes Rápidos</CardTitle>
                <Dialog open={isAddReminderOpen} onOpenChange={setIsAddReminderOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="h-4 w-4" /> Novo Lembrete
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Novo Lembrete</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Textarea
                        value={newReminderText}
                        onChange={(e) => setNewReminderText(e.target.value)}
                        placeholder="Escreva seu lembrete aqui..."
                        rows={3}
                      />
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="gap-2">
                              <CalendarIcon className="h-4 w-4" />
                              {newReminderDate ? newReminderDate.toLocaleDateString('pt-BR') : 'Data'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={newReminderDate ?? undefined}
                              onSelect={(date) => setNewReminderDate(date ?? null)}
                            />
                          </PopoverContent>
                        </Popover>
                        <Select
                          value={newReminderColor}
                          onValueChange={(value: Reminder['color']) => setNewReminderColor(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="blue">Azul</SelectItem>
                            <SelectItem value="green">Verde</SelectItem>
                            <SelectItem value="amber">Amarelo</SelectItem>
                            <SelectItem value="red">Vermelho</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddReminderOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddReminder}>Adicionar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-3">
                {reminders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum lembrete.</p>
                ) : (
                  reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className={`rounded-md border p-3 ${getReminderColorClasses(reminder.color)}`}
                    >
                      <p className={`text-sm ${getReminderTextColor(reminder.color)}`}>{reminder.text}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                          {reminder.remindAt
                            ? `Lembrar em: ${reminder.remindAt.toLocaleDateString('pt-BR')}`
                            : ''}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingReminder(reminder)
                              setIsReminderDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDeleteReminder(reminder.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Lembrete</DialogTitle>
          </DialogHeader>
          {editingReminder && (
            <div className="py-4 space-y-4">
              <Textarea
                value={editingReminder.text}
                onChange={(e) =>
                  setEditingReminder({ ...editingReminder, text: e.target.value })
                }
                rows={4}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {editingReminder.remindAt
                        ? editingReminder.remindAt.toLocaleDateString('pt-BR')
                        : 'Data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editingReminder.remindAt ?? undefined}
                      onSelect={(date) =>
                        setEditingReminder({ ...editingReminder, remindAt: date ?? null })
                      }
                    />
                  </PopoverContent>
                </Popover>
                <Select
                  value={editingReminder.color}
                  onValueChange={(value: Reminder['color']) =>
                    setEditingReminder({ ...editingReminder, color: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Azul</SelectItem>
                    <SelectItem value="green">Verde</SelectItem>
                    <SelectItem value="amber">Amarelo</SelectItem>
                    <SelectItem value="red">Vermelho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsReminderDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveReminder}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPatientProfileOpen} onOpenChange={setIsPatientProfileOpen}>
        <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-4xl">
          {viewingPatient && (
            <>
              <DialogHeader>
                <DialogTitle>Perfil do Paciente</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-6">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                    <User className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <EditableField
                      fieldId="name"
                      label="Nome"
                      value={viewingPatient.name}
                      onSave={handleSaveEditingField}
                    />
                    <EditableField
                      fieldId="email"
                      label="Email"
                      value={viewingPatient.email}
                      onSave={handleSaveEditingField}
                    />
                     <EditableField
                      fieldId="phone"
                      label="Telefone"
                      value={viewingPatient.phone}
                      onSave={handleSaveEditingField}
                    />
                  </div>
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard title="Consultas Totais" value={viewingPatient.totalAppointments} />
                  <StatCard title="Concluídas" value={viewingPatient.completedAppointments} />
                  <StatCard title="Próximas" value={viewingPatient.upcomingAppointments} />
                   <StatCard title="Faltas" value={0} />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditableField({ fieldId, label, value, onSave }: { fieldId: string, label: string, value: string, onSave: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  const handleSave = () => {
    // onSave(fieldId, currentValue);
    setIsEditing(false);
  };

  return (
    <div className="space-y-1">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <Button size="icon" onClick={handleSave}><Check className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => setIsEditing(false)}><X className="h-4 w-4" /></Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <p className="text-lg font-medium text-foreground">{value || 'Não informado'}</p>
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string, value: number }) {
  return (
    <div className="bg-muted/50 p-4 rounded-lg">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
