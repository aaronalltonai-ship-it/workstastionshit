"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TaskCheckInPanel } from "@/components/TaskCheckInPanel";

const tabs = ["Lyrics", "Notes", "Audio", "References", "Rhymes"] as const;
const fontStack = "'Space Grotesk', 'Inter', system-ui, sans-serif";
const NOTION_PROJECTS_DATA_SOURCE_ID = "2c190401-24a7-8133-98f6-000bf5671524";
type NotionDb = { databaseId: string; title?: string; status: string; dataSources: { id: string; name?: string }[]; error?: string };
type NotionQueryResult = Record<string, unknown>;

const sampleProjects: { id: string; name: string; type: string }[] = [];

const referenceBanks = {
  rhymes: ["glow / flow", "fire / inspire", "sky / fly", "night / ignite", "heart / start", "wire / fire", "cold / gold"],
  wordFamilies: ["angry sun", "merciless sun", "blazing horizon", "fiery horizon"],
  alliterations: ["furious fireflies flashing", "melodic midnight murmurs", "silent stormy streets", "wild waves whispering"],
  descriptive: ["austere", "luminous", "brash", "velvet", "electric", "neon", "tactile", "gritty"],
};

const relatedWordBank: Record<string, string[]> = {
  baseball: [
    "pitcher",
    "batter",
    "home run",
    "grand slam",
    "curveball",
    "fastball",
    "bullpen",
    "dugout",
    "infield dirt",
    "outfield lights",
    "stadium roar",
    "bleachers",
    "scoreboard",
    "double play",
    "seventh-inning stretch",
    "walk-off",
  ],
  city: ["subway rush", "neon crosswalk", "high-rise", "taxi glow", "sidewalk steam", "corner bodega", "block party", "skyscraper hum"],
  ocean: ["tidal pull", "sea spray", "undertow", "coral drift", "salt air", "harbor lights", "whitecaps", "lighthouse beam"],
  love: ["heartbeat echo", "held breath", "butterflies", "late-night calls", "rose petals", "slow dance", "hand in hand", "stolen glance"],
  night: ["midnight haze", "streetlamp halo", "moonlit", "after hours", "shadowplay", "constellations", "quiet alleys"],
  fire: ["ember glow", "smolder", "spark", "kindling", "blaze", "bonfire circle", "smoke plume"],
};

const intensityOptions = ["Moderate", "Intense"];
const toneOptions = ["Positive", "Neutral", "Negative"];
const partOfSpeechOptions = ["Adjective", "Noun", "Verb", "Adverb"];
const rhymeSchemes = ["AABB", "ABAB", "ABCB", "Freeform"];

