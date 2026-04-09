type GenerateInput = {
  system: string;
  prompt: string;
  temperature?: number;
};

export type GenerateOutput = {
  text: string;
  provider: "ollama" | "gemini";
  model: string;
};

function getProvider(): "ollama" | "gemini" {
  const raw = (process.env.AI_PROVIDER || "ollama").toLowerCase();
  return raw === "gemini" ? "gemini" : "ollama";
}

async function generateWithOllama(
  input: GenerateInput
): Promise<GenerateOutput> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.1:8b";

  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: `${input.system}\n\nUSER REQUEST:\n${input.prompt}`,
      stream: false,
      options: {
        temperature: input.temperature ?? 0.7,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { response?: string };
  return {
    text: (data.response || "").trim(),
    provider: "ollama",
    model,
  };
}

async function generateWithGemini(
  input: GenerateInput
): Promise<GenerateOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${input.system}\n\nUSER REQUEST:\n${input.prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: input.temperature ?? 0.7,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as any;
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text || "")
      .join("\n")
      .trim() || "";

  return {
    text,
    provider: "gemini",
    model,
  };
}

export async function generateAthletiqText(
  input: GenerateInput
): Promise<GenerateOutput> {
  const provider = getProvider();

  if (provider === "gemini") {
    try {
      return await generateWithGemini(input);
    } catch (err) {
      console.warn("Gemini failed, falling back to Ollama:", err);
      return await generateWithOllama(input);
    }
  }

  return await generateWithOllama(input);
}
