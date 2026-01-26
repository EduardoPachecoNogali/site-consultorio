'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ShieldCheck } from 'lucide-react'
import { appConfig } from '@/lib/app-config'

interface NewPsychologistForm {
  name: string
  email: string
  notes: string
}

export default function AdminPsychologistsPage() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const [newPsychologist, setNewPsychologist] = useState<NewPsychologistForm>({
    name: '',
    email: '',
    notes: '',
  })
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/me')
      setIsAuthenticated(response.ok)
    } catch {
      setIsAuthenticated(false)
    } finally {
      setIsCheckingAuth(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    if (!loginEmail || !loginPassword) {
      setLoginError('Informe email e senha.')
      return
    }

    try {
      setIsLoggingIn(true)
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Credenciais inválidas.')
      }

      await checkAuth()
      setLoginEmail('')
      setLoginPassword('')
    } catch (error: any) {
      setLoginError(error.message || 'Não foi possível autenticar.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    setIsAuthenticated(false)
  }

  const handleAddPsychologist = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedbackMessage('')

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

      const data = await response.json()
      const psychologistId = data.psychologist?.id

      if (psychologistId) {
        const approveResponse = await fetch(
          `/api/psychologists/${psychologistId}/approve`,
          { method: 'POST' },
        )
        if (!approveResponse.ok) {
          const error = await approveResponse.json()
          throw new Error(error.error || 'Cadastro criado, mas não foi possível enviar o convite.')
        }
      }

      setNewPsychologist({ name: '', email: '', notes: '' })
      setFeedbackMessage('Cadastro criado e convite enviado com sucesso.')
    } catch (error: any) {
      setFeedbackMessage(error.message || 'Erro ao criar cadastro.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-xl">
          <p className="text-sm text-muted-foreground">Verificando acesso...</p>
        </div>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="mx-auto flex max-w-xl flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle>Área Administrativa</CardTitle>
                  <CardDescription>
                    Faça login para cadastrar novos psicólogos.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-login-email">Email</Label>
                  <Input
                    id="admin-login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@seudominio.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-login-password">Senha</Label>
                  <Input
                    id="admin-login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                {loginError && (
                  <p className="text-sm text-destructive">{loginError}</p>
                )}
                <Button type="submit" className="w-full" disabled={isLoggingIn}>
                  {isLoggingIn ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle>Cadastro de Psicólogos</CardTitle>
                  <CardDescription>
                    Insira os dados do profissional para enviar o convite de cadastro.
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O convite será enviado para o email informado com um link para concluir o cadastro no {appConfig.name}.
            </p>
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
                  placeholder="psicologo@seudominio.com"
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
                {isSubmitting ? 'Registrando...' : 'Cadastrar e enviar convite'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
