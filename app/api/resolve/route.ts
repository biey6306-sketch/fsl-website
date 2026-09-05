import { NextResponse } from 'next/server'

const BLOXLINK_KEY = process.env.BLOXLINK_API_KEY
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN
// The guild scopes every Bloxlink lookup so only server members resolve.
const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1481684149373763618'

const DISCORD_EPOCH = 1420070400000

function snowflakeToDate(id: string): string | null {
  try {
    const ms = Number(BigInt(id) >> 22n) + DISCORD_EPOCH
    return new Date(ms).toISOString()
  } catch {
    return null
  }
}

async function getRobloxUser(robloxId: string) {
  const [infoRes, avatarRes] = await Promise.all([
    fetch(`https://users.roblox.com/v1/users/${robloxId}`, { cache: 'no-store' }),
    fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=420x420&format=Png&isCircular=false`,
      { cache: 'no-store' },
    ),
  ])

  if (!infoRes.ok) return null
  const info = (await infoRes.json()) as {
    id: number
    name: string
    displayName: string
    description: string
    created: string
  }

  let avatarUrl: string | null = null
  if (avatarRes.ok) {
    const json = (await avatarRes.json()) as { data?: { imageUrl: string }[] }
    avatarUrl = json.data?.[0]?.imageUrl ?? null
  }

  return {
    id: String(info.id),
    username: info.name,
    displayName: info.displayName,
    created: info.created,
    avatarUrl,
  }
}

// Roblox -> Discord, scoped to the guild (only resolves server members).
async function robloxToDiscord(robloxId: string): Promise<string | null> {
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

// Discord -> Roblox, scoped to the guild.
async function discordToRoblox(discordId: string): Promise<string | null> {
  if (!BLOXLINK_KEY) return null
  try {
    const res = await fetch(
      `https://api.blox.link/v4/public/guilds/${GUILD_ID}/discord-to-roblox/${discordId}`,
      { headers: { Authorization: BLOXLINK_KEY }, cache: 'no-store' },
    )
    if (!res.ok) return null
    const json = (await res.json()) as { robloxID?: string }
    return json.robloxID ?? null
  } catch {
    return null
  }
}

async function getDiscordUser(discordId: string) {
  if (!DISCORD_TOKEN) return null
  try {
    const res = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
      headers: { Authorization: `Bot ${DISCORD_TOKEN}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const user = (await res.json()) as {
      id: string
      username: string
      global_name: string | null
      avatar: string | null
    }
    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${
          user.avatar.startsWith('a_') ? 'gif' : 'png'
        }?size=256`
      : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}.png`
    return {
      id: user.id,
      username: user.username,
      displayName: user.global_name ?? user.username,
      avatarUrl,
      createdAt: snowflakeToDate(user.id),
    }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  let robloxId = searchParams.get('robloxId')?.trim() || null
  let discordId = searchParams.get('discordId')?.trim() || null

  if (!robloxId && !discordId) {
    return NextResponse.json({ error: 'robloxId or discordId is required' }, { status: 400 })
  }

  // Fill in the missing side of the link via the guild-scoped Bloxlink lookup.
  if (robloxId && !discordId) discordId = await robloxToDiscord(robloxId)
  if (discordId && !robloxId) robloxId = await discordToRoblox(discordId)

  const [roblox, discord] = await Promise.all([
    robloxId ? getRobloxUser(robloxId) : Promise.resolve(null),
    discordId ? getDiscordUser(discordId) : Promise.resolve(null),
  ])

  if (!roblox && !discord) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ roblox, discord })
}
