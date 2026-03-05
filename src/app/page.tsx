"use client";

import { useState } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { RecordingIndicator } from "@/components/RecordingIndicator";
import { AgendaInput } from "@/components/AgendaInput";
import { SummaryView } from "@/components/SummaryView";

type AppState = "idle" | "recording" | "processing" | "done";

export default function Home() {
  const recorder = useAudioRecorder();
  const [agenda, setAgenda] = useState("");
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const [appState, setAppState] = useState<AppState>("idle");
  const [processingStep, setProcessingStep] = useState("");
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
    setAppState("processing");

    try {
      setProcessingStep("Transcribing your meeting...");
      const formData = new FormData();
      formData.append("audio", blob, "meeting.webm");
      const transcribeRes = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!transcribeRes.ok) throw new Error("Transcription failed");
      const { transcript: text } = await transcribeRes.json();
      setTranscript(text);

      setProcessingStep("Generating summary...");
      const summarizeRes = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, agenda }),
      });
      if (!summarizeRes.ok) throw new Error("Summarization failed");
      const { summary: sum } = await summarizeRes.json();
      setSummary(sum);

      setAppState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Processing failed");
      setAppState("idle");
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

        {/* Processing */}
        {appState === "processing" && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] py-14 shadow-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--color-primary)]/25 border-t-[var(--color-primary)]" />
            <p className="text-sm text-[var(--color-text-muted)]">{processingStep}</p>
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
