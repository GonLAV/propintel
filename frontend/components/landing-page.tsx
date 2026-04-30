'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Check, PlayCircle } from 'lucide-react'
import { FeatureCard } from '@/components/marketing/feature-card'
import { ProductVisual } from '@/components/product-visual'
import { SiteHeader } from '@/components/site-header'
import { Badge, Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/button'
import { features, heroHighlights, metrics, pricingPlans, testimonials } from '@/lib/data'

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
}

export function LandingPage() {
  return (
    <main id="top" className="relative min-h-screen overflow-hidden">
      <div className="premium-noise" />
      <SiteHeader />

      <section className="relative px-4 pb-20 pt-36 md:pt-44">
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" transition={{ staggerChildren: 0.09 }}>
            <motion.div variants={fadeUp}>
              <Badge className="border-cyan/20 bg-cyan/10 text-cyan">Modern appraisal intelligence for serious real estate teams</Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} className="mx-auto mt-7 max-w-5xl text-balance text-5xl font-semibold tracking-tight text-white md:text-7xl lg:text-8xl">
              PropIntel
            </motion.h1>
            <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-3xl text-balance text-lg leading-8 text-white/68 md:text-xl">
              A premium valuation operating system for appraisers, funds, banks, and acquisition teams that need fast evidence, clean judgment, and board-ready reports.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <LinkButton href="/register" className="h-12 px-7">Start building value <ArrowRight className="size-4" /></LinkButton>
              <LinkButton href="/dashboard" variant="secondary" className="h-12 px-7"><PlayCircle className="size-4" /> View live dashboard</LinkButton>
            </motion.div>
            <motion.div variants={fadeUp} className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-2 text-left">
              {heroHighlights.map((Icon, index) => (
                <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-sm text-white/70 backdrop-blur-xl">
                  <Icon className="mb-3 size-5 text-mint" />
                  {['Deal Twin simulator', 'Executive analytics', 'Secure workflow'][index]}
                </div>
              ))}
            </motion.div>
          </motion.div>

          <ProductVisual />
        </div>
      </section>

      <section id="product" className="px-4 py-16">
        <div className="container grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <Card key={metric.label} className="p-6">
              <p className="text-4xl font-semibold tracking-tight text-white">{metric.value}</p>
              <p className="mt-2 text-sm text-white/56">{metric.label}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="features" className="px-4 py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <Badge>Platform</Badge>
            <h2 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-white md:text-6xl">Everything a premium valuation team expects, without the drag.</h2>
            <p className="mt-5 text-lg leading-8 text-white/60">Reusable architecture, polished interactions, and production-shaped workflows for appraisal operations that need to feel expensive because the work is expensive.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
          </div>
        </div>
      </section>

      <section id="pricing" className="px-4 py-20">
        <div className="container">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <Badge>Pricing</Badge>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-6xl">Scale from studio to institution.</h2>
            </div>
            <p className="max-w-md text-white/60">Transparent SaaS packaging for modern valuation teams, with an enterprise path when security and integration depth matter.</p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card key={plan.name} className={plan.featured ? 'border-cyan/30 bg-cyan/[0.075]' : ''}>
                {plan.featured && <Badge className="mb-4 border-cyan/25 bg-cyan/10 text-cyan">Most popular</Badge>}
                <h3 className="text-2xl font-semibold text-white">{plan.name}</h3>
                <p className="mt-3 text-sm leading-6 text-white/58">{plan.description}</p>
                <div className="mt-7 flex items-end gap-2">
                  <span className="text-4xl font-semibold tracking-tight text-white">{plan.price}</span>
                  {plan.price.startsWith('$') && <span className="pb-1 text-sm text-white/46">/month</span>}
                </div>
                <ul className="mt-7 space-y-3">
                  {plan.features.map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-white/68">
                      <Check className="mt-0.5 size-4 shrink-0 text-mint" />
                      {item}
                    </li>
                  ))}
                </ul>
                <LinkButton href="/register" variant={plan.featured ? 'primary' : 'secondary'} className="mt-8 w-full">Choose {plan.name}</LinkButton>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="customers" className="px-4 py-20">
        <div className="container">
          <div className="grid gap-4 lg:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.name}>
                <p className="text-lg leading-8 text-white/78">"{item.quote}"</p>
                <div className="mt-7 border-t border-white/10 pt-5">
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="mt-1 text-sm text-white/50">{item.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-4 py-10">
        <div className="container flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-white/44 md:flex-row md:items-center md:justify-between">
          <p>PropIntel premium web experience.</p>
          <div className="flex gap-4">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="/dashboard" className="hover:text-white">Dashboard</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
