import { NextResponse } from 'next/server'

const BLOXLINK_KEY = process.env.BLOXLINK_API_KEY
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN
const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1481684149373763618'

type Result = {
  type: 'roblox' | 'discord'
  robloxId: number | null
  discordId: string | null
  username: string
  displayName: string
  avatarUrl: string | null
}

async function fetchHeadshots(userIds: number[]): Promise<Record<number, string>> {
  if (userIds.length === 0) return {}
  const res = await fetch(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds.join(
      ',',
    )}&size=150x150&format=Png&isCircular=true`,
    { cache: 'no-store' },
  )
  if (!res.ok) return {}
  const json = (await res.json()) as { data?: { targetId: number; imageUrl: string }[] }
  const map: Record<number, string> = {}
  for (const item of json.data ?? []) map[item.targetId] = item.imageUrl
  return map
}

// Only returns a Discord id if this Roblox user is verified in the guild.
async function robloxToDiscordInGuild(robloxId: number): Promise<string | null> {
  if (!BLOXLINK_KEY) return null
  try {
    const res = await fetch(
      `https://api.blox.link/v4/public/guilds/${GUILD_ID}/roblox-to-discord/${robloxId}`,
      { headers: { Authorization: BLOXLINK_KEY }, cache: 'no-store' },
    )
    if (!res.ok) return null
    const json = (await res.json()) as { discordIDs?: string[] }
    return json.discordIDs?.[0] ?? null
  } catch {
    return null
  }
}

// Roblox keyword search, filtered to members verified in the guild.
async function searchRoblox(query: string): Promise<Result[]> {
  let candidates: { id: number; name: string; displayName: string }[] = []

  try {
    const res = await fetch(
      `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(query)}&limit=10`,
      { cache: 'no-store' },
    )
    if (res.ok) {
      const json = (await res.json()) as { data?: typeof candidates }
      candidates = json.data ?? []
    }
  } catch {
    // fall through
  }

  if (candidates.length === 0) {
    try {
      const res = await fetch('https://users.roblox.com/v1/usernames/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [query], excludeBannedUsers: false }),
        cache: 'no-store',
      })
      if (res.ok) {
        const json = (await res.json()) as { data?: typeof candidates }
        candidates = json.data ?? []
      }
    } catch {
      // ignore
    }
  }

  // Keep only the top few and verify each is linked in the guild.
  const top = candidates.slice(0, 6)
  const links = await Promise.all(top.map((u) => robloxToDiscordInGuild(u.id)))
  const verified = top.filter((_, i) => links[i] != null)
  const headshots = await fetchHeadshots(verified.map((u) => u.id))

  return verified.map((u, i) => ({
    type: 'roblox' as const,
    robloxId: u.id,
    discordId: links[top.indexOf(u)] ?? null,
    username: u.name,
    displayName: u.displayName,
    avatarUrl: headshots[u.id] ?? null,
  }))
}

function discordAvatar(user: {
  id: string
  avatar: string | null
}): string {
  return user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${
        user.avatar.startsWith('a_') ? 'gif' : 'png'
      }?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}.png`
}

// Search Discord members within the guild by username / nickname.
async function searchDiscord(query: string): Promise<Result[]> {
  if (!DISCORD_TOKEN) return []
  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/search?query=${encodeURIComponent(
        query,
      )}&limit=6`,
      { headers: { Authorization: `Bot ${DISCORD_TOKEN}` }, cache: 'no-store' },
    )
    if (!res.ok) return []
    const members = (await res.json()) as {
      nick: string | null
      user: { id: string; username: string; global_name: string | null; avatar: string | null }
    }[]
    return members.map((m) => ({
      type: 'discord' as const,
      robloxId: null,
      discordId: m.user.id,
      username: m.user.username,
      displayName: m.nick ?? m.user.global_name ?? m.user.username,
      avatarUrl: discordAvatar(m.user),
    }))
  } catch {
    return []
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() ?? ''
  if (query.length < 1) return NextResponse.json({ users: [] })

  const [roblox, discord] = await Promise.all([searchRoblox(query), searchDiscord(query)])

  // Merge, de-duplicating people found through both sources (same Discord id).
  const byKey = new Map<string, Result>()
  for (const r of [...roblox, ...discord]) {
    const key = r.discordId ? `d:${r.discordId}` : `r:${r.robloxId}`
    if (!byKey.has(key)) byKey.set(key, r)
    else if (r.type === 'roblox') byKey.set(key, r) // prefer the roblox-linked entry
  }

  return NextResponse.json({ users: Array.from(byKey.values()) })
}
