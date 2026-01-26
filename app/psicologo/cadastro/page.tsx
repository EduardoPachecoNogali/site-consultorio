'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Brain } from 'lucide-react'
import { appConfig } from '@/lib/app-config'

export default function PsychologistRegistrationPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setErrorMessage('Convite inválido.')
      setIsLoading(false)
      return
    }

    const loadInvite = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/psychologists/register?token=${token}`)
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Não foi possível validar o convite.')
        }
        const data = await response.json()
        setName(data.psychologist?.name || '')
        setEmail(data.psychologist?.email || '')
      } catch (error: any) {
        setErrorMessage(error.message || 'Convite inválido.')
      } finally {
        setIsLoading(false)
      }
    }

    loadInvite()
  }, [token])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!token) {
      setErrorMessage('Convite inválido.')
      return
    }

    if (!/^[0-9]{6}$/.test(pin)) {
      setErrorMessage('O PIN precisa conter exatamente 6 dígitos.')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch('/api/psychologists/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, pin }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao concluir cadastro.')
      }

      setSuccessMessage('Cadastro concluído! Você já pode acessar a área profissional.')
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao concluir cadastro.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">{appConfig.name}</h1>
            <p className="text-sm text-muted-foreground">Cadastro de Psicólogo</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Finalize seu cadastro</CardTitle>
            <CardDescription>
              Informe os dados abaixo para ativar seu acesso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando convite...</p>
            ) : errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="psychologist-name">Nome completo</Label>
                  <Input
                    id="psychologist-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="psychologist-email">Email</Label>
                  <Input id="psychologist-email" value={email} readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="psychologist-pin">Defina um PIN (6 dígitos)</Label>
                  <Input
                    id="psychologist-pin"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Ex: 123456"
                    required
                  />
                </div>
                {successMessage && (
                  <p className="text-sm text-emerald-600">{successMessage}</p>
                )}
                {errorMessage && (
                  <p className="text-sm text-destructive">{errorMessage}</p>
                )}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Concluir cadastro'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
