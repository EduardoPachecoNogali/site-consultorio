'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Mail, ShieldCheck, Clock, Check, Send, Trash2 } from 'lucide-react'
import { PsychologistProfile } from '@/lib/psychologists'

interface NewPsychologistForm {
  name: string
  email: string
  notes: string
}

const formatDate = (isoDate: string) => {
  try {
    return new Date(isoDate).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return isoDate
  }
}

export default function AdminPsychologistsPage() {
  const [psychologists, setPsychologists] = useState<PsychologistProfile[]>([])
  const [newPsychologist, setNewPsychologist] = useState<NewPsychologistForm>({
    name: '',
    email: '',
    notes: '',
  })
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionMessage, setActionMessage] = useState('')

  const loadPsychologists = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/psychologists')
      if (!response.ok) {
        throw new Error('Erro ao carregar cadastros.')
      }
      const data = await response.json()
      setPsychologists(data.psychologists)
    } catch (error) {
      console.error(error)
      setActionMessage('Não foi possível carregar os cadastros. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPsychologists()
  }, [])

  const pendingPsychologists = useMemo(
    () => psychologists.filter((profile) => profile.status === 'pending'),
    [psychologists],
  )

  const approvedPsychologists = useMemo(
    () => psychologists.filter((profile) => profile.status === 'approved'),
    [psychologists],
  )

  const handleAddPsychologist = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedbackMessage('')
    setActionMessage('')

    const normalizedEmail = newPsychologist.email.trim().toLowerCase()
    if (!normalizedEmail) {
      setFeedbackMessage('Informe um email profissional válido.')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch('/api/psychologists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPsychologist.name,
          email: normalizedEmail,
          notes: newPsychologist.notes,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar cadastro.')
      }
      setNewPsychologist({ name: '', email: '', notes: '' })
      setFeedbackMessage('Cadastro em análise criado com sucesso.')
      await loadPsychologists()
    } catch (error: any) {
      setFeedbackMessage(error.message || 'Erro ao criar cadastro.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApprove = async (profile: PsychologistProfile) => {
    try {
      setActionMessage('')
      const response = await fetch(`/api/psychologists/${profile.id}/approve`, {
        method: 'POST',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao aprovar cadastro.')
      }
      await loadPsychologists()
      setActionMessage(`PIN enviado para ${profile.email}.`)
    } catch (error: any) {
      setActionMessage(error.message || 'Erro ao aprovar cadastro.')
    }
  }

  const handleResendPin = async (profile: PsychologistProfile) => {
    try {
      const response = await fetch(`/api/psychologists/${profile.id}/resend-pin`, {
        method: 'POST',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao reenviar PIN.')
      }
      setActionMessage(`PIN reenviado para ${profile.email}.`)
    } catch (error: any) {
      setActionMessage(error.message || 'Erro ao reenviar PIN.')
    }
  }

  const handleDelete = async (profile: PsychologistProfile) => {
    if (!confirm(`Remover o cadastro de ${profile.name}?`)) {
      return
    }
    try {
      const response = await fetch(`/api/psychologists/${profile.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao remover cadastro.')
      }
      await loadPsychologists()
      setActionMessage('Cadastro removido.')
    } catch (error: any) {
      setActionMessage(error.message || 'Erro ao remover cadastro.')
    }
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Administração de Psicólogos</CardTitle>
                <CardDescription>
                  Área confidencial. Compartilhe a URL apenas com a equipe autorizada.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Cadastre novos profissionais, aprove ou reenvie PINs quando necessário. Todas as
              informações ficam armazenadas com segurança em seu banco PostgreSQL.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Novo cadastro em análise</CardTitle>
              <CardDescription>Use este formulário para iniciar o processo de aprovação.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPsychologist} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-new-name">Nome completo</Label>
                  <Input
                    id="admin-new-name"
                    value={newPsychologist.name}
                    onChange={(e) =>
                      setNewPsychologist((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Dr(a). Nome Sobrenome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-new-email">Email profissional</Label>
                  <Input
                    id="admin-new-email"
                    type="email"
                    value={newPsychologist.email}
                    onChange={(e) =>
                      setNewPsychologist((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="psicologo@mindcare.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-new-notes">Notas internas (opcional)</Label>
                  <Textarea
                    id="admin-new-notes"
                    rows={3}
                    value={newPsychologist.notes}
                    onChange={(e) =>
                      setNewPsychologist((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Informações adicionais para a equipe administrativa."
                  />
                </div>
                {feedbackMessage && (
                  <p className="text-sm text-muted-foreground">{feedbackMessage}</p>
                )}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Registrando...' : 'Registrar para aprovação'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
              <CardDescription>Visão geral dos cadastros e status atuais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-md border border-border/50 p-3">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-semibold text-foreground">{pendingPsychologists.length}</p>
                </div>
                <Clock className="h-10 w-10 text-amber-500" />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border/50 p-3">
                <div>
                  <p className="text-sm text-muted-foreground">Aprovados</p>
                  <p className="text-2xl font-semibold text-foreground">{approvedPsychologists.length}</p>
                </div>
                <Check className="h-10 w-10 text-emerald-500" />
              </div>
              <p className="text-xs text-muted-foreground">
                Guarde esta URL com segurança. Qualquer pessoa com acesso a ela consegue gerenciar cadastros.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pendentes de aprovação</CardTitle>
            <CardDescription>Envie o PIN assim que validar o profissional.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && (
              <p className="text-sm text-muted-foreground">Carregando cadastros...</p>
            )}
            {pendingPsychologists.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cadastro pendente no momento.</p>
            ) : (
              pendingPsychologists.map((profile) => (
                <div
                  key={profile.id}
                  className="rounded-lg border border-dashed border-border/60 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{profile.name}</p>
                      <p className="text-xs text-muted-foreground">{profile.email}</p>
                    </div>
                    <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                      Em análise
                    </Badge>
                  </div>
                  {profile.notes && (
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{profile.notes}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">Registrado em {formatDate(profile.createdAt)}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => handleApprove(profile)}>
                      <Send className="mr-2 h-4 w-4" />
                      Aprovar e enviar PIN
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(profile)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Psicólogos aprovados</CardTitle>
            <CardDescription>Gerencie PINs ativos e acesse informações rapidamente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionMessage && (
              <p className="text-sm text-muted-foreground">{actionMessage}</p>
            )}
            {approvedPsychologists.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum profissional aprovado ainda.</p>
            ) : (
              approvedPsychologists.map((profile) => (
                <div
                  key={profile.id}
                  className="rounded-lg border border-border/60 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{profile.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {profile.email}
                      </div>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/50 text-emerald-600">
                      Aprovado
                    </Badge>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3 text-sm">
                    <p className="text-muted-foreground">PIN enviado</p>
                    <p className="text-lg font-semibold tracking-[0.3em]">
                      {profile.pin ?? '------'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!profile.pin}
                      onClick={() => profile.pin && handleResendPin(profile)}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Reenviar PIN
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(profile)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover
                    </Button>
                  </div>
                  <Separator />
                  <p className="text-[11px] text-muted-foreground">
                    Aprovado em {formatDate(profile.createdAt)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
