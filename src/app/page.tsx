"use client";

import { useState } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { RecordingIndicator } from "@/components/RecordingIndicator";
import { AgendaInput } from "@/components/AgendaInput";
import { SpeakerMap } from "@/components/SpeakerMap";
import { SummaryView } from "@/components/SummaryView";

type AppState = "idle" | "recording" | "transcribing" | "mapping" | "summarizing" | "summary-failed" | "done";

export default function Home() {
  const recorder = useAudioRecorder();
  const [agenda, setAgenda] = useState("");
  const [transcript, setTranscript] = useState("");
  const [speakers, setSpeakers] = useState<number[]>([]);
  const [speakerSamples, setSpeakerSamples] = useState<Record<number, string[]>>({});
  const [summary, setSummary] = useState("");
  const [appState, setAppState] = useState<AppState>("idle");
  const [error, setError] = useState("");

  async function handleStart() {
    setError("");
    try {
      await recorder.start();
      setAppState("recording");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to start recording. Please allow screen sharing with system audio."
      );
    }
  }

  async function handleStop() {
    recorder.stop();
  }

  async function processAudio(blob: Blob) {
    setAppState("transcribing");

    try {
      const formData = new FormData();
      formData.append("audio", blob, "meeting.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Transcription failed");
      const data = await res.json();
      setTranscript(data.transcript);
      setSpeakers(data.speakers ?? []);
      setSpeakerSamples(data.speakerSamples ?? {});

      // If speakers detected, let user map names; otherwise go straight to summarize
      if (data.speakers?.length > 1) {
        setAppState("mapping");
      } else {
        await summarize(data.transcript);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Processing failed");
      setAppState("idle");
    }
  }

  async function handleSpeakerConfirm(mapping: Record<number, string>) {
    // Replace "Speaker N" labels with names in transcript
    let mapped = transcript;
    for (const [speaker, name] of Object.entries(mapping)) {
      if (name.trim()) {
        mapped = mapped.replaceAll(`Speaker ${speaker}:`, `${name.trim()}:`);
      }
    }
    setTranscript(mapped);
    await summarize(mapped);
  }

  async function summarize(text: string) {
    setAppState("summarizing");
    setError("");
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, agenda }),
      });
      if (!res.ok) throw new Error("Summarization failed");
      const { summary: sum } = await res.json();
      setSummary(sum);
      setAppState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Summarization failed");
      setAppState("summary-failed");
    }
  }

  // Process audio when recording stops
  if (recorder.state === "stopped" && recorder.audioBlob && appState === "recording") {
    processAudio(recorder.audioBlob);
  }

  function handleNewMeeting() {
    recorder.reset();
    setAgenda("");
    setTranscript("");
    setSpeakers([]);
    setSpeakerSamples({});
    setSummary("");
    setAppState("idle");
    setError("");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          Meeting Summary
        </h1>
        <p className="mt-3 text-[var(--color-text-muted)]">
          Record your meeting and get an instant summary
        </p>
      </div>

      <div className="space-y-6">
        {/* Agenda */}
        {(appState === "idle" || appState === "recording") && (
          <AgendaInput value={agenda} onChange={setAgenda} disabled={appState === "recording"} />
        )}

        {/* Start */}
        {appState === "idle" && (
          <button
            onClick={handleStart}
            className="w-full rounded-2xl bg-[var(--color-primary)] py-4 text-lg font-semibold text-white shadow-md transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-lg active:scale-[0.98]"
          >
            Start Recording
          </button>
        )}

        {/* Recording */}
        {appState === "recording" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-[var(--color-recording)]/20 bg-[var(--color-recording)]/5 px-6 py-4">
              <RecordingIndicator duration={recorder.duration} />
            </div>
            <button
              onClick={handleStop}
              className="w-full rounded-2xl bg-[var(--color-success)] py-4 text-lg font-semibold text-white shadow-md transition-all hover:bg-[var(--color-success-hover)] hover:shadow-lg active:scale-[0.98]"
            >
              Stop Recording
            </button>
          </div>
        )}

        {/* Transcribing */}
        {appState === "transcribing" && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] py-14 shadow-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--color-primary)]/25 border-t-[var(--color-primary)]" />
            <p className="text-sm text-[var(--color-text-muted)]">Transcribing your meeting...</p>
          </div>
        )}

        {/* Speaker Mapping */}
        {appState === "mapping" && (
          <SpeakerMap
            speakers={speakers}
            speakerSamples={speakerSamples}
            onConfirm={handleSpeakerConfirm}
            onSkip={() => summarize(transcript)}
          />
        )}

        {/* Summarizing */}
        {appState === "summarizing" && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] py-14 shadow-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--color-primary)]/25 border-t-[var(--color-primary)]" />
            <p className="text-sm text-[var(--color-text-muted)]">Generating summary...</p>
          </div>
        )}

        {/* Summary failed — show transcript + retry */}
        {appState === "summary-failed" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-muted)]">Transcript</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{transcript}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => summarize(transcript)}
                className="flex-1 rounded-2xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-lg active:scale-[0.98]"
              >
                Retry Summary
              </button>
              <button
                onClick={handleNewMeeting}
                className="flex-1 rounded-2xl border border-[var(--color-border)] py-3 text-sm font-medium transition hover:bg-[var(--color-border)]/50"
              >
                New Meeting
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {appState === "done" && (
          <>
            <SummaryView summary={summary} transcript={transcript} />
            <button
              onClick={handleNewMeeting}
              className="w-full rounded-2xl border border-[var(--color-border)] py-3 text-sm font-medium transition hover:bg-[var(--color-border)]/50"
            >
              New Meeting
            </button>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
