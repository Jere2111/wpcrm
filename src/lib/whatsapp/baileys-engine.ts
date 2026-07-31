// ============================================================
// BaileysEngine — WhatsAppEngine backed by a Baileys sidecar.
//
// Baileys (@whiskeysockets/baileys) maintains a persistent WebSocket
// connection to WhatsApp's servers — it can't run inside a serverless
// function (Next.js API routes). This engine delegates to an external
// HTTP sidecar service that hosts the Baileys sessions.
//
// The sidecar is expected to expose a simple REST API:
//   POST /send/text     → { messageId }
//   POST /send/media    → { messageId }
//   POST /send/template → { messageId }
//   POST /send/reaction → { messageId }
//   POST /send/interactive/buttons → { messageId }
//   POST /send/interactive/list    → { messageId }
//
// Configure via:
//   BAILEYS_SIDECAR_URL=http://localhost:3001
//
// This is a STUB — the sidecar project lives outside this repo. The
// contract is documented here so a sidecar implementation knows what
// to expect.
// ============================================================

import type { WhatsAppEngine, MetaSendResult, ListSection } from './engine'
import type { MediaKind, InteractiveButton } from './meta-api'

function getSidecarUrl(): string {
  const url = process.env.BAILEYS_SIDECAR_URL
  if (!url) {
    throw new Error(
      'BAILEYS_SIDECAR_URL is required when WA_CONNECTOR_TYPE is "baileys". ' +
      'Set it to the URL of your Baileys sidecar service (e.g. http://localhost:3001).'
    )
  }
  return url.replace(/\/+$/, '') // strip trailing slash
}

interface SidecarResponse {
  messageId?: string
  error?: string
}

async function sidecarPost(path: string, body: unknown): Promise<MetaSendResult> {
  const url = `${getSidecarUrl()}${path}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Baileys sidecar unreachable at ${url}: ${msg}`)
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as SidecarResponse
    throw new Error(data.error ?? `Baileys sidecar error: ${res.status}`)
  }

  const data = (await res.json()) as SidecarResponse
  if (!data.messageId) {
    throw new Error('Baileys sidecar did not return a messageId.')
  }
  return { messageId: data.messageId }
}

export class BaileysEngine implements WhatsAppEngine {
  async sendText(args: {
    phoneNumberId: string
    accessToken: string
    to: string
    text: string
    contextMessageId?: string
  }): Promise<MetaSendResult> {
    return sidecarPost('/send/text', {
      to: args.to,
      text: args.text,
      contextMessageId: args.contextMessageId,
    })
  }

  async sendMedia(args: {
    phoneNumberId: string
    accessToken: string
    to: string
    kind: MediaKind
    link: string
    caption?: string
    filename?: string
    contextMessageId?: string
  }): Promise<MetaSendResult> {
    return sidecarPost('/send/media', {
      to: args.to,
      kind: args.kind,
      link: args.link,
      caption: args.caption,
      filename: args.filename,
      contextMessageId: args.contextMessageId,
    })
  }

  async sendTemplate(args: {
    phoneNumberId: string
    accessToken: string
    to: string
    templateName: string
    language?: string
    params?: string[]
    template?: unknown
    messageParams?: unknown
    contextMessageId?: string
  }): Promise<MetaSendResult> {
    return sidecarPost('/send/template', {
      to: args.to,
      templateName: args.templateName,
      language: args.language,
      params: args.params,
      contextMessageId: args.contextMessageId,
    })
  }

  async sendReaction(args: {
    phoneNumberId: string
    accessToken: string
    to: string
    targetMessageId: string
    emoji: string
  }): Promise<MetaSendResult> {
    return sidecarPost('/send/reaction', {
      to: args.to,
      targetMessageId: args.targetMessageId,
      emoji: args.emoji,
    })
  }

  async sendInteractiveButtons(args: {
    phoneNumberId: string
    accessToken: string
    to: string
    bodyText: string
    headerText?: string
    footerText?: string
    buttons: InteractiveButton[]
    contextMessageId?: string
  }): Promise<MetaSendResult> {
    return sidecarPost('/send/interactive/buttons', {
      to: args.to,
      bodyText: args.bodyText,
      headerText: args.headerText,
      footerText: args.footerText,
      buttons: args.buttons,
      contextMessageId: args.contextMessageId,
    })
  }

  async sendInteractiveList(args: {
    phoneNumberId: string
    accessToken: string
    to: string
    bodyText: string
    buttonLabel: string
    headerText?: string
    footerText?: string
    sections: ListSection[]
    contextMessageId?: string
  }): Promise<MetaSendResult> {
    return sidecarPost('/send/interactive/list', {
      to: args.to,
      bodyText: args.bodyText,
      buttonLabel: args.buttonLabel,
      headerText: args.headerText,
      footerText: args.footerText,
      sections: args.sections,
      contextMessageId: args.contextMessageId,
    })
  }
}
