'use client'

import Image from 'next/image'
import { useEffect, useState, type FormEvent } from 'react'

const STORAGE_KEY = 'fsl-discord-account'

type DiscordAccount = {
  id: string
  username: string
  displayName: string
  avatarUrl: string
}

function buildDiscordAvatarUrl(id: string, avatarHash?: string) {
  if (!id) return ''
  if (!avatarHash) return ''
  return `https://cdn.discordapp.com/avatars/${id}/${avatarHash}.png?size=256`
}

export function DiscordLogin() {
  const [account, setAccount] = useState<DiscordAccount | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [form, setForm] = useState({
    username: '',
    id: '',
    avatarHash: '',
    avatarUrl: '',
  })

  useEffect(() => {
    setHydrated(true)

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (!saved) return

      const parsed = JSON.parse(saved) as Partial<DiscordAccount>
      if (parsed.username && parsed.avatarUrl) {
        setAccount({
          id: parsed.id ?? 'discord-user',
          username: parsed.username,
          displayName: parsed.displayName ?? parsed.username,
          avatarUrl: parsed.avatarUrl,
        })
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return

    if (account) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(account))
      return
    }

    window.localStorage.removeItem(STORAGE_KEY)
  }, [account, hydrated])

  const openLogin = () => {
    setIsOpen(true)
    if (account) {
      setForm({
        username: account.username,
        id: account.id,
        avatarHash: '',
        avatarUrl: account.avatarUrl,
      })
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const username = form.username.trim() || 'Discord User'
    const id = form.id.trim() || 'discord-user'
    const avatarUrl =
      form.avatarUrl.trim() || buildDiscordAvatarUrl(id, form.avatarHash.trim()) || 'https://cdn.discordapp.com/embed/avatars/0.png'

    const nextAccount: DiscordAccount = {
      id,
      username,
      displayName: username,
      avatarUrl,
    }

    setAccount(nextAccount)
    setForm({ username: '', id: '', avatarHash: '', avatarUrl: '' })
    setIsOpen(false)
  }

  const handleLogout = () => {
    setAccount(null)
    setIsOpen(false)
  }

  return (
    <>
      <div className="fixed left-4 top-4 z-50">
        {account ? (
          <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/25 px-2.5 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/20 bg-white/10">
              {account.avatarUrl ? (
                <Image
                  src={account.avatarUrl}
                  alt={`${account.username} profile`}
                  fill
                  sizes="40px"
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/80">
                  {account.username.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-col text-left">
              <span className="truncate text-sm font-medium text-white">{account.displayName}</span>
              <span className="truncate text-[10px] uppercase tracking-[0.2em] text-white/50">Discord</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="ml-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Log out
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={openLogin}
            className="rounded-full border border-white/15 bg-black/25 px-4 py-2 text-sm font-medium text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:border-white/25 hover:bg-white/10"
          >
            Log in
          </button>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#101114]/90 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.65)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">Discord login</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Connect your profile</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm text-white/75">
                Discord username
                <input
                  type="text"
                  value={form.username}
                  onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                  placeholder="yourname"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
                />
              </label>

              <label className="block text-sm text-white/75">
                Discord user ID
                <input
                  type="text"
                  value={form.id}
                  onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
                  placeholder="123456789012345678"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
                />
              </label>

              <label className="block text-sm text-white/75">
                Avatar URL (optional)
                <input
                  type="url"
                  value={form.avatarUrl}
                  onChange={(event) => setForm((current) => ({ ...current, avatarUrl: event.target.value }))}
                  placeholder="https://cdn.discordapp.com/avatars/...png"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
                />
              </label>

              <label className="block text-sm text-white/75">
                Avatar hash (optional)
                <input
                  type="text"
                  value={form.avatarHash}
                  onChange={(event) => setForm((current) => ({ ...current, avatarHash: event.target.value }))}
                  placeholder="abcd1234efgh"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Save profile
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
