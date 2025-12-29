"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useMemo, useRef, useState } from "react";
import { TaskCheckInPanel } from "@/components/TaskCheckInPanel";

type ClipSource = { kind: "upload"; url: string; name: string } | { kind: "url"; url: string };
type AudioSource = { kind: "upload"; url: string; name: string } | { kind: "url"; url: string };

type BoardItem = {
  id: string;
  title: string;
  prompt: string;
  duration: string;
  tags: string;
  transition: string;
  trimStart: string;
  trimEnd: string;
  audioClipStart: string;
  audioClipEnd: string;
  clip?: ClipSource;
};

const DEFAULT_PROMPT_GUIDE =
  "Cinematic, text-to-video ready single-shot prompt with subject, action, composition, lens, camera move, lighting, and mood. Present tense, under 70 words.";

const starterItems: BoardItem[] = [
  {
    id: "scene-1",
    title: "Open",
    prompt: "Aerial shot over the city at dawn",
    duration: "0:08",
    tags: "wide, intro",
    transition: "cut",
    trimStart: "0:00",
    trimEnd: "0:08",
    audioClipStart: "0:00",
    audioClipEnd: "0:08",
  },
  {
    id: "scene-2",
    title: "Hero",
    prompt: "Close-up of protagonist stepping off the train",
    duration: "0:06",
    tags: "character, close",
    transition: "dissolve",
    trimStart: "0:00",
    trimEnd: "0:06",
    audioClipStart: "0:00",
    audioClipEnd: "0:06",
  },
];

function uid() {
  return `sb-${Math.random().toString(36).slice(2, 8)}`;
}

