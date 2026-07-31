// ============================================================
// MetaCloudEngine — WhatsAppEngine backed by Meta Cloud API.
//
// A zero-behaviour-change wrapper around the existing functions in
// meta-api.ts. When WA_CONNECTOR_TYPE is "meta" (or unset), this
// is the active engine and the app behaves exactly as before.
// ============================================================

import type { WhatsAppEngine, MetaSendResult, ListSection } from './engine'
import type { MediaKind, InteractiveButton } from './meta-api'
import {
  sendTextMessage,
  sendMediaMessage,
  sendTemplateMessage,
  sendReactionMessage,
  sendInteractiveButtons as metaSendButtons,
  sendInteractiveList as metaSendList,
} from './meta-api'
import type { MessageTemplate } from '@/types'
import type { SendTimeParams } from './template-send-builder'

export class MetaCloudEngine implements WhatsAppEngine {
  async sendText(args: {
    phoneNumberId: string
    accessToken: string
    to: string
    text: string
    contextMessageId?: string
  }): Promise<MetaSendResult> {
    return sendTextMessage(args)
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
    return sendMediaMessage(args)
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
    return sendTemplateMessage({
      ...args,
      template: args.template as MessageTemplate | undefined,
      messageParams: args.messageParams as SendTimeParams | undefined,
    })
  }

  async sendReaction(args: {
    phoneNumberId: string
    accessToken: string
    to: string
    targetMessageId: string
    emoji: string
  }): Promise<MetaSendResult> {
    return sendReactionMessage(args)
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
    return metaSendButtons(args)
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
    return metaSendList(args)
  }
}