export default function MasterWriterPage() {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("Lyrics");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [draft, setDraft] = useState(
    "Start drafting your lyric, poem, or script here. Tap into the reference tools on the right."
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [intensity, setIntensity] = useState(intensityOptions[0]);
  const [tone, setTone] = useState(toneOptions[0]);
  const [partOfSpeech, setPartOfSpeech] = useState(partOfSpeechOptions[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<string[]>([]);
  const [selectedScheme, setSelectedScheme] = useState(rhymeSchemes[0]);
  const [rhymeSuggestions, setRhymeSuggestions] = useState<string[]>(referenceBanks.rhymes);
  const [rhymePrompt, setRhymePrompt] = useState("late night city lights");     
  const [permissionError, setPermissionError] = useState("");
  const [relatedInput, setRelatedInput] = useState("baseball");
  const [hydrated, setHydrated] = useState(false);
  const [notionSources, setNotionSources] = useState<NotionDb[]>([]);
  const [notionSourcesLoading, setNotionSourcesLoading] = useState(false);
  const [notionSourcesError, setNotionSourcesError] = useState<string | null>(null);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string | null>(null);
  const [notionResults, setNotionResults] = useState<NotionQueryResult[]>([]);
  const [notionResultsLoading, setNotionResultsLoading] = useState(false);
  const [notionResultsError, setNotionResultsError] = useState<string | null>(null);
  const [aiRelated, setAiRelated] = useState<string[]>([]);
  const [aiRelatedLoading, setAiRelatedLoading] = useState(false);
  const [aiRelatedError, setAiRelatedError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [aiStatus, setAiStatus] = useState<Record<string, { loading: boolean; error: string | null }>>({});

  const cleanDataSourceId = (id?: string | null) => {
    if (!id) return null;
    const match = id.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    return match?.[0] || null;
  };

  const renderNotionTitle = (item: NotionQueryResult) => {
    const props = (item as { properties?: Record<string, unknown> })?.properties as
      | { Name?: { title?: { plain_text?: string }[] }; Title?: { title?: { plain_text?: string }[] } }
      | undefined;
    const nameTitle =
      props?.Name?.title?.map((t) => t?.plain_text).filter(Boolean).join(" ").trim() ||
      props?.Title?.title?.map((t) => t?.plain_text).filter(Boolean).join(" ").trim();
    const plainTitle =
      (item as { title?: { plain_text?: string }[] })?.title?.map((t) => t?.plain_text).filter(Boolean).join(" ").trim();
    const fallback = (item as { id?: string })?.id;
    return nameTitle || plainTitle || fallback || "Untitled";
  };
  const notionProjects = useMemo(() => {
    if (notionResults.length) {
      return notionResults.map((item, idx) => {
        const id = (item as { id?: string })?.id || `notion-${idx}`;
        const title = renderNotionTitle(item);
        const type =
          ((item as { properties?: Record<string, unknown> })?.properties as {
            Status?: { select?: { name?: string } };
          } | undefined)?.Status?.select?.name || "Notion project";
        return { id, name: title, type };
      });
    }
    const flattened = notionSources.flatMap((db) => db.dataSources || []);
    return flattened.map((ds) => ({
      id: ds.id || `ds-${Math.random().toString(36).slice(2, 8)}`,
      name: ds.name || "Data source",
      type: "Notion project",
    }));
  }, [notionResults, notionSources, renderNotionTitle]);

  useEffect(() => {
    if (!activeProjectId && notionProjects.length) {
      setActiveProjectId(notionProjects[0].id);
    }
  }, [activeProjectId, notionProjects]);

  const wordCount = useMemo(() => draft.trim().split(/\s+/).filter(Boolean).length, [draft]);
  const activeProject = notionProjects.find((project) => project.id === activeProjectId) || null;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Hydrate text inputs from localStorage so the draft and related finder persist across reloads.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedDraft = localStorage.getItem("mw_draft");
    if (savedDraft !== null) setDraft(savedDraft);
    const savedRelated = localStorage.getItem("mw_related_input");
    if (savedRelated !== null) setRelatedInput(savedRelated);
    const savedNotes = localStorage.getItem("mw_notes");
    if (savedNotes !== null) setNotes(savedNotes);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    localStorage.setItem("mw_draft", draft);
  }, [draft, hydrated]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    localStorage.setItem("mw_related_input", relatedInput);
  }, [relatedInput, hydrated]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    localStorage.setItem("mw_notes", notes);
  }, [notes, hydrated]);

  useEffect(() => {
    const loadNotionSources = async () => {
      try {
        setNotionSourcesError(null);
        setNotionSourcesLoading(true);
        const res = await fetch("/api/notion/databases", { cache: "no-store" });
        if (!res.ok) throw new Error(`Notion sources failed (${res.status})`);
        const data = (await res.json()) as { results?: NotionDb[] };
        const results = Array.isArray(data?.results) ? data.results : [];
        setNotionSources(results);
        const flattened = results.flatMap((db) => db.dataSources || []);
        const valid = flattened
          .map((ds) => ({ ...ds, id: cleanDataSourceId(ds.id) }))
          .filter((ds) => ds.id);
        const preferred = valid.find((ds) => ds.id === NOTION_PROJECTS_DATA_SOURCE_ID);
        const first = preferred || valid[0];
        setSelectedDataSourceId((prev) => prev || first?.id || null);
      } catch (error) {
        setNotionSourcesError(error instanceof Error ? error.message : "Failed to load Notion sources");
      } finally {
        setNotionSourcesLoading(false);
      }
    };
    void loadNotionSources();
  }, []);

  useEffect(() => {
    const loadDataSource = async (dataSourceId: string) => {
      try {
        setNotionResultsError(null);
        setNotionResultsLoading(true);
        const res = await fetch("/api/notion/data-sources/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataSourceId }),
        });
        if (!res.ok) {
          const detail = await res.text();
          throw new Error(detail || `Query failed (${res.status})`);
        }
        const data = (await res.json()) as { results?: NotionQueryResult[] };
        setNotionResults(Array.isArray(data?.results) ? data.results : []);
      } catch (error) {
        setNotionResultsError(error instanceof Error ? error.message : "Failed to load Notion data");
        setNotionResults([]);
      } finally {
        setNotionResultsLoading(false);
      }
    };
    if (cleanDataSourceId(selectedDataSourceId)) {
      void loadDataSource(cleanDataSourceId(selectedDataSourceId)!);
    }
  }, [selectedDataSourceId, cleanDataSourceId]);

  const handleRecordingToggle = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsRecording(false);
      return;
    }

    try {
      setPermissionError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      mediaRecorder.addEventListener("stop", () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordings((prev) => [url, ...prev]);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      });

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setPermissionError("Microphone access denied or unavailable.");
    }
  };

  async function aiImprove(field: string, current: string, setter: (text: string) => void, instructions: string) {
    const value = current.trim();
    const ctx = `Tone: ${tone}. Intensity: ${intensity}. POS: ${partOfSpeech}. Related: ${relatedInput}. Project: ${activeProject?.name || "N/A"}.`;
    setAiStatus((prev) => ({ ...prev, [field]: { loading: true, error: null } }));
    try {
      const res = await fetch("/api/groq-compound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${instructions}\nCurrent text: ${value || "(empty)"}\nContext: ${ctx}\nReturn improved text only, no quotes.`,
          model: "groq/compound",
          temperature: 0.45,
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `AI request failed (${res.status})`);
      }
      const data = (await res.json()) as { output?: string };
      const improved = (data?.output || "").trim().replace(/^"+|"+$/g, "");
      if (improved) setter(improved);
      else throw new Error("No text returned");
    } catch (error) {
      setAiStatus((prev) => ({
        ...prev,
        [field]: { loading: false, error: error instanceof Error ? error.message : "AI request failed" },
      }));
      return;
    }
    setAiStatus((prev) => ({ ...prev, [field]: { loading: false, error: null } }));
  }

  const filteredReferences = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return referenceBanks;
    return {
      rhymes: referenceBanks.rhymes.filter((item) => item.toLowerCase().includes(term)),
      wordFamilies: referenceBanks.wordFamilies.filter((item) => item.toLowerCase().includes(term)),
      alliterations: referenceBanks.alliterations.filter((item) => item.toLowerCase().includes(term)),
      descriptive: referenceBanks.descriptive.filter((item) => item.toLowerCase().includes(term)),
    };
  }, [searchTerm]);

  const relatedSuggestions = useMemo(() => {
    const term = relatedInput.trim().toLowerCase();
    if (!term) return [];

    if (relatedWordBank[term]) return relatedWordBank[term];

    const fuzzy = Object.entries(relatedWordBank)
      .filter(([key]) => key.includes(term))
      .flatMap(([, words]) => words);
    if (fuzzy.length) return Array.from(new Set(fuzzy));

    return [
      `${relatedInput} vibe`,
      `${relatedInput} metaphor`,
      "momentum",
      "rhythm",
      "spark",
      "echo",
      "backdrop",
      "motif",
    ];
  }, [relatedInput]);

  const notionDataSources = useMemo(() => {
    const map = new Map<string, { id: string; name?: string; databaseTitle?: string }>();
    notionSources.forEach((db) => {
      db.dataSources?.forEach((ds) => {
        const cleanId = cleanDataSourceId(ds.id);
        if (cleanId && !map.has(cleanId)) {
          map.set(cleanId, { id: cleanId, name: ds.name, databaseTitle: db.title });
        }
      });
    });
    return Array.from(map.values());
  }, [notionSources, cleanDataSourceId]);

  const showSection = (allowed: typeof tabs[number][]) => allowed.includes(activeTab);

  async function fetchAiRelated() {
    const term = relatedInput.trim();
    if (!term) {
      setAiRelatedError("Enter a word first.");
      return;
    }
    setAiRelatedError(null);
    setAiRelatedLoading(true);
    try {
      const res = await fetch("/api/groq-compound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Return 12 concise related words or short phrases for the concept "${term}". Output a comma-separated list only.`,
          model: "groq/compound",
          temperature: 0.35,
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `Groq request failed (${res.status})`);
      }
      const data = (await res.json()) as { output?: string };
      const parts = data?.output
        ?.split(/,|\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);
      setAiRelated(parts && parts.length ? parts : [`No AI results for "${term}"`]);
    } catch (error) {
      setAiRelated([]);
      setAiRelatedError(error instanceof Error ? error.message : "AI lookup failed");
    } finally {
      setAiRelatedLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white" style={{ fontFamily: fontStack }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/60 px-6 py-4 shadow-2xl">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">MasterWriter cockpit</p>
            <h1 className="text-3xl font-semibold tracking-tight">Creative workspace</h1>
            <p className="text-sm text-slate-300">
              Tabs keep lyrics, notes, audio, and references separate while the workspace syncs each element.
            </p>
          </div>
            <div className="flex flex-wrap items-center gap-2">
              {tabs.map((tab) => (
                <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.3em] transition ${
                  activeTab === tab ? "border-emerald-400 text-emerald-200" : "border-white/20 text-slate-300"
                }`}
              >
                {tab}
              </button>
            ))}
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search references"
                  className="w-48 rounded-full border border-white/20 bg-white/5 px-3 py-2 text-xs text-white outline-none transition focus:border-emerald-400"
                  style={{ fontFamily: fontStack }}
                />
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                {activeProject?.type}
              </span>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[220px,1fr,320px]">
          <aside className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/50 p-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Projects</p>
              <div className="mt-2 space-y-2">
                {notionProjects.length ? (
                  notionProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setActiveProjectId(project.id)}
                      className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
                        activeProjectId === project.id
                          ? "border-emerald-400 bg-emerald-500/10 text-white"
                          : "border-white/10 text-slate-200 hover:border-white/40"
                      }`}
                    >
                      <p className="font-semibold">{project.name}</p>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{project.type}</p>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No Notion projects found.</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] text-slate-300">
              <p className="font-semibold">Quick tips</p>
              <p className="text-xs text-slate-400">
                Use the tabs to toggle contexts and keep reference lookups to the right while drafting centrally.
              </p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.35em] text-emerald-300">
                Cross device ready
              </p>
            </div>
          </aside>

          <main className="flex flex-col gap-4">
            <div className={`rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/70 to-slate-950/90 p-5 shadow-2xl ${showSection(["Lyrics"]) ? "" : "hidden"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Writing space</p>
                  <p className="text-base text-slate-300">Central editor for lyrics, scripts, or prose.</p>
                </div>
                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
                  <span>{wordCount} words</span>
                  <span>Tone: {tone}</span>
                </div>
              </div>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-cyan-400/30 bg-slate-950/80 p-4 shadow-xl">
                  <p className="text-[10px] uppercase tracking-[0.4em] text-white/70">Inputs</p>
                  <p className="text-xs text-slate-300">Compose, adjust tone, and tweak intensity here.</p>
                  <div className="mt-3 flex items-start gap-2">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      className="h-64 w-full resize-none rounded-2xl border border-white/15 bg-slate-950/80 p-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                      style={{ fontFamily: fontStack }}
                    />
                    <button
                      aria-label="AI improve draft"
                      onClick={() => void aiImprove("draft", draft, setDraft, "Improve this creative draft while keeping voice concise and usable.")}
                      className="mt-1 h-9 w-9 shrink-0 rounded-full border border-emerald-400/60 bg-emerald-500/10 text-[11px] uppercase tracking-[0.2em] text-emerald-100 hover:border-emerald-300"
                    >
                      AI
                    </button>
                  </div>
                  {aiStatus.draft?.error ? <p className="mt-1 text-[11px] text-rose-300">{aiStatus.draft.error}</p> : null}
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.3em] text-slate-300">
                  <select
                    value={intensity}
                    onChange={(event) => setIntensity(event.target.value)}
                    className="rounded-full border border-white/30 bg-slate-900/60 px-3 py-2 text-white"
                    style={{ fontFamily: fontStack }}
                  >
                    {intensityOptions.map((option) => (
                      <option key={option} value={option}>
                        Intensity: {option}
                      </option>
                    ))}
                  </select>
                  <select
                    value={tone}
                    onChange={(event) => setTone(event.target.value)}
                    className="rounded-full border border-white/30 bg-slate-900/60 px-3 py-2 text-white"
                    style={{ fontFamily: fontStack }}
                  >
                    {toneOptions.map((option) => (
                      <option key={option} value={option}>
                        Tone: {option}
                      </option>
                    ))}
                  </select>
                  <select
                    value={partOfSpeech}
                    onChange={(event) => setPartOfSpeech(event.target.value)}
                    className="rounded-full border border-white/30 bg-slate-900/60 px-3 py-2 text-white"
                    style={{ fontFamily: fontStack }}
                  >
                    {partOfSpeechOptions.map((option) => (
                      <option key={option} value={option}>
                        POS: {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/5 p-4">
                  <p className="text-[10px] uppercase tracking-[0.4em] text-slate-200">Outputs</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-slate-950/80 p-3 text-sm text-slate-100">
                      <p className="text-[11px] text-slate-400">Word Count</p>
                      <p className="text-xl font-semibold text-white">{wordCount}</p>
                      <p className="text-[11px] text-slate-500">Highlights pacing for the current draft.</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-950/80 p-3 text-sm text-slate-100">
                      <p className="text-[11px] text-slate-400">Tone & Intensity</p>
                      <p className="text-xl font-semibold text-white">
                        {tone} · {intensity}
                      </p>
                      <p className="text-[11px] text-slate-500">Signals the creative mood you&rsquo;re dialing in.</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-950/80 p-3 text-sm text-slate-100">
                      <p className="text-[11px] text-slate-400">Project Focus</p>
                      <p className="text-xl font-semibold text-white">{activeProject?.name}</p>
                      <p className="text-[11px] text-slate-500">Switch projects to refresh context instantly.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`grid gap-4 md:grid-cols-2 ${showSection(["Notes"]) ? "" : "hidden"}`}>
              <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/5 to-slate-900/70 p-4 text-sm shadow-xl">
                <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Notes panel</p>
                <p className="mt-2 text-slate-300">
                  Capture analog ideas and quickly pin them to the current project while you stay in the lyrics tab.
                </p>
                <div className="mt-3 flex items-start gap-2">
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Add quick notes..."
                    className="h-24 w-full resize-none rounded-2xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                    style={{ fontFamily: fontStack }}
                  />
                  <button
                    aria-label="AI improve notes"
                    onClick={() => void aiImprove("notes", notes, setNotes, "Refine these creative notes. Keep them brief and actionable.")}
                    className="mt-1 h-9 w-9 shrink-0 rounded-full border border-emerald-400/60 bg-emerald-500/10 text-[11px] uppercase tracking-[0.2em] text-emerald-100 hover:border-emerald-300"
                  >
                    AI
                  </button>
                </div>
                {aiStatus.notes?.error ? <p className="mt-1 text-[11px] text-rose-300">{aiStatus.notes.error}</p> : null}
              </div>
              <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 to-slate-900/70 p-4 text-sm shadow-lg">
                <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Project context</p>
                <p className="mt-2 text-slate-300">Reference the active project without leaving the editor.</p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-slate-400">
                    <span>Project</span>
                    <span>Status</span>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-white">
                    <p className="font-semibold">{activeProject?.name}</p>
                    <p className="text-[11px] text-slate-300">{activeProject?.type} focus</p>
                  </div>
                </div>
              </div>
            </div>
          </main>

          <section className={`space-y-4 rounded-3xl border border-white/10 bg-slate-900/70 p-4 ${showSection(["Lyrics", "References", "Rhymes"]) ? "" : "hidden"}`}>
            <div>
              <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Reference tools</p>
              <p className="text-xs text-slate-300">Instant lookups for rhymes, synonym families, and descriptors.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Notion sources</p>
                  <p className="text-xs text-slate-300">Databases and data sources available to this workspace.</p>
                </div>
                {notionSourcesLoading ? <span className="text-[11px] text-slate-400">Loading…</span> : null}
                {notionSourcesError ? <span className="text-[11px] text-rose-300">{notionSourcesError}</span> : null}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {notionSources.map((db) => (
                  <div key={db.databaseId} className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{db.title || "Untitled DB"}</p>
                        <p className="text-[11px] text-slate-400">{db.databaseId}</p>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                          db.status === "ok"
                            ? "border-emerald-300/60 bg-emerald-500/10 text-emerald-100"
                            : "border-rose-300/60 bg-rose-500/10 text-rose-100"
                        }`}
                      >
                        {db.status}
                      </span>
                    </div>
                    {db.dataSources?.length ? (
                      <ul className="mt-2 space-y-1">
                        {db.dataSources.map((ds) => (
                          <li key={ds.id} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-100">
                            {ds.name || "Data source"} · {ds.id}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-[11px] text-slate-400">No data sources.</p>
                    )}
                  </div>
                ))}
                {!notionSourcesLoading && !notionSources.length && !notionSourcesError ? (
                  <p className="text-[11px] text-slate-400">No Notion sources found.</p>
                ) : null}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-3">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-200">Related word finder</p>
                  <p className="text-xs text-slate-200">Type any concept to surface connected terms and images.</p>
                </div>
                <input
                  value={relatedInput}
                  onChange={(event) => setRelatedInput(event.target.value)}
                  placeholder="e.g., baseball"
                  className="ml-auto w-40 rounded-full border border-white/20 bg-white/5 px-3 py-2 text-xs text-white outline-none transition focus:border-emerald-300"
                  style={{ fontFamily: fontStack }}
                />
                <button
                  onClick={() => void fetchAiRelated()}
                  className="rounded-full border border-white/20 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.24em] text-emerald-100 transition hover:border-emerald-300"
                >
                  AI boost
                </button>
                <button
                  aria-label="AI improve related term"
                  onClick={() => void aiImprove("relatedInput", relatedInput, setRelatedInput, "Improve or suggest a sharper root word for related-word lookups. Keep it short.")}
                  className="h-9 w-9 shrink-0 rounded-full border border-emerald-400/60 bg-emerald-500/10 text-[11px] uppercase tracking-[0.2em] text-emerald-100 hover:border-emerald-300"
                >
                  AI
                </button>
              </div>
              <ul className="mt-2 grid gap-1 text-white/90 sm:grid-cols-2">
                {(relatedSuggestions.length ? relatedSuggestions : ["No matches yet"]).map((entry) => (
                  <li key={entry} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px]" style={{ fontFamily: fontStack }}>
                    {entry}
                  </li>
                ))}
              </ul>
              <div className="mt-3 rounded-2xl border border-cyan-400/40 bg-cyan-500/10 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200">AI-related</p>
                  {aiRelatedLoading ? <span className="text-[11px] text-slate-300">Loading…</span> : null}
                </div>
                {aiRelatedError ? <p className="mt-1 text-[11px] text-rose-300">{aiRelatedError}</p> : null}
                <ul className="mt-2 grid gap-1 text-white/90 sm:grid-cols-2">
                  {(aiRelated.length ? aiRelated : ["No AI results yet"]).map((entry) => (
                    <li key={entry} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[13px]" style={{ fontFamily: fontStack }}>
                      {entry}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="rounded-2xl border border-cyan-400/40 bg-gradient-to-b from-cyan-500/10 to-slate-950/70 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-200">Notion projects</p>
                  <p className="text-xs text-slate-200">Pick a data source and pull projects/pages directly.</p>
                </div>
                <select
                  value={selectedDataSourceId ?? ""}
                  onChange={(event) => setSelectedDataSourceId(event.target.value || null)}
                  className="ml-auto min-w-[180px] rounded-full border border-white/20 bg-white/5 px-3 py-2 text-xs text-white outline-none transition focus:border-cyan-300"
                  style={{ fontFamily: fontStack }}
                >
                  <option value="">Select data source</option>
                  {notionDataSources.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {(ds.name || "Data source") + (ds.databaseTitle ? ` · ${ds.databaseTitle}` : "")}
                    </option>
                  ))}
                </select>
              </div>
              {notionResultsLoading ? <p className="mt-2 text-xs text-slate-300">Loading Notion data…</p> : null}
              {notionResultsError ? <p className="mt-2 text-xs text-rose-300">{notionResultsError}</p> : null}
              {!notionResultsLoading && !notionResultsError && selectedDataSourceId ? (
                notionResults.length ? (
                  <ul className="mt-3 space-y-2">
                    {notionResults.map((item) => (
                      <li key={(item as { id?: string })?.id || renderNotionTitle(item)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-slate-100">
                        <p className="font-semibold">{renderNotionTitle(item)}</p>
                        <p className="text-[11px] text-slate-400">{(item as { id?: string })?.id || "No ID"}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-300">No results returned for this data source.</p>
                )
              ) : null}
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-slate-950/70 p-3">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Rhyming dictionary</p>
              <ul className="mt-2 space-y-1 text-white/90">
                {(filteredReferences.rhymes.length ? filteredReferences.rhymes : ["No matches yet"]).map((entry) => (
                    <li key={entry} className="text-[13px]" style={{ fontFamily: fontStack }}>
                      {entry}
                    </li>
                  ))}
                </ul>
                </div>
              <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-b from-amber-500/10 to-slate-950/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Word families</p>
                <ul className="mt-2 space-y-1 text-white/90">
                  {(filteredReferences.wordFamilies.length ? filteredReferences.wordFamilies : ["No matches yet"]).map((entry) => (
                    <li key={entry} className="text-[13px]" style={{ fontFamily: fontStack }}>
                      {entry}
                    </li>
                  ))}
                </ul>
                </div>
              <div className="rounded-2xl border border-fuchsia-400/40 bg-gradient-to-b from-fuchsia-500/10 to-slate-950/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Alliteration finder</p>
                <ul className="mt-2 space-y-1 text-white/90">
                  {(filteredReferences.alliterations.length ? filteredReferences.alliterations : ["No matches yet"]).map((entry) => (
                    <li key={entry} className="text-[13px]" style={{ fontFamily: fontStack }}>
                      {entry}
                    </li>
                  ))}
                </ul>
                </div>
              <div className="rounded-2xl border border-emerald-400/40 bg-gradient-to-b from-emerald-500/10 to-slate-950/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Descriptive word bank</p>
                <ul className="mt-2 space-y-1 text-white/90">
                  {(filteredReferences.descriptive.length ? filteredReferences.descriptive : ["No matches yet"]).map((entry) => (
                    <li key={entry} className="text-[13px]" style={{ fontFamily: fontStack }}>
                      {entry}
                    </li>
                  ))}
                </ul>
                </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Filters</p>
              <p className="text-[11px] text-slate-200">
                Use intensity, tone, and part of speech selectors to tune the suggestions above.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/15 bg-slate-900/70 px-3 py-1 text-xs text-white">
                  Intensity: {intensity}
                </span>
                <span className="rounded-full border border-white/15 bg-slate-900/70 px-3 py-1 text-xs text-white">
                  Tone: {tone}
                </span>
                <span className="rounded-full border border-white/15 bg-slate-900/70 px-3 py-1 text-xs text-white">
                  POS: {partOfSpeech}
                </span>
              </div>
            </div>
          </section>
        </div>

        <TaskCheckInPanel />

        <footer className={`rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950/80 p-4 shadow-2xl ${showSection(["Audio"]) ? "" : "hidden"}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Audio recorder</p>
              <p className="text-sm text-slate-300">Capture melody ideas or spoken notes without leaving the workspace.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleRecordingToggle}
                className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.3em] transition ${
                  isRecording ? "border-rose-400 text-rose-200" : "border-emerald-400 text-emerald-200"
                }`}
                style={{ fontFamily: fontStack }}
              >
                {isRecording ? "Stop recording" : "Start recording"}
              </button>
              <span className="text-[11px] text-slate-400">{isRecording ? "Recording…" : "Ready"}</span>
            </div>
          </div>
          {permissionError && <p className="mt-2 text-[11px] text-rose-300">{permissionError}</p>}
          {!!recordings.length && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {recordings.map((url, index) => (
                <div key={url} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Recording {recordings.length - index}</p>
                  <audio controls src={url} className="mt-2 w-full" />
                </div>
              ))}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
