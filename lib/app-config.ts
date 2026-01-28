export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'PsicoLink',
  tagline:
    process.env.NEXT_PUBLIC_APP_TAGLINE ||
    'Sua Jornada de Bem-Estar Mental',
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
    'Conecte-se com psicólogos licenciados através de consultas por vídeo seguras',
  publicUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '',
  videoBaseUrl:
    process.env.NEXT_PUBLIC_VIDEO_BASE_URL || 'https://meet.mindcare.app',
}
