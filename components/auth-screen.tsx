'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnimatedTabs } from '@/components/ui/animated-tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Brain, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PsychologistProfile } from '@/lib/psychologists'
import { appConfig } from '@/lib/app-config'
import { readJson } from '@/lib/http'

interface AuthScreenProps {
  onLogin: (name: string, email: string) => void
  onPsychologistLogin: (psychologist: PsychologistProfile) => void
}

export function AuthScreen({ onLogin, onPsychologistLogin }: AuthScreenProps) {
  const searchParams = useSearchParams()
  const [isReady, setIsReady] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [isPsychologistDialogOpen, setIsPsychologistDialogOpen] = useState(false)
  const [psychologistDialogMode, setPsychologistDialogMode] = useState<'login' | 'request'>(
    'login',
  )
  const [psychologistLoginEmail, setPsychologistLoginEmail] = useState('')
  const [psychologistLoginPin, setPsychologistLoginPin] = useState('')
  const [psychologistLoginError, setPsychologistLoginError] = useState('')
  const [isPsychologistSubmitting, setIsPsychologistSubmitting] = useState(false)
  const [psychologistRequestName, setPsychologistRequestName] = useState('')
  const [psychologistRequestEmail, setPsychologistRequestEmail] = useState('')
  const [psychologistRequestError, setPsychologistRequestError] = useState('')
  const [psychologistRequestSuccess, setPsychologistRequestSuccess] = useState('')
  const [isPsychologistRequesting, setIsPsychologistRequesting] = useState(false)
  const [hasAutoOpenedDialog, setHasAutoOpenedDialog] = useState(false)
  const [psychologistLoginEmailValid, setPsychologistLoginEmailValid] = useState(false)
  const [psychologistLoginPinValid, setPsychologistLoginPinValid] = useState(false)
  const [psychologistRequestNameValid, setPsychologistRequestNameValid] = useState(false)
  const [psychologistRequestEmailValid, setPsychologistRequestEmailValid] = useState(false)

  const resetPsychologistForms = () => {
    setPsychologistDialogMode('login')
    setPsychologistLoginEmail('')
    setPsychologistLoginPin('')
    setPsychologistLoginError('')
    setPsychologistRequestName('')
    setPsychologistRequestEmail('')
    setPsychologistRequestError('')
    setPsychologistRequestSuccess('')
  }

  const handlePsychologistDialogChange = (open: boolean) => {
    setIsPsychologistDialogOpen(open)
    if (!open) {
      resetPsychologistForms()
    }
  }

  const openPsychologistDialog = (mode: 'login' | 'request') => {
    setPsychologistDialogMode(mode)
    setIsPsychologistDialogOpen(true)
  }

  useEffect(() => {
    if (hasAutoOpenedDialog) return
    const mode = searchParams.get('psychologist')
    if (mode === 'login' || mode === 'request') {
      openPsychologistDialog(mode)
      setHasAutoOpenedDialog(true)
    }
  }, [hasAutoOpenedDialog, searchParams])

  useEffect(() => {
    setIsReady(true)
  }, [])

  if (!isReady) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  const handlePsychologistTabChange = (value: string) => {
    const mode = value === 'request' ? 'request' : 'login'
    setPsychologistDialogMode(mode)
    setPsychologistLoginError('')
    setPsychologistRequestError('')
    setPsychologistRequestSuccess('')
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    onLogin(loginEmail.split('@')[0] || 'Usuário', loginEmail.trim().toLowerCase())
  }

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault()
    const email = signupEmail.trim().toLowerCase()
    onLogin(signupName || email.split('@')[0] || 'Usuário', email)
  }

  const handlePsychologistLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setPsychologistLoginError('')

    if (!/^[0-9]{6}$/.test(psychologistLoginPin)) {
      setPsychologistLoginError('O PIN precisa conter exatamente 6 dígitos.')
      return
    }

    const normalizedEmail = psychologistLoginEmail.trim().toLowerCase()
    setIsPsychologistSubmitting(true)

    fetch('/api/psychologists/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        pin: psychologistLoginPin,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await readJson<{ error?: string }>(response, {})
          throw new Error(data.error || 'Erro ao validar credenciais.')
        }
        return readJson<{ psychologist: PsychologistProfile }>(response)
      })
      .then((data: { psychologist: PsychologistProfile }) => {
        onPsychologistLogin(data.psychologist)
        handlePsychologistDialogChange(false)
      })
      .catch((error: Error) => {
        setPsychologistLoginError(error.message)
      })
      .finally(() => {
        setIsPsychologistSubmitting(false)
      })
  }

  const handlePsychologistRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setPsychologistRequestError('')
    setPsychologistRequestSuccess('')

    if (!psychologistRequestName.trim() || !psychologistRequestEmail.trim()) {
      setPsychologistRequestError('Informe nome e email profissional.')
      return
    }

    try {
      setIsPsychologistRequesting(true)
      const response = await fetch('/api/psychologists/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: psychologistRequestName.trim(),
          email: psychologistRequestEmail.trim().toLowerCase(),
        }),
      })

      if (!response.ok) {
        const data = await readJson<{ error?: string }>(response, {})
        throw new Error(data.error || 'Não foi possível enviar a solicitação.')
      }

      setPsychologistRequestSuccess(
        'Solicitação enviada com sucesso. Aguarde o contato da equipe administrativa.',
      )
      setPsychologistRequestName('')
      setPsychologistRequestEmail('')
    } catch (error: any) {
      setPsychologistRequestError(error.message || 'Não foi possível enviar a solicitação.')
    } finally {
      setIsPsychologistRequesting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">{appConfig.name}</h1>
            <p className="text-sm text-muted-foreground">{appConfig.tagline}</p>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl text-foreground">Bem-vindo</CardTitle>
            <CardDescription className="text-muted-foreground">
              Continue com seus dados para acessar sua área
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 pt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="bg-input"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Continuar
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => openPsychologistDialog('login')}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Entrar como psicólogo
                    </button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4 pt-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                      className="bg-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      className="bg-input"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Criar acesso
                  </Button>
                  <div className="text-center text-xs text-muted-foreground">
                    Psicólogo ou psicóloga?
                    <button
                      type="button"
                      onClick={() => openPsychologistDialog('request')}
                      className="ml-1 font-medium text-primary hover:underline"
                    >
                      Cadastrar como psicólogo
                    </button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Sua privacidade e segurança são nossa prioridade
        </p>
      </div>
      <Dialog open={isPsychologistDialogOpen} onOpenChange={handlePsychologistDialogChange}>
        <DialogContent className="max-w-[calc(100vw-2rem)] overflow-hidden p-0 sm:max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="hidden min-h-[320px] md:flex md:flex-col md:justify-center md:p-10 bg-gradient-to-br from-primary to-teal-400 text-primary-foreground">
              <h2 className="text-3xl font-serif mb-4">"A jornada de mil milhas começa com um único passo."</h2>
              <p className="text-lg opacity-80">- Lao Tzu</p>
            </div>
            <div className="p-5 sm:p-8 md:p-10">
              <DialogHeader>
                <DialogTitle className="text-2xl">Área do Psicólogo</DialogTitle>
                <DialogDescription>
                  Solicite acesso ou entre com o PIN enviado pela equipe {appConfig.name}.
                </DialogDescription>
              </DialogHeader>
              <AnimatedTabs
                tabs={[
                  { label: 'Já tenho convite', value: 'login' },
                  { label: 'Solicitar acesso', value: 'request' },
                ]}
                activeTab={psychologistDialogMode}
                onTabChange={handlePsychologistTabChange}
              />
              {psychologistDialogMode === 'login' && <div className="space-y-5 pt-4">
                <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                  Use o email profissional e o PIN recebido para entrar.
                </div>
                <form onSubmit={handlePsychologistLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="psychologist-login-email">Email profissional</Label>
                    <div className="relative">
                      <Input
                        id="psychologist-login-email"
                        type="email"
                        placeholder="psicologo@seudominio.com"
                        value={psychologistLoginEmail}
                        onChange={(e) => {
                          setPsychologistLoginEmail(e.target.value)
                          setPsychologistLoginEmailValid(/^[^@]+@[^@]+\.[^@]+$/.test(e.target.value))
                        }}
                        required
                        className="bg-input"
                      />
                      {psychologistLoginEmailValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="psychologist-login-pin">PIN de acesso (6 dígitos)</Label>
                    <div className="relative">
                      <Input
                        id="psychologist-login-pin"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        placeholder="Ex: 123456"
                        value={psychologistLoginPin}
                        onChange={(e) => {
                          const pin = e.target.value.replace(/[^0-9]/g, '')
                          setPsychologistLoginPin(pin)
                          setPsychologistLoginPinValid(pin.length === 6)
                        }}
                        required
                        className="bg-input tracking-[0.3em]"
                      />
                      {psychologistLoginPinValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      O PIN é definido por você no link de cadastro enviado pela equipe {appConfig.name}.
                    </p>
                  </div>
                  {psychologistLoginError && (
                    <p className="text-sm text-destructive">{psychologistLoginError}</p>
                  )}
                  <Button
                    type="submit"
                    disabled={isPsychologistSubmitting}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isPsychologistSubmitting ? 'Validando...' : 'Entrar na área profissional'}
                  </Button>
                </form>
              </div>}
              {psychologistDialogMode === 'request' && <div className="space-y-5 pt-4">
                <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                  Envie seus dados para aprovação da equipe administrativa.
                </div>
                <form onSubmit={handlePsychologistRequest} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="psychologist-request-name">Nome completo</Label>
                    <div className="relative">
                      <Input
                        id="psychologist-request-name"
                        type="text"
                        placeholder="Seu nome completo"
                        value={psychologistRequestName}
                        onChange={(e) => {
                          setPsychologistRequestName(e.target.value)
                          setPsychologistRequestNameValid(e.target.value.trim().length > 0)
                        }}
                        required
                        className="bg-input"
                      />
                      {psychologistRequestNameValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="psychologist-request-email">Email profissional</Label>
                    <div className="relative">
                      <Input
                        id="psychologist-request-email"
                        type="email"
                        placeholder="psicologo@seudominio.com"
                        value={psychologistRequestEmail}
                        onChange={(e) => {
                          setPsychologistRequestEmail(e.target.value)
                          setPsychologistRequestEmailValid(/^[^@]+@[^@]+\.[^@]+$/.test(e.target.value))
                        }}
                        required
                        className="bg-input"
                      />
                      {psychologistRequestEmailValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />}
                    </div>
                  </div>
                  {psychologistRequestError && (
                    <p className="text-sm text-destructive">{psychologistRequestError}</p>
                  )}
                  {psychologistRequestSuccess && (
                    <p className="text-sm text-emerald-600">{psychologistRequestSuccess}</p>
                  )}
                  <Button
                    type="submit"
                    disabled={isPsychologistRequesting}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isPsychologistRequesting ? 'Enviando...' : 'Enviar solicitação'}
                  </Button>
                </form>
              </div>}
              <p className="pt-4 text-center text-xs text-muted-foreground">
                Área administrativa disponível apenas via URL privada. Em caso de dúvidas, contate o suporte da {appConfig.name}.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
