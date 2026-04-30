'use client'

import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'

export function FeatureCard({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="h-full p-6">
        <span className="grid size-12 place-items-center rounded-2xl border border-white/12 bg-white/[0.07] text-cyan">
          <Icon className="size-5" />
        </span>
        <h3 className="mt-6 text-xl font-semibold text-white">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-white/58">{description}</p>
      </Card>
    </motion.div>
  )
}
