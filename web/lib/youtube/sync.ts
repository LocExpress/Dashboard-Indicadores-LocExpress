import { google } from 'googleapis'
import { format, subDays } from 'date-fns'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

function sbHeaders() {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates',
  }
}

async function sbGet(table: string, qs: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

async function sbUpsert(table: string, data: object[], onConflict: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify(data),
  })
  return res.ok
}

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID!,
    process.env.YOUTUBE_CLIENT_SECRET!,
    process.env.YOUTUBE_REDIRECT_URI!,
  )
}

async function getAuthenticatedClients() {
  const rows = await sbGet('youtube_tokens', 'select=refresh_token,channel_id&order=created_at.desc&limit=1')
  const tokenRow = rows[0]
  if (!tokenRow?.refresh_token) throw new Error('Canal não conectado. Faça login no LocHub primeiro.')

  const auth = getOAuthClient()
  auth.setCredentials({ refresh_token: tokenRow.refresh_token })
  const { credentials } = await auth.refreshAccessToken()
  auth.setCredentials(credentials)

  return {
    youtube:          google.youtube({ version: 'v3', auth }),
    youtubeAnalytics: google.youtubeAnalytics({ version: 'v2', auth }),
    channelId:        tokenRow.channel_id as string,
  }
}

export async function runYoutubeSync(days = 30) {
  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
    throw new Error('Credenciais YouTube não configuradas nas variáveis de ambiente do Vercel (YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET)')
  }
  const { youtube, youtubeAnalytics, channelId } = await getAuthenticatedClients()

  // 1. Canal
  const chRes = await youtube.channels.list({
    part: ['snippet', 'statistics'],
    mine: true,
  })
  const ch = chRes.data.items?.[0]
  if (ch) {
    await sbUpsert('youtube_channels', [{
      channel_id:       ch.id!,
      title:            ch.snippet?.title,
      description:      ch.snippet?.description,
      thumbnail_url:    ch.snippet?.thumbnails?.high?.url,
      subscriber_count: Number(ch.statistics?.subscriberCount ?? 0),
      video_count:      Number(ch.statistics?.videoCount ?? 0),
      view_count:       Number(ch.statistics?.viewCount ?? 0),
      custom_url:       ch.snippet?.customUrl,
      published_at:     ch.snippet?.publishedAt,
      synced_at:        new Date().toISOString(),
    }], 'channel_id')
  }

  // 2. Vídeos (pagina para buscar todos, não só os primeiros 50)
  const uploadsRes = await youtube.channels.list({ part: ['contentDetails'], mine: true })
  const uploadsId  = uploadsRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  let videosSynced = 0
  if (uploadsId) {
    const allIds: string[] = []
    const fetchPage = (token?: string) => youtube.playlistItems.list({
      part: ['contentDetails'],
      playlistId: uploadsId,
      maxResults: 50,
      pageToken: token,
    })
    let pageToken: string | undefined = undefined
    while (true) {
      const plRes = await fetchPage(pageToken)
      const ids = (plRes.data.items ?? []).map((i) => i.contentDetails?.videoId).filter(Boolean) as string[]
      allIds.push(...ids)
      pageToken = plRes.data.nextPageToken ?? undefined
      if (!pageToken) break
    }

    // Busca detalhes em lotes de 50 (limite da API)
    for (let i = 0; i < allIds.length; i += 50) {
      const batch = allIds.slice(i, i + 50)
      const vRes = await youtube.videos.list({ part: ['snippet', 'statistics', 'contentDetails'], id: batch })
      const videos = (vRes.data.items ?? []).map((v) => ({
        video_id:      v.id!,
        channel_id:    channelId,
        title:         v.snippet?.title,
        description:   v.snippet?.description,
        thumbnail_url: v.snippet?.thumbnails?.high?.url ?? v.snippet?.thumbnails?.medium?.url,
        published_at:  v.snippet?.publishedAt,
        duration:      v.contentDetails?.duration,
        view_count:    Number(v.statistics?.viewCount    ?? 0),
        like_count:    Number(v.statistics?.likeCount    ?? 0),
        comment_count: Number(v.statistics?.commentCount ?? 0),
        score:         Number(v.statistics?.viewCount ?? 0)
                     + Number(v.statistics?.likeCount ?? 0) * 10
                     + Number(v.statistics?.commentCount ?? 0) * 5,
        synced_at:     new Date().toISOString(),
      }))
      if (videos.length > 0) {
        await sbUpsert('youtube_videos', videos, 'video_id')
        videosSynced += videos.length
      }
    }
  }

  // 3. Analytics dos últimos `days` dias
  const endDate   = format(new Date(), 'yyyy-MM-dd')
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd')

  const analyticsRes = await youtubeAnalytics.reports.query({
    ids:        `channel==${channelId}`,
    startDate,
    endDate,
    metrics:    'views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained,subscribersLost',
    dimensions: 'day',
    sort:       'day',
  })

  const headers = analyticsRes.data.columnHeaders?.map((h) => h.name) ?? []
  const rows    = analyticsRes.data.rows ?? []
  const colMap: Record<string, string> = {
    day:                     'date',
    views:                   'views',
    estimatedMinutesWatched: 'estimated_minutes_watched',
    averageViewDuration:     'average_view_duration',
    likes:                   'likes',
    comments:                'comments',
    shares:                  'shares',
    subscribersGained:       'subscribers_gained',
    subscribersLost:         'subscribers_lost',
  }

  const analytics = rows.map((row) => {
    const entry: Record<string, string | number> = { channel_id: channelId }
    headers.forEach((header, i) => {
      const key = colMap[header!]
      if (key) entry[key] = header === 'day' ? String(row[i]) : Number(row[i])
    })
    return entry
  })

  let analyticsSynced = 0
  if (analytics.length > 0) {
    await sbUpsert('youtube_channel_analytics', analytics, 'channel_id,date')
    analyticsSynced = analytics.length
  }

  return {
    channel:    !!ch,
    videos:     videosSynced,
    analytics:  analyticsSynced,
    period:     { startDate, endDate },
  }
}
