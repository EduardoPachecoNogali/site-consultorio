'use client'

import { useCallback, useEffect, useMemo, useState, KeyboardEvent } from 'react'
import { Calendar as CalendarIcon, Clock, User, Search, Plus, Edit, ChevronLeft, ChevronRight, LogOut, FileText, Video, Trash2, Mail, Check, X, Phone, Stethoscope, TrendingUp, Users, Tag, CalendarClock, AlertCircle, CheckCircle2, Download } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

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
    notificationPreference: 'email',
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

  const loadDashboard = useCallback(async () => {
    if (!psychologistId) return
    setIsLoading(true)
    setLoadError('')
    try {
      console.log('[dashboard] carregando dados', { psychologistId })
      const response = await fetch(`/api/psychologists/${psychologistId}/dashboard`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao carregar dados.')
      }
      const data = (await response.json()) as DashboardPayload
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
        const data = await response.json()
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
        const data = await response.json()
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
        const data = await response.json()
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
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao enviar notificação.')
      }

      const data = await response.json().catch(() => ({}))
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
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao iniciar conexão com o Google.')
      }
      const data = await response.json()
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
        const data = await response.json()
        throw new Error(data.error || 'Erro ao salvar disponibilidade.')
      }

      const data = await response.json()
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
        const data = await response.json()
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
        const data = await response.json()
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
        const data = await response.json()
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
        const data = await response.json()
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
        const data = await response.json()
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
        const data = await response.json()
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
        const data = await response.json()
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
        return 'bg-[#f2e9ff] text-[#4c1e70] border-[#d7bcff]'
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
        return 'bg-[#f2e9ff] border-[#d7bcff]'
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
        return 'text-[#4c1e70]'
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

  const CalendarDayContent = ({
    date,
    activeModifiers,
  }: {
    date: Date
    activeModifiers: { [key: string]: boolean }
  }) => {
    const day = date.getDate()
    const hasAppointment = activeModifiers.hasAppointment
    const hasReminder = activeModifiers.hasReminder

    return (
      <div className="flex flex-col items-center">
        <span>{day}</span>
        <span className="mt-1 flex items-center gap-1">
          {hasAppointment && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
          {hasReminder && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
        </span>
      </div>
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f2e9ff]">
                      <Check className="h-5 w-5 text-[#5a238a]" />
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

            {/* Actions + Calendar + Search */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex flex-col gap-3">
                  <CardTitle className="text-foreground">Ações Rápidas</CardTitle>
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
                            components={{ DayContent: CalendarDayContent }}
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

                    <div className="relative w-full lg:w-64">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar paciente..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
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
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              </CardContent>
            </Card>

            {/* Appointments List */}
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
                                    {appointment.isGroup && (
                                      <Badge variant="outline" className="border-blue-500/30 text-blue-700">
                                        <Users className="mr-1 h-3 w-3" />
                                        Grupo
                                      </Badge>
                                    )}
                                    {appointment.groupRequested && !appointment.isGroup && (
                                      <Badge variant="outline" className="border-amber-500/30 text-amber-700">
                                        Solicitação de grupo
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="border-border/50 text-muted-foreground">
                                      {appointment.attendanceStatus === 'present'
                                        ? 'Compareceu'
                                        : appointment.attendanceStatus === 'absent'
                                          ? 'Faltou'
                                          : appointment.attendanceStatus === 'excused'
                                            ? 'Justificado'
                                            : 'Presença pendente'}
                                    </Badge>
                                  </div>
                                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5" />
                                      {appointment.time}
                                    </span>
                                    <span>•</span>
                                    <span>{appointment.duration}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3.5 w-3.5" />
                                      Email
                                    </span>
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
                                </div>
                              </div>

                              {appointment.notes && (
                                <div className="rounded-md bg-muted/50 p-3">
                                  <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                                </div>
                              )}

                              {appointment.reason && (
                                <div className="rounded-md border border-border/60 bg-background p-3 text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">Motivo:</span>{' '}
                                  {appointment.reason}
                                </div>
                              )}

                              {appointment.groupRequested && appointment.groupRequestNote && !appointment.isGroup && (
                                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
                                  <span className="font-medium">Solicitação de grupo:</span>{' '}
                                  {appointment.groupRequestNote}
                                </div>
                              )}

                              {appointment.isGroup && (
                                <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">Grupo:</span>{' '}
                                  {appointment.groupName || 'Consulta em grupo'}
                                  {appointment.groupParticipants.length > 0 && (
                                    <span>
                                      {' '}
                                      • {appointment.groupParticipants.length} participante(s)
                                    </span>
                                  )}
                                </div>
                              )}

                              {(appointment.tags.length > 0 || appointment.groupTags.length > 0) && (
                                <div className="flex flex-wrap gap-2">
                                  {appointment.tags.map((tag) => (
                                    <Badge key={`tag-${appointment.id}-${tag}`} variant="secondary">
                                      <Tag className="mr-1 h-3 w-3" />
                                      {tag}
                                    </Badge>
                                  ))}
                                  {appointment.groupTags.map((tag) => (
                                    <Badge key={`group-tag-${appointment.id}-${tag}`} variant="outline">
                                      <Users className="mr-1 h-3 w-3" />
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}

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
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Editar Consulta</DialogTitle>
                                      <DialogDescription>
                                        Altere os detalhes da consulta
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
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                          <div className="space-y-2">
                                            <Label htmlFor="edit-attendance">Presença</Label>
                                            <Select
                                              value={editingAppointment.attendanceStatus}
                                              onValueChange={(value: AttendanceStatus) =>
                                                setEditingAppointment({
                                                  ...editingAppointment,
                                                  attendanceStatus: value,
                                                })
                                              }
                                            >
                                              <SelectTrigger id="edit-attendance">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="pending">Pendente</SelectItem>
                                                <SelectItem value="present">Compareceu</SelectItem>
                                                <SelectItem value="absent">Faltou</SelectItem>
                                                <SelectItem value="excused">Justificado</SelectItem>
                                              </SelectContent>
                                            </Select>
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
                                            />
                                          </div>
                                        </div>

                                        <div className="space-y-2">
                                          <Label htmlFor="edit-date">Data</Label>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button
                                                variant="outline"
                                                className="w-full justify-start gap-2 bg-transparent"
                                              >
                                                <CalendarIcon className="h-4 w-4" />
                                                {editingAppointment.date.toLocaleDateString('pt-BR')}
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                              <Calendar
                                                mode="single"
                                                selected={editingAppointment.date}
                                                onSelect={(date) =>
                                                  date &&
                                                  setEditingAppointment({
                                                    ...editingAppointment,
                                                    date,
                                                  })
                                                }
                                              />
                                            </PopoverContent>
                                          </Popover>
                                        </div>

                                        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <p className="text-sm font-medium text-foreground">
                                                Consulta em grupo
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                Marque para associar participantes e tags coletivas.
                                              </p>
                                            </div>
                                            <Switch
                                              checked={editingAppointment.isGroup}
                                              onCheckedChange={(checked) =>
                                                setEditingAppointment({
                                                  ...editingAppointment,
                                                  isGroup: checked,
                                                  groupRequested: checked
                                                    ? false
                                                    : editingAppointment.groupRequested,
                                                })
                                              }
                                            />
                                          </div>
                                          {editingAppointment.groupRequested && !editingAppointment.isGroup && (
                                            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800">
                                              Solicitação de grupo feita pelo paciente.
                                            </div>
                                          )}
                                          {editingAppointment.isGroup && (
                                            <div className="grid gap-4 sm:grid-cols-2">
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-group-name">Nome do grupo</Label>
                                                <Input
                                                  id="edit-group-name"
                                                  value={editingAppointment.groupName ?? ''}
                                                  onChange={(e) =>
                                                    setEditingAppointment({
                                                      ...editingAppointment,
                                                      groupName: e.target.value,
                                                    })
                                                  }
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label htmlFor="edit-group-size">Tamanho</Label>
                                                <Input
                                                  id="edit-group-size"
                                                  type="number"
                                                  min={2}
                                                  value={editingAppointment.groupSize ?? ''}
                                                  onChange={(e) =>
                                                    setEditingAppointment({
                                                      ...editingAppointment,
                                                      groupSize: Number(e.target.value),
                                                    })
                                                  }
                                                />
                                              </div>
                                              <div className="space-y-2 sm:col-span-2">
                                                <Label htmlFor="edit-group-participants">
                                                  Participantes (emails)
                                                </Label>
                                                <Input
                                                  id="edit-group-participants"
                                                  value={editingAppointment.groupParticipants.join(', ')}
                                                  onChange={(e) =>
                                                    setEditingAppointment({
                                                      ...editingAppointment,
                                                      groupParticipants: parseTags(e.target.value),
                                                    })
                                                  }
                                                />
                                              </div>
                                              <div className="space-y-2 sm:col-span-2">
                                                <Label htmlFor="edit-group-tags">Tags do grupo</Label>
                                                <Input
                                                  id="edit-group-tags"
                                                  value={editingAppointment.groupTags.join(', ')}
                                                  onChange={(e) =>
                                                    setEditingAppointment({
                                                      ...editingAppointment,
                                                      groupTags: parseTags(e.target.value),
                                                    })
                                                  }
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        <div className="space-y-2">
                                          <Label htmlFor="edit-notification">Preferência de Notificação</Label>
                                          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                                            <Mail className="h-4 w-4" />
                                            Email
                                          </div>
                                        </div>

                                        <div className="space-y-2">
                                          <Label htmlFor="edit-reason">Motivo da Consulta</Label>
                                          <Textarea
                                            id="edit-reason"
                                            value={editingAppointment.reason}
                                            onChange={(e) =>
                                              setEditingAppointment({
                                                ...editingAppointment,
                                                reason: e.target.value,
                                              })
                                            }
                                            rows={3}
                                          />
                                        </div>

                                        <div className="space-y-2">
                                          <Label htmlFor="edit-notes">Notas</Label>
                                          <Textarea
                                            id="edit-notes"
                                            value={editingAppointment.notes}
                                            onChange={(e) =>
                                              setEditingAppointment({
                                                ...editingAppointment,
                                                notes: e.target.value,
                                              })
                                            }
                                            rows={4}
                                          />
                                        </div>

                                        <div className="space-y-2">
                                          <Label htmlFor="edit-tags">Tags privadas</Label>
                                          <Input
                                            id="edit-tags"
                                            value={editingAppointment.tags.join(', ')}
                                            onChange={(e) =>
                                              setEditingAppointment({
                                                ...editingAppointment,
                                                tags: parseTags(e.target.value),
                                              })
                                            }
                                          />
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => setIsEditDialogOpen(false)}
                                      >
                                        Cancelar
                                      </Button>
                                      <Button onClick={handleSaveAppointment}>Salvar</Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 bg-transparent"
                                  onClick={() => handleDeleteAppointment(appointment.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Excluir
                                </Button>
                              </div>
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

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground text-base">Disponibilidade</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Defina seus horários para o paciente agendar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {weekDays.map((day) => (
                    <div key={day.id} className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
                      <Switch
                        checked={availability.weekly[day.id]?.enabled}
                        onCheckedChange={(checked) => handleUpdateAvailability(day.id, 'enabled', checked)}
                      />
                      <div className="text-xs text-muted-foreground">{day.label}</div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={availability.weekly[day.id]?.start}
                          onChange={(e) => handleUpdateAvailability(day.id, 'start', e.target.value)}
                          className="h-8"
                        />
                        <span className="text-xs text-muted-foreground">até</span>
                        <Input
                          type="time"
                          value={availability.weekly[day.id]?.end}
                          onChange={(e) => handleUpdateAvailability(day.id, 'end', e.target.value)}
                          className="h-8"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="availability-slot">Duração (min)</Label>
                    <Input
                      id="availability-slot"
                      type="number"
                      min={20}
                      value={availability.slotDurationMinutes}
                      onChange={(e) =>
                        setAvailability({
                          ...availability,
                          slotDurationMinutes: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="availability-buffer">Intervalo (min)</Label>
                    <Input
                      id="availability-buffer"
                      type="number"
                      min={0}
                      value={availability.bufferMinutes}
                      onChange={(e) =>
                        setAvailability({
                          ...availability,
                          bufferMinutes: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="rounded-md border border-border/60 bg-muted/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Permitir grupos</p>
                      <p className="text-xs text-muted-foreground">
                        Habilita agendamento de consultas coletivas.
                      </p>
                    </div>
                    <Switch
                      checked={availability.allowGroup}
                      onCheckedChange={(checked) =>
                        setAvailability({ ...availability, allowGroup: checked })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="availability-max-group">Máximo de participantes</Label>
                    <Input
                      id="availability-max-group"
                      type="number"
                      min={2}
                      value={availability.maxGroupSize}
                      onChange={(e) =>
                        setAvailability({ ...availability, maxGroupSize: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>

                {availabilityError && (
                  <p className="text-xs text-destructive">{availabilityError}</p>
                )}
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleSaveAvailability}
                  disabled={isSavingAvailability || !psychologistId}
                >
                  <CalendarClock className="h-4 w-4" />
                  {isSavingAvailability ? 'Salvando...' : 'Salvar disponibilidade'}
                </Button>
              </CardContent>
            </Card>

            {/* Google Calendar */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground text-base">Google Calendar</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Gere links do Meet automaticamente nas consultas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {googleStatus?.connected ? (
                    <div className="text-sm text-emerald-600">
                      Conectado{googleStatus.email ? `: ${googleStatus.email}` : ''}
                      {googleConnectedAtLabel ? ` em ${googleConnectedAtLabel}` : ''}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Ainda não conectado.
                    </div>
                  )}
                  {googleConnectError && (
                    <p className="text-xs text-destructive">{googleConnectError}</p>
                  )}
                  <Button
                    variant={googleStatus?.connected ? 'outline' : 'default'}
                    className="w-full"
                    onClick={handleConnectGoogle}
                    disabled={isConnectingGoogle || !psychologistId}
                  >
                    {isConnectingGoogle
                      ? 'Conectando...'
                      : googleStatus?.connected
                        ? 'Reconectar Google'
                        : 'Conectar Google Calendar'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Widget */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground text-base">Calendário</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border-0"
                  modifiers={calendarModifiers}
                  components={{ DayContent: CalendarDayContent }}
                />
              </CardContent>
            </Card>

            {/* Reminders */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground text-base">Lembretes</CardTitle>
                  <Dialog open={isAddReminderOpen} onOpenChange={setIsAddReminderOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Novo Lembrete</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-reminder-text">Texto</Label>
                          <Textarea
                            id="new-reminder-text"
                            value={newReminderText}
                            onChange={(e) => setNewReminderText(e.target.value)}
                            placeholder="Digite o lembrete..."
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-reminder-date">Data</Label>
                          <Input
                            id="new-reminder-date"
                            type="date"
                            value={newReminderDate ? newReminderDate.toISOString().split('T')[0] : ''}
                            onChange={(e) =>
                              setNewReminderDate(
                                e.target.value ? new Date(`${e.target.value}T12:00:00`) : null,
                              )
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Essa data aparecerá marcada no calendário.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-reminder-color">Cor</Label>
                          <Select
                            value={newReminderColor}
                            onValueChange={(value: 'amber' | 'blue' | 'green' | 'red') =>
                              setNewReminderColor(value)
                            }
                          >
                            <SelectTrigger id="new-reminder-color">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="amber">Amarelo</SelectItem>
                              <SelectItem value="blue">Azul</SelectItem>
                              <SelectItem value="green">Roxo pastel</SelectItem>
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
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className={`group relative rounded-lg border p-3 ${getReminderColorClasses(
                        reminder.color
                      )}`}
                    >
                      <div className="space-y-1 pr-16">
                        <p className={`text-sm ${getReminderTextColor(reminder.color)}`}>
                          {reminder.text}
                        </p>
                        {reminder.remindAt && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(reminder.remindAt).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
                              onClick={() => {
                                setEditingReminder(reminder)
                                setIsReminderDialogOpen(true)
                              }}
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
                                  <Label htmlFor="edit-reminder-text">Texto</Label>
                                  <Textarea
                                    id="edit-reminder-text"
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
                                  <Label htmlFor="edit-reminder-date">Data</Label>
                                  <Input
                                    id="edit-reminder-date"
                                    type="date"
                                    value={
                                      editingReminder.remindAt
                                        ? new Date(editingReminder.remindAt).toISOString().split('T')[0]
                                        : ''
                                    }
                                    onChange={(e) =>
                                      setEditingReminder({
                                        ...editingReminder,
                                        remindAt: e.target.value
                                          ? new Date(`${e.target.value}T12:00:00`)
                                          : null,
                                      })
                                    }
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
                                      <SelectItem value="amber">Amarelo</SelectItem>
                                      <SelectItem value="blue">Azul</SelectItem>
                                      <SelectItem value="green">Roxo pastel</SelectItem>
                                      <SelectItem value="red">Vermelho</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setIsReminderDialogOpen(false)}
                              >
                                Cancelar
                              </Button>
                              <Button onClick={handleSaveReminder}>Salvar</Button>
                            </div>
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
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Patient Profile Dialog */}
      <Dialog
        open={isPatientProfileOpen}
        onOpenChange={(open) => {
          setIsPatientProfileOpen(open)
          if (!open) {
            setEditingField(null)
            setEditingValue('')
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Perfil do Paciente</DialogTitle>
            <DialogDescription>
              Informações completas e prontuários
            </DialogDescription>
          </DialogHeader>
          {viewingPatient && (
            <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="records">Prontuários</TabsTrigger>
                <TabsTrigger value="contact">Contato</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="overview" className="space-y-4 mt-0">
                  <div className="rounded-lg border border-border/50 p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-8 w-8 text-primary" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {editingField === 'name' ? (
                            <Input
                              autoFocus
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={handleFieldInputKeyDown}
                              className="h-10 max-w-sm"
                              placeholder="Nome do paciente"
                            />
                          ) : (
                            <>
                              <h2 className="text-2xl font-semibold text-foreground">
                                {viewingPatient.name}
                              </h2>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartEditingField('name', viewingPatient.name)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">Idade:</span>
                            {editingField === 'basicInfo.age' ? (
                              <Input
                                autoFocus
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={handleFieldInputKeyDown}
                                className="h-8 max-w-[160px]"
                                placeholder="Ex: 32 anos"
                              />
                            ) : (
                              <span>{viewingPatient.basicInfo.age ?? 'Adicionar idade'}</span>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleStartEditingField('basicInfo.age', viewingPatient.basicInfo.age)
                              }
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">Profissão:</span>
                            {editingField === 'basicInfo.occupation' ? (
                              <Input
                                autoFocus
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={handleFieldInputKeyDown}
                                className="h-8 max-w-xs"
                                placeholder="Ex: Engenheiro"
                              />
                            ) : (
                              <span>
                                {viewingPatient.basicInfo.occupation ?? 'Adicionar profissão'}
                              </span>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleStartEditingField(
                                  'basicInfo.occupation',
                                  viewingPatient.basicInfo.occupation
                                )
                              }
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg bg-muted/50 p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-xs">Total de Consultas</span>
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {viewingPatient.totalAppointments}
                        </p>
                      </div>

                      <div className="rounded-lg bg-[#f2e9ff] p-4">
                        <div className="flex items-center gap-2 text-[#4c1e70]">
                          <Check className="h-4 w-4" />
                          <span className="text-xs">Concluídas</span>
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {viewingPatient.completedAppointments}
                        </p>
                      </div>

                      <div className="rounded-lg bg-amber-500/10 p-4">
                        <div className="flex items-center gap-2 text-amber-700">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs">Agendadas</span>
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {viewingPatient.upcomingAppointments}
                        </p>
                      </div>
                    </div>

                    {viewingPatient.basicInfo.emergencyContact && (
                      <>
                        <Separator className="my-6" />
                        <div>
                          <h3 className="text-sm font-medium text-foreground mb-2">
                            Contato de Emergência
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {viewingPatient.basicInfo.emergencyContact}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="records" className="space-y-4 mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground">
                        Prontuários ({viewingPatient.medicalRecords.length})
                      </h3>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                            <Plus className="h-4 w-4" />
                            Novo Prontuário
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Adicionar Prontuário</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="record-title">Título</Label>
                              <Input
                                id="record-title"
                                value={newRecordTitle}
                                onChange={(e) => setNewRecordTitle(e.target.value)}
                                placeholder="Ex: Consulta de acompanhamento"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="record-tags">Tags</Label>
                              <Input
                                id="record-tags"
                                value={newRecordTags}
                                onChange={(e) => setNewRecordTags(e.target.value)}
                                placeholder="ansiedade, sono, evolução"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="record-content">Conteúdo</Label>
                              <Textarea
                                id="record-content"
                                value={newRecordContent}
                                onChange={(e) => setNewRecordContent(e.target.value)}
                                placeholder="Observações da consulta, evolução, tratamento..."
                                rows={6}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => {
                              setNewRecordTitle('')
                              setNewRecordContent('')
                              setNewRecordTags('')
                            }}>
                              Cancelar
                            </Button>
                            <Button onClick={handleAddMedicalRecord}>Salvar</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {viewingPatient.medicalRecords.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/50 p-8 text-center">
                        <Stethoscope className="mx-auto h-12 w-12 text-muted-foreground/50" />
                        <p className="mt-4 text-sm text-muted-foreground">
                          Nenhum prontuário registrado ainda
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {viewingPatient.medicalRecords
                          .sort((a, b) => b.date.getTime() - a.date.getTime())
                          .map((record) => (
                            <div
                              key={record.id}
                              className="rounded-lg border border-border/50 bg-card p-4"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h4 className="font-medium text-foreground">{record.title}</h4>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {record.date.toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: 'long',
                                      year: 'numeric',
                                    })}
                                  </p>
                                  <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                                    {record.content}
                                  </p>
                                  {record.tags.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {record.tags.map((tag) => (
                                        <Badge key={`${record.id}-${tag}`} variant="secondary">
                                          <Tag className="mr-1 h-3 w-3" />
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleStartEditMedicalRecord(record)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => handleDeleteMedicalRecord(record.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="contact" className="space-y-4 mt-0">
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border/50 p-6">
                      <h3 className="text-sm font-medium text-foreground mb-4">
                        Informações de Contato
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Email</p>
                            {editingField === 'email' ? (
                              <Input
                                autoFocus
                                className="mt-1"
                                type="email"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={handleFieldInputKeyDown}
                                placeholder="email@exemplo.com"
                              />
                            ) : (
                              <div className="mt-1 flex items-center gap-2">
                                <p className="text-sm text-foreground">
                                  {viewingPatient.email || 'Adicionar email'}
                                </p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleStartEditingField('email', viewingPatient.email)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <Separator />
                        <div className="flex items-start gap-3">
                          <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Telefone</p>
                            {editingField === 'phone' ? (
                              <Input
                                autoFocus
                                className="mt-1"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={handleFieldInputKeyDown}
                                placeholder="+55 11 99999-9999"
                              />
                            ) : (
                              <div className="mt-1 flex items-center gap-2">
                                <p className="text-sm text-foreground">
                                  {viewingPatient.phone || 'Adicionar telefone'}
                                </p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleStartEditingField('phone', viewingPatient.phone)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <Separator />
                        <div className="flex items-start gap-3">
                          <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1 space-y-1">
                            <p className="text-xs text-muted-foreground">Contato de Emergência</p>
                            {editingField === 'basicInfo.emergencyContact' ? (
                              <Input
                                autoFocus
                                className="mt-1"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={handleFieldInputKeyDown}
                                placeholder="(11) 99999-9999 - Nome do contato"
                              />
                            ) : (
                              <div className="mt-1 flex items-center gap-2">
                                <p className="text-sm text-foreground">
                                  {viewingPatient.basicInfo.emergencyContact ||
                                    'Adicionar contato de emergência'}
                                </p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleStartEditingField(
                                      'basicInfo.emergencyContact',
                                      viewingPatient.basicInfo.emergencyContact
                                    )
                                  }
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Usado somente em situações emergenciais.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={isEditRecordDialogOpen}
        onOpenChange={(open) => {
          setIsEditRecordDialogOpen(open)
          if (!open) {
            setEditingRecord(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Prontuário</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-record-title">Título</Label>
                <Input
                  id="edit-record-title"
                  value={editingRecord.title}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      title: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-record-date">Data</Label>
                <Input
                  id="edit-record-date"
                  type="date"
                  value={editingRecord.date.toISOString().split('T')[0]}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      date: e.target.value ? new Date(e.target.value) : editingRecord.date,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-record-tags">Tags</Label>
                <Input
                  id="edit-record-tags"
                  value={editingRecord.tags.join(', ')}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      tags: parseTags(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-record-content">Conteúdo</Label>
                <Textarea
                  id="edit-record-content"
                  value={editingRecord.content}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      content: e.target.value,
                    })
                  }
                  rows={6}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditRecordDialogOpen(false)
                setEditingRecord(null)
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveEditedMedicalRecord}>
              Salvar alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
