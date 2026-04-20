import Anthropic from "@anthropic-ai/sdk"
import type {
  MessageCreateParamsNonStreaming,
  Message,
} from "@anthropic-ai/sdk/resources/messages"
import { logUsageEvent } from "./log"
import type { Attribution, Operation } from "./types"

const globalForAnthropic = globalThis as unknown as { __usageAnthropic?: Anthropic }

const anthropicClient =
  globalForAnthropic.__usageAnthropic ??
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

if (process.env.NODE_ENV !== "production") {
  globalForAnthropic.__usageAnthropic = anthropicClient
}

export interface CreateMessageInput {
  params: MessageCreateParamsNonStreaming
  operation: Operation
  attribution: Attribution
  metadata?: Record<string, unknown>
}

export async function createMessage(input: CreateMessageInput): Promise<Message> {
  const start = Date.now()
  let result: Message
  try {
    result = await anthropicClient.messages.create(input.params)
  } catch (err) {
    await logUsageEvent({
      provider: "anthropic",
      model: input.params.model,
      operation: input.operation,
      units: {},
      attribution: input.attribution,
      durationMs: Date.now() - start,
      errorMessage: err instanceof Error ? err.message : String(err),
      metadata: input.metadata,
    })
    throw err
  }

  await logUsageEvent({
    provider: "anthropic",
    model: input.params.model,
    operation: input.operation,
    units: {
      inputTokens: result.usage.input_tokens,
      outputTokens: result.usage.output_tokens,
    },
    attribution: input.attribution,
    durationMs: Date.now() - start,
    metadata: input.metadata,
  })

  return result
}
