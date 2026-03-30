const VOYAGE_RPM_LIMIT = 3;
const MIN_DELAY_MS = Math.ceil(60000 / VOYAGE_RPM_LIMIT) + 200; // ~20.2s between calls

let lastCallTime = 0;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise(res => setTimeout(res, MIN_DELAY_MS - elapsed));
  }
  lastCallTime = Date.now();
}

async function voyageEmbed(input: string | string[]): Promise<number[][]> {
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    await waitForRateLimit();

    const response = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        input,
        model: "voyage-code-3",
      }),
    });

    if (response.status === 429) {
      attempt++;
      const backoff = Math.pow(2, attempt) * 1000;
      console.warn(`[VOYAGE] rate limited, retrying in ${backoff}ms (attempt ${attempt}/${MAX_RETRIES})`);
      await new Promise(res => setTimeout(res, backoff));
      continue;
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Voyage API error: ${JSON.stringify(err)}`);
    }

    const data = await response.json();
    if (!data.data) throw new Error("No embeddings returned from Voyage AI");
    return data.data.map((d: any) => d.embedding);
  }

  throw new Error("Voyage API rate limit exceeded after max retries");
}

export async function embedCode(text: string): Promise<number[]> {
  const results = await voyageEmbed(text);
  const embedding = results[0];
  if (!embedding) throw new Error("No embedding returned from Voyage AI");
  return embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  // With 3 RPM limit, batch all texts in one call
  return voyageEmbed(texts);
}