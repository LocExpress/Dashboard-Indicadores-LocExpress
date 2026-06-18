import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/?youtube_auth=error&reason=${error ?? 'no_code'}`, request.url),
    )
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID!,
      process.env.YOUTUBE_CLIENT_SECRET!,
      process.env.YOUTUBE_REDIRECT_URI!,
    )

    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Busca o channel_id do canal autenticado
    const youtube   = google.youtube({ version: 'v3', auth: oauth2Client })
    const chRes     = await youtube.channels.list({ part: ['id', 'snippet'], mine: true })
    const channelId = chRes.data.items?.[0]?.id ?? ''

    // Salva o token no Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/youtube_tokens?on_conflict=channel_id`, {
      method: 'POST',
      headers: {
        apikey:          SERVICE_KEY,
        Authorization:   `Bearer ${SERVICE_KEY}`,
        'Content-Type':  'application/json',
        Prefer:          'resolution=merge-duplicates',
      },
      body: JSON.stringify([{
        channel_id:    channelId,
        refresh_token: tokens.refresh_token,
        access_token:  tokens.access_token,
        token_exp:     tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
      }]),
    })

    return NextResponse.redirect(new URL('/?youtube_auth=success', request.url))
  } catch (err) {
    console.error('[YouTube OAuth Callback]', err)
    return NextResponse.redirect(new URL('/?youtube_auth=error&reason=token_exchange', request.url))
  }
}
