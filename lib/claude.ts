import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AnalysisSchema, type Analysis } from "./character/schema";
import { SYSTEM_PROMPT } from "./character/prompt";

const client = new Anthropic();
const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";

export class AnalysisRefusedError extends Error {}

export async function analyzeEntry(userMessage: string): Promise<Analysis> {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: betaZodOutputFormat(AnalysisSchema) },
    // If a safety classifier declines, let the API retry on a fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMessage }],
  });

  if (response.stop_reason === "refusal") {
    throw new AnalysisRefusedError("The model declined to analyse this entry");
  }
  if (!response.parsed_output) {
    throw new Error(`No structured output (stop_reason: ${response.stop_reason})`);
  }
  return response.parsed_output;
}
