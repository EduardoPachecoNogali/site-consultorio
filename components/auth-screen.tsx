'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Brain } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PsychologistProfile } from '@/lib/psychologists'

interface AuthScreenProps {
  onLogin: (name: string) => void
  onPsychologistLogin: (psychologist: PsychologistProfile) => void
}

export function AuthScreen({ onLogin, onPsychologistLogin }: AuthScreenProps) {
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [isPsychologistDialogOpen, setIsPsychologistDialogOpen] = useState(false)
  const [psychologistLoginEmail, setPsychologistLoginEmail] = useState('')
  const [psychologistLoginPin, setPsychologistLoginPin] = useState('')
  const [psychologistLoginError, setPsychologistLoginError] = useState('')
  const [isPsychologistSubmitting, setIsPsychologistSubmitting] = useState(false)

  const resetPsychologistForms = () => {
    setPsychologistLoginEmail('')
    setPsychologistLoginPin('')
    setPsychologistLoginError('')
  }

  const handlePsychologistDialogChange = (open: boolean) => {
    setIsPsychologistDialogOpen(open)
    if (!open) {
      resetPsychologistForms()
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    onLogin(loginEmail.split('@')[0] || 'Usuário')
  }

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault()
    onLogin(signupName || signupEmail.split('@')[0] || 'Usuário')
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
          const data = await response.json()
          throw new Error(data.error || 'Erro ao validar credenciais.')
        }
        return response.json()
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

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">MindCare</h1>
            <p className="text-sm text-muted-foreground">Sua Jornada de Bem-Estar Mental</p>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl text-foreground">Bem-vindo</CardTitle>
            <CardDescription className="text-muted-foreground">
              Entre na sua conta ou crie uma nova
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
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Digite sua senha"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="bg-input"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Entrar
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => handlePsychologistDialogChange(true)}
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
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Crie uma senha"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      className="bg-input"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Cadastrar
                  </Button>
                  <div className="text-center text-xs text-muted-foreground">
                    Psicólogo ou psicóloga?
                    <button
                      type="button"
                      onClick={() => handlePsychologistDialogChange(true)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Área do Psicólogo</DialogTitle>
            <DialogDescription>
              Somente profissionais aprovados pela equipe MindCare conseguem acessar esta área.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
              Precisa de acesso? Solicite aprovação à equipe administrativa através do link privado fornecido pela MindCare.
            </div>
              <form onSubmit={handlePsychologistLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="psychologist-login-email">Email profissional</Label>
                <Input
                  id="psychologist-login-email"
                  type="email"
                  placeholder="psicologo@mindcare.com"
                  value={psychologistLoginEmail}
                  onChange={(e) => setPsychologistLoginEmail(e.target.value)}
                  required
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="psychologist-login-pin">PIN de acesso (6 dígitos)</Label>
                <Input
                  id="psychologist-login-pin"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Ex: 123456"
                  value={psychologistLoginPin}
                  onChange={(e) =>
                    setPsychologistLoginPin(e.target.value.replace(/[^0-9]/g, ''))
                  }
                  required
                  className="bg-input tracking-[0.3em]"
                />
                <p className="text-xs text-muted-foreground">
                  O PIN é enviado pela equipe MindCare após a aprovação do cadastro.
                </p>
              </div>
              {psychologistLoginError && (
                <p className="text-sm text-destructive">{psychologistLoginError}</p>
              )}
              <Button
                type="submit"
                disabled={isPsychologistSubmitting}
                className="w-full bg-[#c7a4ff] text-[#301144] hover:bg-[#b78bf7]"
              >
                {isPsychologistSubmitting ? 'Validando...' : 'Entrar na área profissional'}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center">
              Área administrativa disponível apenas via URL privada. Em caso de dúvidas, contate o suporte da MindCare.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
