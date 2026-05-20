"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

type FormState = {
  topic: string;
  target_audience: string;
  tonality: "informativ" | "locker" | "provokant" | "professionell";
};

type ApiResponse = {
  items?: Array<Record<string, unknown>>;
  nodeOutputs?: Record<string, string>;
  trend_analysis?: string;
  content_ideas?: string;
  instagram_content?: string;
  instagram_posts?: string;
  visual_ideas?: string;
  image_prompts?: string;
  image_url?: string;
  generated_at?: string;
  rss_source?: string;
  images_generated?: number;
  raw_response?: unknown;
  error?: string;
  details?: unknown;
};

type InstagramPostDraft = {
  title: string;
  body: string;
  hashtags?: string;
};

type ContentIdeaDraft = {
  title: string;
  description: string;
  visual_approach: string | undefined;
};

type InstagramPostPayload = {
  hook: string;
  caption: string;
  facts: string | undefined;
  hashtags: string | undefined;
};

function parseJsonValue<T>(value: unknown): T | undefined {
  if (typeof value !== "string") return undefined;

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function extractArrayField(value: unknown, fieldName: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const record = value as Record<string, unknown>;
  const field = record[fieldName];
  return Array.isArray(field) ? field : undefined;
}

function resolveArrayInput(value: unknown, fieldName: string) {
  if (Array.isArray(value)) return value;

  const parsed = parseJsonValue<Record<string, unknown>>(value);
  if (!parsed) return [];

  const directArray = parsed[fieldName];
  if (Array.isArray(directArray)) return directArray;

  return [];
}

function normalizeContentIdeas(value: unknown): ContentIdeaDraft[] {
  const parsed =
    Array.isArray(value)
      ? value
      : extractArrayField(value, "ideas") ?? resolveArrayInput(value, "ideas");

  const normalized = parsed
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = typeof record.title === "string" ? record.title : `Idee ${index + 1}`;
      const description =
        typeof record.description === "string"
          ? record.description
          : typeof record.text === "string"
            ? record.text
            : "";
      const visualApproach =
        typeof record.visual_approach === "string"
          ? record.visual_approach
          : typeof record.visualApproach === "string"
            ? record.visualApproach
            : undefined;

      if (!description && !visualApproach) return null;

      return {
        title,
        description,
        visual_approach: visualApproach
      };
    })
    .filter((item): item is ContentIdeaDraft => item !== null);

  return normalized;
}

function normalizeInstagramPosts(value: unknown): InstagramPostPayload[] {
  const parsed =
    Array.isArray(value)
      ? value
      : extractArrayField(value, "posts") ?? resolveArrayInput(value, "posts");

  const normalized = parsed
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const hook = typeof record.hook === "string" ? record.hook : "";
      const caption = typeof record.caption === "string" ? record.caption : "";
      const facts = typeof record.facts === "string" ? record.facts : undefined;
      const hashtags = typeof record.hashtags === "string" ? record.hashtags : undefined;

      if (!hook && !caption) return null;

      return { hook, caption, facts, hashtags };
    })
    .filter((item): item is InstagramPostPayload => item !== null);

  return normalized;
}

const initialFormState: FormState = {
  topic: "",
  target_audience: "",
  tonality: "informativ"
};

function parseInstagramPosts(input?: string): InstagramPostDraft[] {
  if (!input) return [];

  const markers = ["POST 1:", "POST 2:", "POST 3:"];
  const posts: InstagramPostDraft[] = [];

  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const start = input.indexOf(marker);
    if (start === -1) continue;

    const end = markers
      .slice(index + 1)
      .map((next) => input.indexOf(next, start + marker.length))
      .filter((position) => position !== -1)
      .sort((a, b) => a - b)[0];

    const chunk = input.slice(start + marker.length, end === undefined ? input.length : end).trim();
    const [bodyPart, hashtagsPart] = chunk.split(/Hashtags:\s*/i);
    posts.push({
      title: `Vorschlag ${index + 1}`,
      body: bodyPart.trim(),
      hashtags: hashtagsPart?.trim()
    });
  }

  return posts;
}