export default function StoryboardPage() {
  const [items, setItems] = useState<BoardItem[]>(starterItems);
  const [newTitle, setNewTitle] = useState("New beat");
  const [newPrompt, setNewPrompt] = useState("Describe the shot or action...");
  const [newDuration, setNewDuration] = useState("0:05");
  const [newTags, setNewTags] = useState("shot");
  const [newTransition, setNewTransition] = useState("cut");
  const [newTrimStart, setNewTrimStart] = useState("0:00");
  const [newTrimEnd, setNewTrimEnd] = useState("0:05");
  const [linkUrl, setLinkUrl] = useState("");
  const [audioLink, setAudioLink] = useState("");
  const [globalAudio, setGlobalAudio] = useState<AudioSource | null>(null);     
  const [exportText, setExportText] = useState("");
  const [promptGuide, setPromptGuide] = useState(DEFAULT_PROMPT_GUIDE);
  const [promptModel, setPromptModel] = useState("groq/compound");
  const [promptTemperature, setPromptTemperature] = useState(0.45);
  const [promptStatus, setPromptStatus] = useState<Record<string, { loading: boolean; error: string | null }>>({});
  const dragId = useRef<string | null>(null);

  const ordered = useMemo(() => items, [items]);

  function addItem() {
    if (!newPrompt.trim()) return;
    const item: BoardItem = {
      id: uid(),
      title: newTitle.trim() || "Untitled",
      prompt: newPrompt.trim(),
      duration: newDuration.trim() || "0:05",
      tags: newTags.trim(),
      transition: newTransition.trim() || "cut",
      trimStart: newTrimStart.trim() || "0:00",
      trimEnd: newTrimEnd.trim() || newDuration.trim() || "0:05",
      audioClipStart: "0:00",
      audioClipEnd: newDuration.trim() || "0:05",
    };
    setItems((prev) => [...prev, item]);
    setNewTitle("New beat");
    setNewPrompt("Describe the shot or action...");
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function moveItem(id: string, dir: -1 | 1) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  function onDragStart(id: string) {
    dragId.current = id;
  }
  function onDragOver(event: React.DragEvent<HTMLDivElement>, overId: string) {
    event.preventDefault();
    const from = dragId.current;
    if (!from || from === overId) return;
    setItems((prev) => {
      const fromIdx = prev.findIndex((i) => i.id === from);
      const toIdx = prev.findIndex((i) => i.id === overId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      dragId.current = overId;
      return next;
    });
  }
  function onDragEnd() {
    dragId.current = null;
  }

  function attachUrl(id: string) {
    const url = linkUrl.trim();
    if (!url) return;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, clip: { kind: "url", url } } : item)));
    setLinkUrl("");
  }

  function attachFile(id: string, file: File) {
    const url = URL.createObjectURL(file);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              clip: { kind: "upload", url, name: file.name || "upload" },
            }
          : item,
      ),
    );
  }

  function attachAudioUrl(url: string) {
    const trimmed = url.trim();
    if (!trimmed) return;
    setGlobalAudio({ kind: "url", url: trimmed });
    setAudioLink("");
  }

  function attachAudioFile(file: File) {
    const url = URL.createObjectURL(file);
    setGlobalAudio({ kind: "upload", url, name: file.name || "audio" });
  }

  function updateField(id: string, field: keyof BoardItem, value: string) {     
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  async function generatePrompt(id: string) {
    const target = items.find((item) => item.id === id);
    if (!target) return;
    const guidance = promptGuide.trim() || DEFAULT_PROMPT_GUIDE;
    const model = promptModel.trim() || "groq/compound";
    const tempValue = Number.isFinite(promptTemperature) ? Math.min(1, Math.max(0, promptTemperature)) : 0.45;
    setPromptStatus((prev) => ({ ...prev, [id]: { loading: true, error: null } }));
    try {
      const res = await fetch("/api/groq-compound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Write a single, production-ready text-to-video prompt for this storyboard beat.\nBeat title: ${target.title}\nTags: ${target.tags || "none"}\nDuration: ${target.duration}\nTransition: ${target.transition || "cut"}\nExisting notes: ${target.prompt || "none"}\nGuidance: ${guidance}\nReturn one paragraph (max 70 words) in present tense with subject, action, composition, camera movement, lens, lighting, and mood. No bullet points or quotes.`,
          temperature: tempValue,
          model,
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `Prompt request failed (${res.status})`);
      }
      const data = (await res.json()) as { output?: string };
      const generated = (data?.output || "").trim().replace(/^"+|"+$/g, "");
      if (!generated) throw new Error("AI returned no prompt.");
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, prompt: generated } : item)));
      setPromptStatus((prev) => ({ ...prev, [id]: { loading: false, error: null } }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Prompt generation failed.";
      setPromptStatus((prev) => ({ ...prev, [id]: { loading: false, error: message } }));
    }
  }

  function exportBoard() {
    const payload = {
      items,
      audio: globalAudio,
      note: "Includes clips, trims, transitions, and a single shared audio track for lip sync. Feed into your render pipeline.",
    };
    setExportText(JSON.stringify(payload, null, 2));
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Storyboard</p>
          <h1 className="text-3xl font-semibold text-white">Drag-and-drop beats, attach clips & audio</h1>
          <p className="text-sm text-slate-300">
            Build a sequence with prompts, durations, transitions, trims, and synced audio. Drag to reorder; attach video/audio;
            export JSON for rendering.
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-emerald-100">
            <a className="underline" href="/">
              Home
            </a>
            <a className="underline" href="/book">
              Book generator
            </a>
            <a className="underline" href="/masterwriter">
              Masterwriter
            </a>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">Page settings</p>
              <p className="text-sm text-slate-300">Defaults for per-beat prompt generation.</p>
            </div>
            <span className="text-[11px] text-slate-400">Applies to every "AI prompt" click.</span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Model</p>
              <input
                value={promptModel}
                onChange={(e) => setPromptModel(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                placeholder="groq/compound"
              />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Temperature</p>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={promptTemperature}
                onChange={(e) => {
                  const next = Number.parseFloat(e.target.value);
                  setPromptTemperature(Number.isFinite(next) ? next : 0);
                }}
                className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                placeholder="0.45"
              />
              <p className="mt-1 text-[11px] text-slate-400">Clamp 0-1 to dial exploration vs. determinism.</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Prompt guidance</p>
            <textarea
              value={promptGuide}
              onChange={(e) => setPromptGuide(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              rows={3}
              placeholder="Style, camera rules, and mood the AI should follow"
            />
            <p className="mt-1 text-[11px] text-slate-400">Used to steer every generated prompt; edit to change the vibe.</p>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/30 backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">Add beat</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              placeholder="Title"
            />
            <input
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              placeholder="0:05"
            />
            <input
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              placeholder="tags"
            />
            <input
              value={newTransition}
              onChange={(e) => setNewTransition(e.target.value)}
              className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              placeholder="transition (cut/dissolve)"
            />
            <button
              onClick={addItem}
              className="rounded-2xl border border-emerald-400/50 bg-emerald-500/15 px-4 py-2 text-xs uppercase tracking-[0.28em] text-emerald-100 transition hover:border-emerald-300"
            >
              Add beat
            </button>
          </div>
          <textarea
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            className="mt-3 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:border-emerald-400/60"
            rows={3}
          />
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input
              value={newTrimStart}
              onChange={(e) => setNewTrimStart(e.target.value)}
              className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              placeholder="Trim start (e.g. 0:00)"
            />
            <input
              value={newTrimEnd}
              onChange={(e) => setNewTrimEnd(e.target.value)}
              className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              placeholder="Trim end (e.g. 0:05)"
            />
            <p className="text-xs text-slate-400 self-center">Align trims with audio for lip sync.</p>
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-5 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-emerald-200">Global audio</p>
              <p className="text-sm text-slate-200">One audio bed shared across every beat. Adjust in/out per beat below.</p>
            </div>
            <input
              value={audioLink}
              onChange={(e) => setAudioLink(e.target.value)}
              placeholder="Audio URL"
              className="w-56 rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-300"
            />
            <button
              onClick={() => attachAudioUrl(audioLink)}
              className="rounded-full border border-emerald-400/60 bg-emerald-500/20 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-emerald-100"
            >
              Link audio
            </button>
            <label className="cursor-pointer rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-white transition hover:border-emerald-300/60">
              Upload audio
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) attachAudioFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {globalAudio ? (
            <div className="mt-3 space-y-1 rounded-2xl border border-white/10 bg-black/30 p-3 text-xs text-slate-200">
              <p className="uppercase tracking-[0.26em] text-slate-400">Attached audio (shared)</p>
              <audio controls src={globalAudio.url} className="w-full" />
              <p className="text-[11px] text-slate-400">
                {globalAudio.kind === "upload" ? globalAudio.name || "audio" : globalAudio.url}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-300">No audio attached yet. Add one to sync across beats.</p>
          )}
        </section>

        <section className="space-y-3 rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">Sequence</p>
            <button
              onClick={exportBoard}
              className="rounded-full border border-emerald-400/50 bg-emerald-500/15 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-emerald-100"
            >
              Export JSON
            </button>
            <span className="text-slate-400">Includes clips, trims, transitions, audio ranges.</span>
          </div>
          {exportText ? (
            <pre className="overflow-auto rounded-2xl border border-white/10 bg-black/40 p-3 text-[11px] leading-relaxed text-emerald-100">
              {exportText}
            </pre>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {ordered.map((item) => {
              const promptState = promptStatus[item.id];
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => onDragStart(item.id)}
                  onDragOver={(e) => onDragOver(e, item.id)}
                  onDragEnd={onDragEnd}
                  className="group rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-300/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] uppercase tracking-[0.28em] text-slate-400 cursor-grab">⇅</span>
                      <p className="text-lg font-semibold text-white">{item.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveItem(item.id, -1)}
                        className="rounded-full border border-white/20 px-2 text-xs text-slate-200 hover:border-emerald-300/60"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveItem(item.id, 1)}
                        className="rounded-full border border-white/20 px-2 text-xs text-slate-200 hover:border-emerald-300/60"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="rounded-full border border-rose-400/40 bg-rose-500/10 px-2 text-xs text-rose-100 hover:border-rose-300"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">{item.tags}</p>
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Prompt</p>
                      <button
                        onClick={() => void generatePrompt(item.id)}
                        disabled={promptState?.loading}
                        className="rounded-full border border-emerald-400/50 bg-emerald-500/15 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-emerald-100 disabled:opacity-60"
                      >
                        {promptState?.loading ? "Generating..." : "AI prompt"}
                      </button>
                      {promptState?.error ? <span className="text-[11px] text-rose-300">{promptState.error}</span> : null}
                    </div>
                    <textarea
                      value={item.prompt}
                      onChange={(e) => updateField(item.id, "prompt", e.target.value)}
                      className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                      rows={3}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                    <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Duration: {item.duration}</span>
                    <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Transition: {item.transition}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                    <input
                      type="text"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="Attach clip URL"
                      className="w-44 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white outline-none focus:border-emerald-400/60"
                    />
                    <button
                      onClick={() => attachUrl(item.id)}
                      className="rounded-full border border-emerald-400/50 bg-emerald-500/15 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-emerald-100"
                    >
                      Link
                    </button>
                    <label className="cursor-pointer rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white transition hover:border-emerald-300/60">
                      Upload
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) attachFile(item.id, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {item.clip ? (
                    <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-black/30 p-3">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-300">Attached clip</p>
                      <video controls src={item.clip.url} className="w-full rounded-lg border border-white/10" />
                      <p className="text-xs text-slate-400">
                        {item.clip.kind === "upload" ? item.clip.name || "upload" : item.clip.url}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-3 grid gap-2 md:grid-cols-2 text-xs text-slate-300">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Video trim</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input
                          value={item.trimStart}
                          onChange={(e) => updateField(item.id, "trimStart", e.target.value)}
                          placeholder="Start (0:00)"
                          className="w-28 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white outline-none focus:border-emerald-400/60"
                        />
                        <input
                          value={item.trimEnd}
                          onChange={(e) => updateField(item.id, "trimEnd", e.target.value)}
                          placeholder="End (0:06)"
                          className="w-28 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white outline-none focus:border-emerald-400/60"
                        />
                        <input
                          value={item.transition}
                          onChange={(e) => updateField(item.id, "transition", e.target.value)}
                          placeholder="Transition"
                          className="w-40 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white outline-none focus:border-emerald-400/60"
                        />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Audio align</p>
                      <p className="text-[11px] text-slate-300">Shared audio plays through every beat. Set per-beat in/out offsets.</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input
                          value={item.audioClipStart}
                          onChange={(e) => updateField(item.id, "audioClipStart", e.target.value)}
                          placeholder="Audio in (0:00)"
                          className="w-28 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white outline-none focus:border-emerald-400/60"
                        />
                        <input
                          value={item.audioClipEnd}
                          onChange={(e) => updateField(item.id, "audioClipEnd", e.target.value)}
                          placeholder="Audio out (0:06)"
                          className="w-28 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white outline-none focus:border-emerald-400/60"
                        />
                      </div>
                      {!globalAudio ? <p className="mt-2 text-[11px] text-amber-300">Attach a global audio above to enable playback.</p> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {ordered.length === 0 ? <p className="text-sm text-slate-400">No beats yet. Add one above.</p> : null}
        </section>

        <TaskCheckInPanel />
      </div>
    </main>
  );
}
