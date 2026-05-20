import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_TIMEOUT_MS = 6 * 60 * 1000;

function parseStreamingEvents(rawText: string) {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const nodeBuffers = new Map<string, string>();
  const events: Array<Record<string, unknown>> = [];

  for (const line of lines) {
    try {
      const event = JSON.parse(line) as {
        type?: string;
        content?: string;
        metadata?: { nodeName?: string };
      };
      events.push(event as Record<string, unknown>);

      if (event.type === "item" && typeof event.content === "string") {
        const nodeName = event.metadata?.nodeName ?? "unknown";
        nodeBuffers.set(nodeName, (nodeBuffers.get(nodeName) ?? "") + event.content);
      }
    } catch {
      // Ignore non-JSON chunks.
    }
  }

  return {
    events,
    nodeOutputs: Object.fromEntries(nodeBuffers.entries())
  };
}

function unwrapRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const unwrapped = unwrapRecord(item);
      if (unwrapped) return unwrapped;
    }
    return null;
  }

  const record = value as Record<string, unknown>;

  if (record.json && typeof record.json === "object") {
    return unwrapRecord(record.json) ?? record;
  }

  if (record.data && typeof record.data === "object") {
    return unwrapRecord(record.data) ?? record;
  }

  if (record.body && typeof record.body === "object") {
    return unwrapRecord(record.body) ?? record;
  }

  return record;
}

function parseJsonValue<T>(value: unknown): T | undefined {
  if (typeof value !== "string") return undefined;

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function normalizeImages(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  }

  if (typeof value === "string") {
    const parsed = parseJsonValue<unknown>(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
    }
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const direct = record.images ?? record.image_urls ?? record.imageUrls;
    return normalizeImages(direct);
  }

  return [];
}

function findImagesArray(value: unknown): Array<Record<string, unknown>> | undefined {
  if (!value) return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImagesArray(item);
      if (found) return found;
    }

    return undefined;
  }

  if (typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  const directImages = normalizeImages(record.images ?? record.image_urls ?? record.imageUrls);
  if (directImages.length > 0) return directImages;

  for (const key of Object.keys(record)) {
    const found = findImagesArray(record[key]);
    if (found) return found;
  }

  return undefined;
}

function normalizeN8nResponse(data: unknown) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    const nodeOutputs = record.nodeOutputs as Record<string, string> | undefined;
    const images = findImagesArray(record);

    if (nodeOutputs) {
      return {
        trend_analysis: nodeOutputs["Analyze Trends"],
        content_ideas: nodeOutputs["Generate Content Ideas"],
        instagram_content: nodeOutputs["Create Instagram Posts"] ?? nodeOutputs["instagram_posts"],
        visual_ideas: nodeOutputs["Generate Image Prompts"] ?? nodeOutputs["image_prompts"],
        image_url: record.image_url ?? record.imageUrl,
        images: images ?? [],
        generated_at: record.generated_at ?? record.generatedAt,
        rss_source: record.rss_source,
        images_generated: record.images_generated,
        topic: record.topic,
        target_audience: record.target_audience,
        tonality: record.tonality,
        items: record.items,
        nodeOutputs,
        raw_response: record.raw_response
      };
    }
  }

  if (Array.isArray(data)) {
    const firstItem = data.find((item) => item && typeof item === "object") as
      | Record<string, unknown>
      | undefined;

    if (firstItem) {
      const images = findImagesArray(firstItem);

      return {
        items: data,
        trend_analysis: (firstItem.trend_analysis ?? firstItem.trendAnalysis ?? firstItem.analysis) as
          | string
          | undefined,
        content_ideas: (firstItem.content_ideas ?? firstItem.contentIdeas) as string | undefined,
        instagram_content: (firstItem.instagram_content ??
          firstItem.instagram_posts ??
          firstItem.instagramPosts) as string | undefined,
        visual_ideas: (firstItem.visual_ideas ?? firstItem.image_prompts ?? firstItem.imagePrompts) as
          | string
          | undefined,
        image_url: (firstItem.image_url ?? firstItem.imageUrl) as string | undefined,
        images: images ?? [],
        generated_at: (firstItem.generated_at ?? firstItem.generatedAt) as string | undefined,
        rss_source: firstItem.rss_source as string | undefined,
        images_generated: firstItem.images_generated as number | undefined,
        topic: firstItem.topic as string | undefined,
        target_audience: firstItem.target_audience as string | undefined,
        tonality: firstItem.tonality as string | undefined,
        raw_response: data
      };
    }

    return { items: data, images: [], raw_response: data };
  }

  const record = unwrapRecord(data);

  if (!record) {
    return { raw_response: data };
  }

  return {
    trend_analysis: (record.trend_analysis ?? record.trendAnalysis ?? record.analysis) as
      | string
      | undefined,
    content_ideas: (record.content_ideas ?? record.contentIdeas) as string | undefined,
    instagram_content: (record.instagram_content ?? record.instagram_posts ?? record.instagramPosts) as
      | string
      | undefined,
    visual_ideas: (record.visual_ideas ?? record.image_prompts ?? record.imagePrompts) as
      | string
      | undefined,
    image_url: (record.image_url ?? record.imageUrl) as string | undefined,
    generated_at: (record.generated_at ?? record.generatedAt) as string | undefined,
    rss_source: record.rss_source as string | undefined,
    images_generated: record.images_generated as number | undefined,
    raw_response: data,
    ...record,
    images: findImagesArray(record) ?? []
  };
}

export async function POST(request: Request) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;

  if (!webhookUrl) {
    return NextResponse.json(
      { error: "N8N_WEBHOOK_URL ist nicht gesetzt." },
      { status: 500 }
    );
  }

  let payload: {
    topic?: string;
    target_audience?: string;
    tonality?: string;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON." }, { status: 400 });
  }

  const { topic, target_audience, tonality } = payload;
  if (!topic || !target_audience || !tonality) {
    return NextResponse.json(
      { error: "Die Felder topic, target_audience und tonality sind erforderlich." },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-api-key": secret } : {})
      },
      body: JSON.stringify({ topic, target_audience, tonality }),
      signal: controller.signal
    });

    const rawText = await response.text();
    let data: unknown = null;

    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { raw_response: rawText, ...parseStreamingEvents(rawText) };
      }
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "n8n hat einen Fehler zurückgegeben.",
          details: data
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ...normalizeN8nResponse(data)
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "n8n hat nicht rechtzeitig geantwortet."
        : "Der Webhook ist nicht erreichbar.";

    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
