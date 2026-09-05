'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useSWR from 'swr'
import { Search, X, Loader2 } from 'lucide-react'

type SearchUser = {
  type: 'roblox' | 'discord'
  robloxId: number | null
  discordId: string | null
  username: string
  displayName: string
  avatarUrl: string | null
}

type ResolvedUser = {
  roblox: {
    id: string
    username: string
    displayName: string
    created: string
    avatarUrl: string | null
  } | null
  discord: {
    id: string
    username: string
    displayName: string
    avatarUrl: string
    createdAt: string | null
  } | null
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function formatDate(iso: string | null) {
  if (!iso) return 'Unknown'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function accountAge(iso: string | null) {
  if (!iso) return 'Unknown'
  const then = new Date(iso).getTime()
  const now = Date.now()
  const days = Math.floor((now - then) / 86_400_000)
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  if (years > 0) return `${years}y ${months}mo`
  if (months > 0) return `${months}mo`
  return `${days}d`
}

function resolveKey(user: SearchUser) {
  return user.robloxId != null
    ? `robloxId=${user.robloxId}`
    : `discordId=${user.discordId}`
}

export function UserSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<SearchUser | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounced(query, 250)

  const { data: searchData, isLoading: searching } = useSWR<{ users: SearchUser[] }>(
    debouncedQuery.length >= 1 ? `/api/search?q=${encodeURIComponent(debouncedQuery)}` : null,
    fetcher,
    { keepPreviousData: true },
  )

  const { data: resolved, isLoading: resolving } = useSWR<ResolvedUser>(
    selected ? `/api/resolve?${resolveKey(selected)}` : null,
    fetcher,
  )

  const results = useMemo(() => searchData?.users ?? [], [searchData])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelected(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="search-shell flex items-center gap-3 rounded-full px-5 py-3">
        <Search className="h-5 w-5 shrink-0 text-white/50" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search a member (Roblox or Discord)..."
          aria-label="Search users"
          className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
        {searching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/50" aria-hidden="true" />}
        {query && !searching && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setOpen(false)
            }}
            aria-label="Clear search"
            className="shrink-0 text-white/40 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && debouncedQuery.length >= 1 && (
        <div className="glass-panel absolute left-0 right-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl p-1.5 text-left">
          {results.length === 0 && !searching ? (
            <p className="px-4 py-3 text-sm text-white/50">No server members found.</p>
          ) : (
            <ul>
              {results.map((user) => (
                <li key={`${user.type}-${user.robloxId ?? user.discordId}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(user)
                      setOpen(false)
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/10"
                  >
                    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/10">
                      {user.avatarUrl && (
                        <Image
                          src={user.avatarUrl}
                          alt=""
                          fill
                          sizes="36px"
                          className="object-cover"
                          unoptimized
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">
                        {user.displayName}
                      </span>
                      <span className="block truncate text-xs text-white/50">@{user.username}</span>
                    </span>
                    <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[0.6rem] uppercase tracking-widest text-white/50">
                      {user.type}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selected && (
        <UserModal
          resolving={resolving}
          data={resolved}
          onClose={() => setSelected(null)}
          formatDate={formatDate}
          accountAge={accountAge}
        />
      )}
    </div>
  )
}

function UserModal({
  resolving,
  data,
  onClose,
  formatDate,
  accountAge,
}: {
  resolving: boolean
  data: ResolvedUser | undefined
  onClose: () => void
  formatDate: (iso: string | null) => string
  accountAge: (iso: string | null) => string
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const title = data?.roblox?.displayName ?? data?.discord?.displayName ?? ''
  const handle = data?.roblox?.username ?? data?.discord?.username ?? ''

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="User details"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="glass-panel animate-modal-in relative z-10 w-full max-w-lg rounded-3xl p-6 text-left sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {resolving || !data ? (
          <div className="flex h-56 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" aria-hidden="true" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-5">
              <Avatar src={data.roblox?.avatarUrl ?? null} label="Roblox" ring="ring-white/25" />
              <Avatar src={data.discord?.avatarUrl ?? null} label="Discord" ring="ring-white/25" />
            </div>

            <div className="mt-5 text-center">
              <h2 className="font-display text-3xl font-semibold uppercase tracking-wide text-white">
                {title}
              </h2>
              <p className="text-sm text-white/50">@{handle}</p>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 sm:grid-cols-2">
              <Field label="Roblox username" value={data.roblox ? `@${data.roblox.username}` : 'Not linked'} />
              <Field label="Roblox ID" value={data.roblox?.id ?? '—'} />
              <Field label="Roblox join date" value={data.roblox ? formatDate(data.roblox.created) : '—'} />
              <Field
                label="Discord username"
                value={data.discord ? `@${data.discord.username}` : 'Not linked'}
              />
              <Field label="Discord ID" value={data.discord?.id ?? '—'} />
              <Field
                label="Discord account age"
                value={data.discord ? accountAge(data.discord.createdAt) : '—'}
              />
            </dl>

            {(!data.roblox || !data.discord) && (
              <p className="mt-4 text-center text-xs text-white/40">
                {!data.discord
                  ? 'No Discord account linked via Bloxlink in this server.'
                  : 'No Roblox account linked via Bloxlink for this member.'}
              </p>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

function Avatar({ src, label, ring }: { src: string | null; label: string; ring: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative h-24 w-24 overflow-hidden rounded-2xl bg-white/10 ring-2 ${ring} shadow-[0_0_30px_-6px_rgba(255,255,255,0.5)]`}
      >
        {src && (
          <Image src={src} alt={`${label} avatar`} fill sizes="96px" className="object-cover" unoptimized />
        )}
      </div>
      <span className="text-xs font-medium uppercase tracking-widest text-white/50">{label}</span>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/20 px-4 py-3">
      <dt className="text-[0.65rem] uppercase tracking-widest text-white/40">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-white" title={value}>
        {value}
      </dd>
    </div>
  )
}
