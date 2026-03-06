'use client'

import * as React from 'react'
import { motion } from 'framer-motion'

interface AnimatedTabsProps {
  tabs: { label: string; value: string }[]
  activeTab: string
  onTabChange: (value: string) => void
}

export function AnimatedTabs({ tabs, activeTab, onTabChange }: AnimatedTabsProps) {
  return (
    <div className="relative flex items-center justify-center">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={`${
            activeTab === tab.value ? 'text-primary' : 'text-muted-foreground'
          } relative z-10 px-4 py-2 text-sm font-medium transition-colors`}
        >
          {activeTab === tab.value && (
            <motion.div
              layoutId="bubble"
              className="absolute inset-0 bg-primary/10 rounded-md"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
          {tab.label}
        </button>
      ))}
    </div>
  )
}
