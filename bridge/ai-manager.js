import { runAgy } from "./antigravity.js";

export async function completePrompt({
  prompt,
  model,
  effort = "high",
  timeout = 90_000,
  provider = process.env.AI_PROVIDER || "agy",
}) {
  const chosenProvider = provider.toLowerCase();

  if (chosenProvider === "gemini" && process.env.GEMINI_API_KEY) {
    const apiKey = process.env.GEMINI_API_KEY;
    const m = model || "gemini-2.5-pro";
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) throw new Error(`Gemini API error: ${res.statusText}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  if (chosenProvider === "openai" && process.env.OPENAI_API_KEY) {
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const m = model || "gpt-4o";
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: m,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.statusText}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  if (chosenProvider === "ollama") {
    const host = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
    const m = model || "llama3.1";
    const res = await fetch(`${host}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: m, prompt, stream: false }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`);
    const data = await res.json();
    return data.response || "";
  }

  // Default: Google Antigravity (agy CLI daemon)
  return await runAgy(prompt, { timeout, model, effort });
}
