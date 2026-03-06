'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Brain, Mail, Lock, User, AlertCircle, CheckCircle2, Loader2, ArrowRight, Shield } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PsychologistProfile } from '@/lib/psychologists'
import { appConfig } from '@/lib/app-config'
import { readJson } from '@/lib/http'
import { cn } from '@/lib/utils'

interface AuthScreenProps {
  onLogin: (name: string, email: string) => void
  onPsychologistLogin: (psychologist: PsychologistProfile) => void
}

interface FeedbackBannerProps {
  type: 'error' | 'success'
  message: string
  className?: string
}

function FeedbackBanner({ type, message, className }: FeedbackBannerProps) {
  if (!message) return null
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium animate-fade-in-down',
        type === 'error'
          ? 'border-destructive/25 bg-destructive/8 text-destructive'
          : 'border-success/25 bg-success/8 text-success',
        className,
      )}
    >
      {type === 'error' ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  )
}

export function AuthScreen({ onLogin, onPsychologistLogin }: AuthScreenProps) {
  const searchParams = useSearchParams()
  const [isReady, setIsReady] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [isPsychologistDialogOpen, setIsPsychologistDialogOpen] = useState(false)
  const [psychologistDialogMode, setPsychologistDialogMode] = useState<'login' | 'request'>('login')
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
  const [loginError, setLoginError] = useState('')
  const [signupError, setSignupError] = useState('')
  const [loginShake, setLoginShake] = useState(false)
  const [signupShake, setSignupShake] = useState(false)

  const triggerShake = (setter: (v: boolean) => void) => {
    setter(true)
    setTimeout(() => setter(false), 500)
  }

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
    if (!open) resetPsychologistForms()
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

  useEffect(() => { setIsReady(true) }, [])

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
            <Brain className="h-6 w-6 text-primary-foreground" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
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
    setLoginError('')
    if (!loginEmail.trim()) {
      setLoginError('Informe seu endereço de e-mail.')
      triggerShake(setLoginShake)
      return
    }
    if (!loginPassword) {
      setLoginError('Informe sua senha.')
      triggerShake(setLoginShake)
      return
    }
    onLogin(loginEmail.split('@')[0] || 'Usuário', loginEmail.trim().toLowerCase())
  }

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault()
    setSignupError('')
    if (!signupName.trim()) {
      setSignupError('Informe seu nome completo.')
      triggerShake(setSignupShake)
      return
    }
    if (!signupEmail.trim()) {
      setSignupError('Informe um endereço de e-mail válido.')
      triggerShake(setSignupShake)
      return
    }
    if (!signupPassword || signupPassword.length < 6) {
      setSignupError('A senha deve ter pelo menos 6 caracteres.')
      triggerShake(setSignupShake)
      return
    }
    const email = signupEmail.trim().toLowerCase()
    onLogin(signupName || email.split('@')[0] || 'Usuário', email)
  }

  const handlePsychologistLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setPsychologistLoginError('')

    if (!psychologistLoginEmail.trim()) {
      setPsychologistLoginError('Informe o e-mail profissional.')
      return
    }
    if (!/^[0-9]{6}$/.test(psychologistLoginPin)) {
      setPsychologistLoginError('O PIN deve conter exatamente 6 dígitos numéricos.')
      return
    }

    const normalizedEmail = psychologistLoginEmail.trim().toLowerCase()
    setIsPsychologistSubmitting(true)

    fetch('/api/psychologists/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, pin: psychologistLoginPin }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await readJson<{ error?: string }>(response, {})
          throw new Error(
            data.error ||
              'Credenciais inválidas. Verifique o e-mail e o PIN informados.',
          )
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

    if (!psychologistRequestName.trim()) {
      setPsychologistRequestError('Informe seu nome completo.')
      return
    }
    if (!psychologistRequestEmail.trim()) {
      setPsychologistRequestError('Informe seu e-mail profissional.')
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
        throw new Error(data.error || 'Não foi possível enviar a solicitação. Tente novamente.')
      }

      setPsychologistRequestSuccess(
        'Solicitação enviada com sucesso! Aguarde o contato da equipe administrativa.',
      )
      setPsychologistRequestName('')
      setPsychologistRequestEmail('')
    } catch (error: any) {
      setPsychologistRequestError(
        error.message || 'Não foi possível enviar a solicitação. Tente novamente.',
      )
    } finally {
      setIsPsychologistRequesting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div className="flex items-center gap-3 animate-fade-in">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15 ring-1 ring-primary-foreground/20">
            <Brain className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">{appConfig.name}</span>
        </div>

        <div className="space-y-6 animate-fade-in-up stagger-children">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight tracking-tight text-balance">
              Cuidado com a saúde mental ao alcance de todos.
            </h2>
            <p className="text-base leading-relaxed text-primary-foreground/75">
              Conecte-se com psicólogos licenciados através de consultas por vídeo seguras, no conforto da sua casa.
            </p>
          </div>

          <div className="space-y-3">
            {[
              'Consultas por vídeo 100% seguras',
              'Psicólogos verificados e licenciados',
              'Agendamento flexível e sem burocracia',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-primary-foreground/85">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20">
                  <CheckCircle2 className="h-3 w-3" />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-primary-foreground/50 animate-fade-in">
          Sua privacidade e segurança são nossa prioridade.
        </p>
      </div>

      {/* Right panel — auth form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-7 animate-fade-in-up">
          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-3 text-center lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
              <Brain className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{appConfig.name}</h1>
              <p className="text-sm text-muted-foreground">{appConfig.tagline}</p>
            </div>
          </div>

          <div className="space-y-1 hidden lg:block">
            <h1 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h1>
            <p className="text-sm text-muted-foreground">Entre na sua conta ou crie uma nova.</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted p-1">
              <TabsTrigger value="login" className="rounded-lg text-sm font-medium">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg text-sm font-medium">Cadastrar</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="mt-5">
              <form
                onSubmit={handleLogin}
                className={cn('space-y-4', loginShake && 'animate-shake')}
                noValidate
              >
                <FeedbackBanner type="error" message={loginError} />

                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-sm font-medium">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => { setLoginEmail(e.target.value); setLoginError('') }}
                      className="pl-9 bg-input h-11"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-sm font-medium">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Sua senha"
                      value={loginPassword}
                      onChange={(e) => { setLoginPassword(e.target.value); setLoginError('') }}
                      className="pl-9 bg-input h-11"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 font-semibold gap-2">
                  Entrar
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <div className="relative flex items-center gap-3">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-xs text-muted-foreground">ou</span>
                  <div className="flex-1 border-t border-border" />
                </div>

                <button
                  type="button"
                  onClick={() => openPsychologistDialog('login')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-secondary/50 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <Shield className="h-4 w-4 text-primary" />
                  Entrar como psicólogo
                </button>
              </form>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup" className="mt-5">
              <form
                onSubmit={handleSignup}
                className={cn('space-y-4', signupShake && 'animate-shake')}
                noValidate
              >
                <FeedbackBanner type="error" message={signupError} />

                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-sm font-medium">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={signupName}
                      onChange={(e) => { setSignupName(e.target.value); setSignupError('') }}
                      className="pl-9 bg-input h-11"
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-sm font-medium">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => { setSignupEmail(e.target.value); setSignupError('') }}
                      className="pl-9 bg-input h-11"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={signupPassword}
                      onChange={(e) => { setSignupPassword(e.target.value); setSignupError('') }}
                      className="pl-9 bg-input h-11"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 font-semibold gap-2">
                  Criar conta
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Psicólogo(a)?{' '}
                  <button
                    type="button"
                    onClick={() => openPsychologistDialog('request')}
                    className="font-medium text-primary hover:underline underline-offset-2"
                  >
                    Solicitar acesso profissional
                  </button>
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs text-muted-foreground">
            Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade.
          </p>
        </div>
      </div>

      {/* Psychologist Dialog */}
      <Dialog open={isPsychologistDialogOpen} onOpenChange={handlePsychologistDialogChange}>
        <DialogContent className="max-w-md animate-scale-in">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-4.5 w-4.5 text-primary" />
              </div>
              <DialogTitle className="text-xl font-bold">Área do Psicólogo</DialogTitle>
            </div>
            <DialogDescription>
              Solicite acesso ou entre com o PIN enviado pela equipe {appConfig.name}.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={psychologistDialogMode}
            onValueChange={handlePsychologistTabChange}
            className="w-full mt-1"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted p-1">
              <TabsTrigger value="login" className="rounded-lg text-sm">Já tenho convite</TabsTrigger>
              <TabsTrigger value="request" className="rounded-lg text-sm">Solicitar acesso</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 pt-4">
              <div className="flex items-start gap-2.5 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Use o e-mail profissional e o PIN recebido pela equipe para entrar.
              </div>

              <form onSubmit={handlePsychologistLogin} className="space-y-4">
                <FeedbackBanner type="error" message={psychologistLoginError} />

                <div className="space-y-1.5">
                  <Label htmlFor="psych-login-email" className="text-sm font-medium">E-mail profissional</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="psych-login-email"
                      type="email"
                      placeholder="psicologo@seudominio.com"
                      value={psychologistLoginEmail}
                      onChange={(e) => { setPsychologistLoginEmail(e.target.value); setPsychologistLoginError('') }}
                      className="pl-9 bg-input h-11"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="psych-login-pin" className="text-sm font-medium">PIN de acesso (6 dígitos)</Label>
                  <Input
                    id="psych-login-pin"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="______"
                    value={psychologistLoginPin}
                    onChange={(e) => {
                      setPsychologistLoginPin(e.target.value.replace(/[^0-9]/g, ''))
                      setPsychologistLoginError('')
                    }}
                    className="bg-input h-11 tracking-[0.5em] text-center font-mono text-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    O PIN é definido por você no link de cadastro enviado pela equipe {appConfig.name}.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isPsychologistSubmitting}
                  className="w-full h-11 font-semibold gap-2"
                >
                  {isPsychologistSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      Entrar na área profissional
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="request" className="space-y-4 pt-4">
              <div className="flex items-start gap-2.5 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Envie seus dados para aprovação da equipe administrativa.
              </div>

              <form onSubmit={handlePsychologistRequest} className="space-y-4">
                <FeedbackBanner type="error" message={psychologistRequestError} />
                <FeedbackBanner type="success" message={psychologistRequestSuccess} />

                <div className="space-y-1.5">
                  <Label htmlFor="psych-req-name" className="text-sm font-medium">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="psych-req-name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={psychologistRequestName}
                      onChange={(e) => { setPsychologistRequestName(e.target.value); setPsychologistRequestError('') }}
                      className="pl-9 bg-input h-11"
                      autoComplete="name"
                      disabled={!!psychologistRequestSuccess}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="psych-req-email" className="text-sm font-medium">E-mail profissional</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="psych-req-email"
                      type="email"
                      placeholder="psicologo@seudominio.com"
                      value={psychologistRequestEmail}
                      onChange={(e) => { setPsychologistRequestEmail(e.target.value); setPsychologistRequestError('') }}
                      className="pl-9 bg-input h-11"
                      autoComplete="email"
                      disabled={!!psychologistRequestSuccess}
                    />
                  </div>
                </div>

                {!psychologistRequestSuccess && (
                  <Button
                    type="submit"
                    disabled={isPsychologistRequesting}
                    className="w-full h-11 font-semibold gap-2"
                  >
                    {isPsychologistRequesting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        Enviar solicitação
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground text-center border-t border-border pt-3">
            Área administrativa disponível apenas via URL privada. Em caso de dúvidas, contate o suporte da {appConfig.name}.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
