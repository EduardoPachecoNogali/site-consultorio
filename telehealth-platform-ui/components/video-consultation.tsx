'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoConsultationProps {
  onEndCall: () => void
}

export function VideoConsultation({ onEndCall }: VideoConsultationProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-slate-900">
      {/* Main Video Feed - Doctor's view */}
      <div className="relative h-full w-full">
        <div className="flex h-full w-full items-center justify-center bg-slate-800">
          {/* Placeholder for video feed */}
          <div className="flex h-full w-full items-center justify-center">
            <img
              src="https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=1200&h=800&fit=crop"
              alt="Doctor video feed"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Session Info Overlay */}
        <div className="absolute left-6 top-6 rounded-lg bg-slate-900/80 px-4 py-2 backdrop-blur-sm">
          <p className="text-sm font-medium text-white">Dra. Sarah Mitchell</p>
          <p className="text-xs text-slate-300">Psicóloga Clínica</p>
        </div>

        {/* Timer Overlay */}
        <div className="absolute right-6 top-6 rounded-lg bg-slate-900/80 px-4 py-2 backdrop-blur-sm">
          <p className="text-sm font-medium text-white">23:45</p>
        </div>

        {/* Self View - Small corner video */}
        <div className="absolute bottom-24 right-6 h-40 w-56 overflow-hidden rounded-lg border-2 border-slate-700 bg-slate-800 shadow-xl">
          <div className="flex h-full w-full items-center justify-center bg-slate-700">
            {isVideoOff ? (
              <div className="flex flex-col items-center gap-2">
                <VideoOff className="h-8 w-8 text-slate-400" />
                <p className="text-xs text-slate-400">Câmera Desligada</p>
              </div>
            ) : (
              <img
                src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=300&fit=crop"
                alt="Seu vídeo"
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="absolute bottom-2 left-2 text-xs font-medium text-white">Você</div>
        </div>

        {/* Control Bar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center pb-8">
          <div className="flex items-center gap-4 rounded-full bg-slate-900/90 px-6 py-4 shadow-2xl backdrop-blur-sm">
            {/* Mute/Unmute Button */}
            <Button
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className={cn(
                'h-14 w-14 rounded-full transition-all',
                isMuted
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              )}
            >
              {isMuted ? (
                <MicOff className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>

            {/* Video On/Off Button */}
            <Button
              size="icon"
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={cn(
                'h-14 w-14 rounded-full transition-all',
                isVideoOff
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              )}
            >
              {isVideoOff ? (
                <VideoOff className="h-6 w-6" />
              ) : (
                <Video className="h-6 w-6" />
              )}
            </Button>

            {/* End Call Button */}
            <Button
              size="icon"
              onClick={onEndCall}
              className="h-14 w-14 rounded-full bg-destructive text-destructive-foreground transition-all hover:bg-destructive/90"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