function InstagramMockup({
  post,
  title
}: Readonly<{
  post: InstagramPostDraft;
  title: string;
}>) {
  return (
    <article className="mx-auto w-full max-w-[460px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0f17] shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0f1624] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-fuchsia-400 via-pink-400 to-amber-200 p-[2px]">
            <div className="h-full w-full rounded-full bg-[#101827]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">TrendLens</p>
            <p className="text-xs text-slate-400">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span>•••</span>
        </div>
      </div>

      <div className="p-4">
        <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-gradient-to-br from-slate-900 via-[#111827] to-[#050816]">
          <div className="bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.04),_transparent_100%)] p-5">
            <div className="flex min-h-[520px] flex-col rounded-[1.4rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="space-y-2">
                <div className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-200">
                  Instagram Draft
                </div>
                <h4 className="text-2xl font-semibold leading-tight text-white">{title}</h4>
              </div>

              <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
                <div className="min-h-0 flex-1 overflow-hidden rounded-[1.3rem] border border-white/10 bg-black/20 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-100">{post.body}</p>
                  {post.hashtags && (
                    <p className="mt-4 text-xs leading-5 text-sky-100/80">{post.hashtags}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 bg-[#0f1624] px-4 py-3 text-slate-300">
            <span>♥ 1.2k</span>
            <span>💬 48</span>
            <span>↗︎</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ContentGenerator() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [copiedField, setCopiedField] = useState<"instagram_content" | "visual_ideas" | null>(null);
  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState(0);
  const loadingStartedAtRef = useRef<number | null>(null);

  const trendAnalysis =
    result?.trend_analysis ?? result?.nodeOutputs?.["Analyze Trends"] ?? "";
  const contentIdeas = normalizeContentIdeas(
    result?.items ??
      result?.nodeOutputs?.["Parse Content Ideas"] ??
      result?.nodeOutputs?.["Generate Content Ideas"] ??
      result?.content_ideas ??
      result?.raw_response
  );
  const instagramPostsData = normalizeInstagramPosts(
    result?.items ??
      result?.nodeOutputs?.["Parse Instagram Posts"] ??
      result?.nodeOutputs?.["Create Instagram Posts"] ??
      result?.instagram_posts ??
      result?.instagram_content ??
      result?.raw_response
  );
  const instagramPosts =
    instagramPostsData.length > 0
      ? instagramPostsData.map((post, index) => ({
          title: `Vorschlag ${index + 1}`,
          body: [post.caption, post.facts].filter(Boolean).join("\n\n"),
          hashtags: post.hashtags
        }))
      : parseInstagramPosts(result?.instagram_posts ?? result?.instagram_content);
  const selectedInstagramPost =
    instagramPosts[selectedIdeaIndex] ??
    instagramPosts[0] ?? {
      title: `Vorschlag ${selectedIdeaIndex + 1}`,
      body: "",
      hashtags: undefined
    };
  const selectedContentIdea = contentIdeas[selectedIdeaIndex] ?? {
    title: `Idee ${selectedIdeaIndex + 1}`,
    description: "-",
    visual_approach: undefined
  };

  const normalizedPostBody =
    selectedInstagramPost?.body?.replace(/\n{3,}/g, "\n\n").trim() ?? "";

  useEffect(() => {
    if (!loading) {
      loadingStartedAtRef.current = null;
      setLoadingProgress(0);
      return;
    }

    if (!loadingStartedAtRef.current) {
      loadingStartedAtRef.current = Date.now();
    }

    const totalDurationMs = 3 * 60 * 1000 + 15 * 1000;
    const timer = window.setInterval(() => {
      const startedAt = loadingStartedAtRef.current ?? Date.now();
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(1, elapsed / totalDurationMs);
      setLoadingProgress(progress);
    }, 250);

    return () => window.clearInterval(timer);
  }, [loading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setCopiedField(null);
    setSelectedIdeaIndex(0);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic: form.topic,
          target_audience: form.target_audience,
          tonality: form.tonality
        })
      });

      const data = (await response.json()) as ApiResponse | ApiResponse[];

      if (!response.ok) {
        const errorData = Array.isArray(data) ? data[0] : data;
        throw new Error(errorData?.error ?? "Unbekannter Fehler beim Laden der Ergebnisse.");
      }

      setResult(Array.isArray(data) ? data[0] : data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  async function copyText(value?: string, field?: "instagram_content" | "visual_ideas") {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedField(field ?? null);
    window.setTimeout(() => setCopiedField(null), 1500);
  }

  const loadingOverlay = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-6 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#0f1624] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.4)]">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500 transition-[width] duration-200 ease-linear"
            style={{ width: `${Math.min(100, Math.max(0, loadingProgress * 100))}%` }}
          />
        </div>
        <h2 className="mt-6 text-3xl font-semibold text-white">Dein Content wird gebaut</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Das dauert meist ein paar Minuten. Fortschritt ist ungefähr.
        </p>
        <div className="mt-4 text-sm text-slate-400">
          Fortschritt: {Math.round(loadingProgress * 100)}%
        </div>
        <div className="mt-6 grid gap-3 text-sm text-slate-200">
          <div className="rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-3">
            Thema: {form.topic}
          </div>
          <div className="rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-3">
            Zielgruppe: {form.target_audience}
          </div>
          <div className="rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-3">
            Ton: {form.tonality}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.14),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(236,72,153,0.16),_transparent_28%),radial-gradient(circle_at_75%_20%,_rgba(168,85,247,0.12),_transparent_20%),linear-gradient(180deg,_rgba(9,10,16,0.96)_0%,_rgba(12,14,22,1)_100%)]" />
      {loading && loadingOverlay}
      <div className="relative mx-auto flex w-full max-w-[1560px] flex-col gap-8">
        {!result && (
          <section className="flex min-h-[calc(100vh-220px)] items-center justify-center">
            <div className="w-full max-w-2xl rounded-[2.25rem] border border-white/10 bg-[#0f1624]/85 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-pink-200/70">
                  n8n Webhook Content Generator
                </p>
                <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                  Instagram Content auf einen Klick
                </h1>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  Gib Thema, Zielgruppe und Ton ein und erhalte passende Beiträge, Ideen und
                  Visuals für deinen Instagram-Auftritt.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Thema</span>
                  <input
                    value={form.topic}
                    onChange={(e) => setForm((prev) => ({ ...prev, topic: e.target.value }))}
                    required
                    className="w-full rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-pink-400/60 focus:ring-2 focus:ring-pink-500/20"
                    placeholder="z. B. AI Trends Schweiz"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Zielgruppe</span>
                  <input
                    value={form.target_audience}
                    onChange={(e) => setForm((prev) => ({ ...prev, target_audience: e.target.value }))}
                    required
                    className="w-full rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-pink-400/60 focus:ring-2 focus:ring-pink-500/20"
                    placeholder="z. B. Studierende und junge Berufstätige"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Ton</span>
                  <select
                    value={form.tonality}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        tonality: e.target.value as FormState["tonality"]
                      }))
                    }
                    className="w-full rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-pink-400/60 focus:ring-2 focus:ring-pink-500/20"
                  >
                    <option value="informativ">informativ</option>
                    <option value="locker">locker</option>
                    <option value="provokant">provokant</option>
                    <option value="professionell">professionell</option>
                  </select>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-[1.35rem] bg-gradient-to-r from-orange-500 via-pink-500 to-violet-500 px-5 py-3.5 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Workflow läuft ..." : "Jetzt generieren"}
                </button>
              </form>
            </div>
          </section>
        )}

        {error && (
          <div className="rounded-[2rem] border border-rose-400/20 bg-rose-500/10 p-5 text-rose-100">
            {error}
          </div>
        )}

        {result && (
          <section className="space-y-8">
            <div className="rounded-[2rem] border border-white/10 bg-[#0f1624]/75 p-6 backdrop-blur">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Meta</div>
                  <div className="text-sm text-slate-300">
                    {result?.rss_source ? `RSS: ${result.rss_source}` : " "}
                  </div>
                  <div className="text-sm text-slate-300">
                    {result?.generated_at ?? "-"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Neu generieren
                </button>
              </div>
            </div>

            <div className="rounded-[2.25rem] border border-white/10 bg-[#0f1624]/90 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Trendanalyse</div>
                  <h2 className="mt-2 text-4xl font-semibold text-white">Hauptansicht</h2>
                </div>
                <div className="text-sm text-slate-400">
                  {result?.generated_at ?? "-"}
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
                  <div className="whitespace-pre-wrap text-base leading-8 text-slate-100">
                    {trendAnalysis || "-"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2.25rem] border border-white/10 bg-[#0f1624]/90 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur">
              <div className="flex flex-wrap gap-3">
                {contentIdeas.slice(0, 3).map((idea, index) => (
                  <button
                    key={idea.title || index}
                    type="button"
                    onClick={() => setSelectedIdeaIndex(index)}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                      selectedIdeaIndex === index
                        ? "bg-gradient-to-r from-orange-400 via-pink-500 to-violet-500 text-white"
                        : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    Idee {index + 1}
                  </button>
                ))}
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Content-Idee {selectedIdeaIndex + 1}
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold text-white">
                    {selectedContentIdea.title}
                  </h3>
                  <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-100">
                    {selectedContentIdea.description || "-"}
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-white/10 bg-[#0b0f17] p-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.28em] text-slate-400">
                        Instagram Preview
                      </div>
                      <div className="mt-1 text-lg font-semibold text-white">
                        Idee {selectedIdeaIndex + 1}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <InstagramMockup
                      post={{
                        ...selectedInstagramPost,
                        body: normalizedPostBody
                      }}
                      title={selectedInstagramPost.title ?? `Vorschlag ${selectedIdeaIndex + 1}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
