// ============================================================
// WhatsApp Engine — transport-agnostic messaging abstraction.
//
// Every outbound message goes through a `WhatsAppEngine` instance.
// Two strategies exist:
//
//   1. MetaCloudEngine  — delegates to the existing meta-api.ts
//      functions (Meta Cloud API). This is the default and covers
//      the existing behaviour with zero changes.
//
//   2. BaileysEngine — delegates to an external Baileys sidecar
//      service over HTTP. The sidecar maintains WebSocket sessions,
//      QR pairing, and session persistence; this adapter only sends
//      HTTP requests to it.
//
// The active engine is selected by `WA_CONNECTOR_TYPE` env var:
//   "meta"    → MetaCloudEngine  (default)
//   "baileys" → BaileysEngine
//
// Design choice: the interface mirrors the exact params each send
// function already expects, so the MetaCloudEngine is a thin pass-
// through. Adding a new transport (e.g. WhatsApp Business On-Premises)
// only requires a new `WhatsAppEngine` implementation.
// ============================================================

import type { MetaSendResult, MediaKind, InteractiveButton } from './meta-api'

// Re-export so callers don't need to import meta-api directly.
export type { MetaSendResult }

/**
 * A list section for interactive list messages. Mirrors the shape
 * expected by `sendInteractiveList` in meta-api.ts.
 */
export interface ListSection {
  title?: string
  rows: {
    id: string
    title: string
    description?: string
  }[]
}

/**
 * Transport-agnostic WhatsApp messaging interface.
 *
 * Every method returns a `MetaSendResult` (which is just `{ messageId: string }`)
 * for compatibility — the Baileys engine maps its own message IDs into this
 * shape.
 */
export interface WhatsAppEngine {
  sendText(args: {
    phoneNumberId: string
    accessToken: string
    to: string
    text: string
    contextMessageId?: string
  }): Promise<MetaSendResult>

  sendMedia(args: {
    phoneNumberId: string
    accessToken: string
    to: string
    kind: MediaKind
    link: string
    caption?: string
    filename?: string
    contextMessageId?: string
  }): Promise<MetaSendResult>

  sendTemplate(args: {
    phoneNumberId: string
    accessToken: string
    to: string
    templateName: string
    language?: string
    params?: string[]
    template?: unknown
    messageParams?: unknown
    contextMessageId?: string
  }): Promise<MetaSendResult>

  sendReaction(args: {
    phoneNumberId: string
    accessToken: string
    to: string
    targetMessageId: string
    emoji: string
  }): Promise<MetaSendResult>

  sendInteractiveButtons(args: {
    phoneNumberId: string
    accessToken: string
    to: string
    bodyText: string
    headerText?: string
    footerText?: string
    buttons: InteractiveButton[]
    contextMessageId?: string
  }): Promise<MetaSendResult>

  sendInteractiveList(args: {
    phoneNumberId: string
    accessToken: string
    to: string
    bodyText: string
    buttonLabel: string
    headerText?: string
    footerText?: string
    sections: ListSection[]
    contextMessageId?: string
  }): Promise<MetaSendResult>
}

/**
 * Resolve the active WhatsApp engine from the environment. Falls back
 * to Meta Cloud API when `WA_CONNECTOR_TYPE` is unset or unrecognized.
 */
export function getWhatsAppEngine(): WhatsAppEngine {
  const connectorType = (process.env.WA_CONNECTOR_TYPE ?? 'meta').toLowerCase()

  switch (connectorType) {
    case 'baileys': {
      // Lazy-import to avoid loading the baileys module when not needed.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { BaileysEngine } = require('./baileys-engine') as typeof import('./baileys-engine')
      return new BaileysEngine()
    }
    case 'meta':
    default: {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { MetaCloudEngine } = require('./meta-cloud-engine') as typeof import('./meta-cloud-engine')
      return new MetaCloudEngine()
    }
  }
}
