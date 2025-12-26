"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, Sparkles, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LandingPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] overflow-hidden selection:bg-[rgb(var(--primary))] selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        {/* Background Elements */}
        <div className="absolute top-20 left-1/2 -ml-[40rem] -z-10 w-[80rem] h-[40rem] bg-gradient-to-tr from-indigo-500/20 via-purple-500/10 to-transparent blur-3xl opacity-50 rounded-[100%]" />

        <div className="mx-auto max-w-5xl text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center rounded-full border border-[rgb(var(--primary))/20] bg-[rgb(var(--primary))/5] px-3 py-1 text-sm font-medium text-[rgb(var(--primary))]"
          >
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            {t.hero.badge}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-[rgb(var(--foreground))]"
          >
            {t.hero.title} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
              {t.hero.subtitle}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto max-w-2xl text-xl text-[rgb(var(--muted-foreground))]"
          >
            {t.hero.desc}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/questionbuilder">
              <Button size="lg" className="rounded-full h-14 px-8 text-lg shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all hover:-translate-y-1">
                {t.navbar.cta} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/courses">
              <Button variant="outline" size="lg" className="rounded-full h-14 px-8 text-lg border-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                {t.navbar.startQuiz}
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 relative">
        <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: CheckCircle2, title: t.features.smart.title, desc: t.features.smart.desc },
            { icon: Upload, title: t.features.import.title, desc: t.features.import.desc },
            { icon: FileText, title: t.features.rich.title, desc: t.features.rich.desc }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-8 rounded-3xl hover:bg-[rgb(var(--card))] transition-colors"
            >
              <div className="h-12 w-12 rounded-2xl bg-[rgb(var(--primary))/10] flex items-center justify-center mb-6">
                <feature.icon className="h-6 w-6 text-[rgb(var(--primary))]" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-[rgb(var(--muted-foreground))] leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

    </div>
  );
}
