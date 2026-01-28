'use client'

import { useCallback, useEffect, useState, KeyboardEvent } from 'react'
import { Calendar as CalendarIcon, Clock, User, Search, Plus, Edit, ChevronLeft, ChevronRight, LogOut, FileText, Video, Trash2, Mail, Check, X, Phone, Stethoscope, TrendingUp } from 'lucide-react'
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

type AppointmentStatus = 'upcoming' | 'in-progress' | 'completed' | 'cancelled' | 'rescheduled'

interface MedicalRecord {
  id: string
  date: Date
  title: string
  content: string
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
type GoogleStatusPayload = {
  connected: boolean
  email?: string
  connectedAt?: string | null
}
type DashboardPayload = {
  google?: GoogleStatusPayload
  patients: ApiPatientProfile[]
  appointments: ApiAppointment[]
  reminders: Reminder[]
}

const hydrateDashboard = (payload: DashboardPayload) => ({
  patients: payload.patients.map((patient) => ({
    ...patient,
    medicalRecords: patient.medicalRecords.map((record) => ({
      ...record,
      date: new Date(record.date),
    })),
  })),
  appointments: payload.appointments.map((appointment) => ({
    ...appointment,
    notificationPreference: 'email',
    meetingUrl: appointment.meetingUrl || '',
    date: new Date(appointment.date),
  })),
  reminders: payload.reminders,
})

const formatDateForApi = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
  const [viewingPatient, setViewingPatient] = useState<PatientProfile | null>(null)
  const [isPatientProfileOpen, setIsPatientProfileOpen] = useState(false)
  const [newRecordTitle, setNewRecordTitle] = useState('')
  const [newRecordContent, setNewRecordContent] = useState('')
  
  // Novo formulário de consulta
  const [newAppointment, setNewAppointment] = useState({
    patientName: '',
    time: '',
    duration: '50 min',
    date: new Date(),
    notes: '',
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
  const [googleStatus, setGoogleStatus] = useState<GoogleStatusPayload | null>(null)
  const [googleConnectError, setGoogleConnectError] = useState('')
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)

  const loadDashboard = useCallback(async () => {
    if (!psychologistId) return
    setIsLoading(true)
    setLoadError('')
    try {
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
            notificationPreference: 'email',
            patientContact: editingAppointment.patientContact,
          }),
        },
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao atualizar consulta.')
      }

      await loadDashboard()
      setIsEditDialogOpen(false)
      setEditingAppointment(null)
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Erro ao atualizar consulta.')
    }
  }

  const resetNewAppointmentForm = () => {
    setNewAppointment({
      patientName: '',
      time: '',
      duration: '50 min',
      date: new Date(),
      notes: '',
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
      return
    }

    if (!newAppointment.patientEmail.trim()) {
      alert('Informe o email do paciente.')
      return
    }

    const patientContact = newAppointment.patientEmail.trim()

    try {
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
      setIsNewAppointmentOpen(false)
      resetNewAppointmentForm()
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Erro ao criar consulta.')
    }
  }

  const handleDeleteAppointment = async (id: string) => {
    if (!psychologistId) return
    if (!confirm('Tem certeza que deseja excluir esta consulta?')) return

    try {
      const response = await fetch(
        `/api/psychologists/${psychologistId}/appointments/${id}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao excluir consulta.')
      }
      await loadDashboard()
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Erro ao excluir consulta.')
    }
  }

  const handleStartCall = async (appointment: Appointment) => {
    if (!psychologistId) return
    const contact = appointment.patientContact

    try {
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

      alert(`${prefix} via ${label} para ${resolvedContact}\n\nMensagem: ${message}`)

      if (meetingUrl) {
        window.open(meetingUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Erro ao enviar notificação.')
    }
  }

  const handleConnectGoogle = async () => {
    if (!psychologistId) return
    setIsConnectingGoogle(true)
    setGoogleConnectError('')

    try {
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
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Erro ao atualizar paciente.')
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
      const response = await fetch(
        `/api/psychologists/${psychologistId}/patients/${viewingPatient.id}/records`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newRecordTitle,
            content: newRecordContent,
          }),
        },
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao salvar prontuário.')
      }

      await loadDashboard()
      setNewRecordTitle('')
      setNewRecordContent('')
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Erro ao salvar prontuário.')
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
          }),
        },
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao atualizar prontuário.')
      }

      await loadDashboard()
      setIsEditRecordDialogOpen(false)
      setEditingRecord(null)
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Erro ao atualizar prontuário.')
    }
  }

  const handleDeleteMedicalRecord = async (recordId: string) => {
    if (!viewingPatient || !psychologistId) return
    if (!confirm('Deseja excluir este prontuário?')) return

    try {
      const response = await fetch(
        `/api/psychologists/${psychologistId}/patients/${viewingPatient.id}/records/${recordId}`,
        { method: 'DELETE' },
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao excluir prontuário.')
      }

      await loadDashboard()
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Erro ao excluir prontuário.')
    }
  }

  const handleSaveReminder = async () => {
    if (!editingReminder || !psychologistId) return

    try {
      const response = await fetch(
        `/api/psychologists/${psychologistId}/reminders/${editingReminder.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: editingReminder.text,
            color: editingReminder.color,
          }),
        },
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao atualizar lembrete.')
      }

      await loadDashboard()
      setIsReminderDialogOpen(false)
      setEditingReminder(null)
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Erro ao atualizar lembrete.')
    }
  }

  const handleAddReminder = async () => {
    if (!psychologistId) return
    if (!newReminderText.trim()) return

    try {
      const response = await fetch(
        `/api/psychologists/${psychologistId}/reminders`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: newReminderText,
            color: newReminderColor,
          }),
        },
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao criar lembrete.')
      }

      await loadDashboard()
      setNewReminderText('')
      setNewReminderColor('blue')
      setIsAddReminderOpen(false)
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Erro ao criar lembrete.')
    }
  }

  const handleDeleteReminder = async (id: string) => {
    if (!psychologistId) return

    try {
      const response = await fetch(
        `/api/psychologists/${psychologistId}/reminders/${id}`,
        { method: 'DELETE' },
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao excluir lembrete.')
      }

      await loadDashboard()
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Erro ao excluir lembrete.')
    }
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

                  <Button variant="outline" className="gap-2 bg-transparent">
                    <FileText className="h-4 w-4" />
                    Relatórios
                  </Button>
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

                                        <div className="space-y-2">
                                          <Label htmlFor="edit-notification">Preferência de Notificação</Label>
                                          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                                            <Mail className="h-4 w-4" />
                                            Email
                                          </div>
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
                      <p className={`text-sm pr-16 ${getReminderTextColor(reminder.color)}`}>
                        {reminder.text}
                      </p>
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
