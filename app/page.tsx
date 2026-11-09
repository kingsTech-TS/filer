"use client"

import { useState } from "react"
import { Check, ShieldCheck, Zap } from "lucide-react"
import ConvertTool from "@/components/tools/convert-tool"
import ZipTool from "@/components/tools/zip-tool"
import UnzipTool from "@/components/tools/unzip-tool"
import FaviconTool from "@/components/tools/favicon-tool"
import { TOOLS, type ToolId } from "@/lib/tools"

export default function Home() {
  const [tool, setTool] = useState<ToolId>("convert")

  const selectTool = (id: ToolId, scroll = false) => {
    setTool(id)
    if (scroll) document.getElementById("tools")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[oklch(0.11_0.015_270)] text-zinc-100">
      {/* Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-[70%] w-[38rem] h-[38rem] rounded-full bg-indigo-600/25 blur-[120px] animate-blob" />
        <div className="absolute top-20 left-1/2 translate-x-[5%] w-[32rem] h-[32rem] rounded-full bg-fuchsia-600/20 blur-[120px] animate-blob [animation-delay:-6s]" />
        <div className="absolute bottom-[-12rem] left-1/2 -translate-x-1/2 w-[40rem] h-[30rem] rounded-full bg-violet-700/15 blur-[120px] animate-blob [animation-delay:-12s]" />
        <div className="absolute inset-0 bg-grid" />
      </div>

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
              <path d="M9 13h6M13 10l3 3-3 3" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight">Filer</span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-zinc-400 bg-white/5 ring-1 ring-inset ring-white/10">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
          </span>
          Free · No sign-up
        </span>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-14 pb-20">
        {/* Hero */}
        <div className="mx-auto max-w-2xl text-center animate-fade-up">
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
            Every file tool.
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
              One place.
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-zinc-400">
            Convert documents, media and spreadsheets, remove photo backgrounds, zip and unzip files, and generate
            favicons — in seconds.
          </p>
        </div>

        {/* Tool tabs */}
        <nav
          id="tools"
          aria-label="Tools"
          className="mx-auto mt-10 sm:mt-12 flex max-w-full w-fit gap-1 overflow-x-auto rounded-2xl p-1.5 bg-white/[0.04] ring-1 ring-inset ring-white/10 backdrop-blur animate-fade-up [animation-delay:80ms] [scrollbar-width:none] scroll-mt-6"
        >
          {TOOLS.map(({ id, label, icon: Icon }) => {
            const active = id === tool
            return (
              <button
                key={id}
                onClick={() => selectTool(id)}
                aria-current={active ? "page" : undefined}
                className={`relative shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                  active
                    ? "text-white bg-gradient-to-r from-indigo-500 to-violet-500 shadow-lg shadow-violet-500/30"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Card */}
        <div
          className={`relative mx-auto mt-5 animate-fade-up [animation-delay:120ms] transition-[max-width] duration-500 ${
            tool === "favicon" ? "max-w-3xl" : "max-w-lg"
          }`}
        >
          <div aria-hidden className="absolute -inset-px rounded-[28px] bg-gradient-to-b from-white/20 via-white/5 to-transparent" />
          <div className="relative rounded-[28px] bg-zinc-950/60 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl shadow-black/40">
            <div key={tool} className="animate-fade-up">
              {tool === "convert" && <ConvertTool mode="convert" />}
              {tool === "remove-bg" && <ConvertTool mode="remove-bg" />}
              {tool === "zip" && <ZipTool />}
              {tool === "unzip" && <UnzipTool />}
              {tool === "favicon" && <FaviconTool />}
            </div>
          </div>
        </div>

        {/* Trust row */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-500 animate-fade-up [animation-delay:200ms]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure uploads
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Fast cloud processing
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> No account needed
          </span>
        </div>

        {/* Tools overview */}
        <section className="mx-auto mt-20 grid max-w-5xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 animate-fade-up [animation-delay:280ms]">
          {TOOLS.map(({ id, icon: Icon, label, description }) => (
            <button
              key={id}
              onClick={() => selectTool(id, true)}
              className={`group text-left rounded-2xl p-5 ring-1 ring-inset transition-all ${
                id === tool
                  ? "bg-violet-500/[0.08] ring-violet-400/30"
                  : "bg-white/[0.03] ring-white/[0.07] hover:bg-white/[0.05] hover:ring-white/15"
              }`}
            >
              <div className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 ring-1 ring-inset ring-white/10 transition-transform group-hover:-translate-y-0.5">
                <Icon className="w-5 h-5 text-violet-300" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{label === "Remove BG" ? "Remove background" : label}</h3>
              <p className="mt-1 text-sm text-zinc-500">{description}</p>
            </button>
          ))}
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-6 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} Filer
      </footer>
    </div>
  )
}
