// Source: SOFT STUDIO spec. Do not paraphrase. Used by LLMProvider.detectWhisper.
// Unused in Weeks 1-3, but kept in tree for the Week 5 follow-up plan.
export const WHISPER_DETECT_PROMPT = `A creative person has been saving pins that visually cluster. Decide if this pattern is worth a gentle whisper or should stay quiet.

Payload: 5 representative pin descriptions + Pinterest descriptions

Return JSON:
{
  "worth_whispering": "boolean",
  "whisper_text": "if true, a single calm invitational sentence. e.g. 'you've been saving a lot of warm beige textures lately — want to start a project?' If false, null.",
  "reason": "short internal note for logging"
}

Rules:
- Default to NOT whispering. Only whisper if pattern is genuinely strong.
- Whisper text is invitational, never urgent. Never "you should". Always "want to".
- Never reference how many pins ("you saved 14 things!"). Counts feel surveillance-y.`;
