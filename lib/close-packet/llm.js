const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * Generic LLM completion for close-packet section generation.
 * Returns { source: "openai" | "fallback", content: string, raw?: object }
 *
 * @param {object} params
 * @param {string} params.system    - System prompt
 * @param {string} params.user      - User content (already stringified if JSON)
 * @param {number} [params.temperature=0.2]
 * @param {boolean} [params.jsonMode=false] - If true, request JSON response format
 * @param {string} [params.fallback] - String to return if OPENAI_API_KEY missing or call fails
 */
export async function complete({ system, user, temperature = 0.2, jsonMode = false, fallback = "" }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { source: "fallback", content: fallback };
  }
  try {
    const body = {
      model: DEFAULT_MODEL,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };
    if (jsonMode) body.response_format = { type: "json_object" };
    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("[close-packet/llm] OpenAI error", response.status, errText);
      return { source: "fallback", content: fallback };
    }
    const json = await response.json();
    const content = json.choices?.[0]?.message?.content ?? fallback;
    return { source: "openai", content, raw: json };
  } catch (err) {
    console.error("[close-packet/llm] fetch failed", err);
    return { source: "fallback", content: fallback };
  }
}

/**
 * Convenience wrapper for sections that need structured JSON output.
 * Parses the LLM's JSON response and returns the parsed object.
 * Returns { source, data } where data is the parsed object or the fallback object.
 */
export async function completeJson({ system, user, temperature = 0.2, fallback = {} }) {
  const result = await complete({
    system,
    user,
    temperature,
    jsonMode: true,
    fallback: JSON.stringify(fallback),
  });
  try {
    return { source: result.source, data: JSON.parse(result.content) };
  } catch (err) {
    console.error("[close-packet/llm] JSON parse failed", err, result.content?.slice(0, 500));
    return { source: "fallback", data: fallback };
  }
}
