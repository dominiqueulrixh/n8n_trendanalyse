"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

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

function extractImageUrl(value: unknown): string | undefined {
  if (!value) return undefined;

  if (typeof value === "string") {
    const directMatch = value.match(/https?:\/\/[^\s"'<>]+/i);
    if (directMatch) return directMatch[0];

    const dataMatch = value.match(/data:image\/[a-zA-Z+.-]+;base64,[A-Za-z0-9+/=]+/);
    if (dataMatch) return dataMatch[0];

    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const extracted = extractImageUrl(item);
      if (extracted) return extracted;
    }
    return undefined;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["image_url", "imageUrl", "url", "link", "src", "data", "body", "content"]) {
      const extracted = extractImageUrl(record[key]);
      if (extracted) return extracted;
    }
  }

  return undefined;
}

const initialFormState: FormState = {
  topic: "AI Trends Schweiz",
  target_audience: "Studierende und junge Berufstätige",
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
          <span className="text-[10px] uppercase tracking-[0.25em]">Live</span>
          <span>•••</span>
        </div>
      </div>

      <div className="p-4">
        <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-gradient-to-br from-slate-900 via-[#111827] to-[#050816]">
          <div className="flex items-center justify-between px-4 py-3 text-[11px] text-slate-400">
            <span>9:41</span>
            <span>•••</span>
          </div>
          <div className="aspect-[4/5] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.04),_transparent_100%)] p-5">
            <div className="flex h-full flex-col justify-between rounded-[1.4rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="space-y-3">
                <div className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-200">
                  Instagram Draft
                </div>
                <h4 className="text-2xl font-semibold leading-tight text-white">{title}</h4>
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.3rem] border border-white/10 bg-black/20 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-100">{post.body}</p>
                </div>
                {post.hashtags && (
                  <p className="text-xs leading-5 text-sky-100/80">{post.hashtags}</p>
                )}
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
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [copiedField, setCopiedField] = useState<"instagram_content" | "visual_ideas" | null>(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState(0);

  const statusMessages = [
    "Anfrage wird an n8n gesendet ...",
    "RSS-Feeds werden verarbeitet ...",
    "Trends werden analysiert ...",
    "Content-Ideen werden erzeugt ...",
    "Instagram-Posts werden formuliert ...",
    "Bild-Prompts werden erstellt ...",
    "Antwort wird vorbereitet ..."
  ];

  const trendAnalysis =
    result?.trend_analysis ?? result?.nodeOutputs?.["Analyze Trends"] ?? "";
  const contentIdeas =
    result?.content_ideas ?? result?.nodeOutputs?.["Generate Content Ideas"] ?? "";
  const instagramSource =
    result?.instagram_posts ??
    result?.instagram_content ??
    result?.nodeOutputs?.["Create Instagram Posts"] ??
    (result?.raw_response as string | undefined);
  const visualIdeas =
    result?.visual_ideas ?? result?.image_prompts ?? result?.nodeOutputs?.["Generate Image Prompts"] ?? "";
  const instagramPosts = parseInstagramPosts(instagramSource);
  const selectedInstagramPost = instagramPosts[selectedPostIndex] ?? instagramPosts[0];
  const extractedImageUrl =
    result?.image_url ??
    extractImageUrl(result?.nodeOutputs?.["Generate Images"]) ??
    extractImageUrl(result?.items) ??
    extractImageUrl(result?.raw_response) ??
    extractImageUrl(result?.nodeOutputs?.["Format Final Output"]);
  const ideas = [
    {
      title: "Idee 1",
      subtitle: "Deepfakes erkennen",
      accent: "from-rose-500/30 to-orange-400/10"
    },
    {
      title: "Idee 2",
      subtitle: "KI am Smartphone",
      accent: "from-sky-500/30 to-cyan-400/10"
    },
    {
      title: "Idee 3",
      subtitle: "Schutz gegen Scams",
      accent: "from-emerald-500/30 to-teal-400/10"
    }
  ];
  const selectedIdea = ideas[selectedIdeaIndex] ?? ideas[0];

  const normalizedPostBody =
    selectedInstagramPost?.body?.replace(/\n{3,}/g, "\n\n").trim() ?? "";

  useEffect(() => {
    if (!loading) {
      setStatusIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % statusMessages.length);
    }, 4500);

    return () => window.clearInterval(interval);
  }, [loading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setCopiedField(null);
    setSelectedPostIndex(0);

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

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Unbekannter Fehler beim Laden der Ergebnisse.");
      }

      setResult(data);
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

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_24%),linear-gradient(180deg,_rgba(2,6,23,0.9)_0%,_rgba(3,7,18,1)_100%)]" />
      <div className="relative mx-auto flex w-full max-w-[1680px] flex-col gap-6">
        <header className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-glow backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/70">
              n8n Webhook Content Generator
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              Instagram Content, wie ein Produkt gebaut
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              Links steuerst du Thema, Zielgruppe und Ton. Rechts bekommst du eine breite
              Ergebnisfläche mit Trendanalyse, Content-Ideen, einem echten Instagram-Mockup
              für alle 3 Vorschläge und den Bild-Prompts.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Input", value: "3 Felder" },
                { label: "Output", value: "3 Ideen" },
                { label: "Flow", value: "n8n Webhook" }
              ].map((item) => (
                <div key={item.label} className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-400">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
              Während der Ausführung zeigt die UI einen Status-Stream. Wenn n8n antwortet,
              werden die drei Vorschläge als einzelne Slides dargestellt.
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-6 xl:self-start">
            <form
              onSubmit={handleSubmit}
              className="rounded-[2rem] border border-white/10 bg-[#0f1624]/80 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur"
            >
              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Thema</span>
                  <input
                    value={form.topic}
                    onChange={(e) => setForm((prev) => ({ ...prev, topic: e.target.value }))}
                    required
                    className="w-full rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-500/20"
                    placeholder="AI Trends Schweiz"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Zielgruppe</span>
                  <textarea
                    value={form.target_audience}
                    onChange={(e) => setForm((prev) => ({ ...prev, target_audience: e.target.value }))}
                    required
                    rows={4}
                    className="w-full rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-500/20"
                    placeholder="Studierende und junge Berufstätige"
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
                    className="w-full rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-500/20"
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
                  className="inline-flex w-full items-center justify-center rounded-[1.35rem] bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500 px-4 py-3.5 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Workflow läuft ..." : "Jetzt generieren"}
                </button>
              </div>
            </form>

            <div className="mt-4 rounded-[2rem] border border-white/10 bg-[#0f1624]/75 p-5 text-slate-200 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Hinweis</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Die Ausgabe kommt serverseitig von n8n. Auf dieser Seite wird sie in ein lesbares,
                visuell stärkeres Layout übersetzt.
              </p>
            </div>
          </aside>

          <section className="space-y-4">
            {loading && (
              <div className="rounded-[2rem] border border-fuchsia-400/20 bg-fuchsia-500/10 p-5 text-fuchsia-100">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2.5 w-2.5 animate-pulse rounded-full bg-sky-300" />
                  <div>
                    <p className="font-medium">{statusMessages[statusIndex]}</p>
                    <p className="mt-1 text-sm text-sky-100/80">
                      Der Webhook läuft noch. Bei deinem Workflow kann das mehrere Minuten dauern.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-[2rem] border border-rose-400/20 bg-rose-500/10 p-5 text-rose-100">
                {error}
              </div>
            )}

            {result && (
              <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
                <div className="space-y-5">
                  <section className="rounded-[2rem] border border-white/10 bg-[#0f1624]/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          Trendanalyse
                        </div>
                        <h2 className="mt-2 text-2xl font-semibold text-white">
                          {selectedIdea.title}
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">{selectedIdea.subtitle}</p>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                        {selectedIdeaIndex + 1}/3
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {ideas.map((idea, index) => (
                        <button
                          key={idea.title}
                          type="button"
                          onClick={() => setSelectedIdeaIndex(index)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                            selectedIdeaIndex === index
                              ? "bg-sky-400 text-slate-950"
                              : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                          }`}
                        >
                          {idea.title}
                        </button>
                      ))}
                    </div>

                    <div className="mt-6 space-y-4">
                      <div className={`rounded-[1.75rem] border border-white/10 bg-gradient-to-br ${selectedIdea.accent} p-5`}>
                        <div className="text-xs uppercase tracking-[0.3em] text-slate-300/80">
                          Trend Analyse
                        </div>
                        <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-100">
                          {trendAnalysis || "-"}
                        </div>
                      </div>

                      <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          Content-Idee
                        </div>
                        <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-100">
                          {contentIdeas || "-"}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[2rem] border border-white/10 bg-[#0f1624]/75 p-6 backdrop-blur">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Bild & Prompt
                    </div>
                    <div className="mt-3 grid gap-4">
                      {extractedImageUrl ? (
                        <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20">
                          <img
                            src={extractedImageUrl}
                            alt="Generiertes Bild"
                            className="h-auto w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                          Kein Bild-URL gefunden. N8n liefert wahrscheinlich noch keinen direkt
                          renderbaren Bildlink in der Antwort.
                        </div>
                      )}
                      <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                        <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                          Bild-Prompt
                        </div>
                        <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-100">
                          {visualIdeas || "-"}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[2rem] border border-white/10 bg-[#0f1624]/75 p-6 backdrop-blur">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          Meta
                        </div>
                        <div className="mt-2 text-sm text-slate-300">
                          {result.generated_at ?? "-"}
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
                    {(result.rss_source || result.images_generated !== undefined) && (
                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                        {result.rss_source && <span>RSS: {result.rss_source}</span>}
                        {result.images_generated !== undefined && (
                          <span>Generierte Bilder: {result.images_generated}</span>
                        )}
                      </div>
                    )}
                  </section>
                </div>

                <div className="space-y-5">
                  <section className="rounded-[2rem] border border-white/10 bg-[#0f1624]/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          Instagram Preview
                        </div>
                        <h2 className="mt-2 text-2xl font-semibold text-white">
                          Vorschlag {selectedPostIndex + 1}
                        </h2>
                      </div>
                      <div className="text-xs text-slate-400">
                        {instagramPosts.length > 0 ? `${selectedPostIndex + 1} / ${instagramPosts.length}` : "0 / 0"}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                      {instagramPosts.map((post, index) => (
                      <button
                        key={`${post.title}-${index}`}
                        type="button"
                        onClick={() => setSelectedPostIndex(index)}
                        className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                          selectedPostIndex === index
                              ? "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white"
                              : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                        }`}
                      >
                        {post.title}
                      </button>
                      ))}
                    </div>

                    <div className="mt-5">
                      {selectedInstagramPost ? (
                        <InstagramMockup
                          post={{
                            ...selectedInstagramPost,
                            body: normalizedPostBody
                          }}
                          title={selectedInstagramPost.title}
                        />
                      ) : (
                        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 text-slate-300">
                          Kein Instagram-Post gefunden.
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          copyText(result.instagram_content ?? result.instagram_posts, "instagram_content")
                        }
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                      >
                        {copiedField === "instagram_content" ? "Kopiert" : "Caption kopieren"}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(visualIdeas, "visual_ideas")}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                      >
                        {copiedField === "visual_ideas" ? "Kopiert" : "Prompt kopieren"}
                      </button>
                    </div>
                  </section>

                  <section className="rounded-[2rem] border border-white/10 bg-[#0f1624]/75 p-6 backdrop-blur">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Rohdaten
                    </div>
                    <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-200">
                      {result.nodeOutputs
                        ? JSON.stringify(result.nodeOutputs, null, 2)
                        : result.raw_response
                          ? JSON.stringify(result.raw_response, null, 2)
                          : "-"}
                    </pre>
                  </section>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
