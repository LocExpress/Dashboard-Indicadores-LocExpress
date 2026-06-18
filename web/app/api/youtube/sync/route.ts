import { NextResponse } from 'next/server'
import { runYoutubeSync } from '@/lib/youtube/sync'

// Verifica se a requisição vem do Vercel Cron ou tem autorização manual
function isAuthorized(req: Request): boolean {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

// GET: chamado pelo Vercel Cron (diariamente)
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return handleSync()
}

// POST: chamado manualmente pelo botão Sincronizar do dashboard
export async function POST(req: Request) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  // Aceita tanto Bearer token quanto chamadas sem auth (interna, via dashboard autenticado)
  if (secret && auth && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return handleSync()
}

async function handleSync() {
  try {
    const result = await runYoutubeSync(30)
    return NextResponse.json({ success: true, synced: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Falha ao sincronizar'
    console.error('[YouTube Sync]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
