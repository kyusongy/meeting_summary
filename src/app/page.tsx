"use client";

import { useState, useEffect } from "react";
import { useAudioRecorder, NoAudioTrackError } from "@/hooks/useAudioRecorder";
import { useSupported } from "@/hooks/useSupported";
import { RecordingIndicator } from "@/components/RecordingIndicator";
import { AgendaInput } from "@/components/AgendaInput";
import { ShareInstructions } from "@/components/ShareInstructions";
import { ProcessingView } from "@/components/ProcessingView";
import { SpeakerMap } from "@/components/SpeakerMap";
import { SummaryView } from "@/components/SummaryView";
import { postForm, postJson } from "@/lib/api";
import { downloadBlob, today } from "@/lib/download";

type AppState =
  | "idle"
  | "recording"
  | "transcribing"
  | "transcription-failed"
  | "mapping"
  | "summarizing"
  | "summary-failed"
  | "done";

/** States where navigating away would throw away real work. */
const BUSY: AppState[] = ["recording", "transcribing", "summarizing"];

export default function Home() {
  const recorder = useAudioRecorder();
  const supported = useSupported();
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
      // Closing the share dialog is a normal choice, not an error worth showing.
      if (e instanceof DOMException && e.name === "NotAllowedError") return;
      setError(
        e instanceof NoAudioTrackError || e instanceof Error
          ? e.message
          : "Couldn’t start recording."
      );
    }
  }

  async function processAudio(blob: Blob) {
    setAppState("transcribing");
    setError("");
    try {
      const form = new FormData();
      form.append("audio", blob, "meeting.webm");
      const data = await postForm("/api/transcribe", form);
      setTranscript(data.transcript);
      setSpeakers(data.speakers ?? []);
      setSpeakerSamples(data.speakerSamples ?? {});

      if (data.speakers?.length > 1) setAppState("mapping");
      else await summarize(data.transcript);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transcription failed.");
      setAppState("transcription-failed");
    }
  }

  async function handleSpeakerConfirm(mapping: Record<number, string>) {
    let mapped = transcript;
    for (const [speaker, name] of Object.entries(mapping)) {
      if (name.trim()) mapped = mapped.replaceAll(`Speaker ${speaker}:`, `${name.trim()}:`);
    }
    setTranscript(mapped);
    await summarize(mapped);
  }

  async function summarize(text: string) {
    setAppState("summarizing");
    setError("");
    try {
      const { summary: sum } = await postJson("/api/summarize", { transcript: text, agenda });
      setSummary(sum);
      setAppState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Summarization failed.");
      setAppState("summary-failed");
    }
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

  // Kick off processing once the recorder has flushed its final chunk.
  useEffect(() => {
    if (recorder.state === "stopped" && recorder.audioBlob && appState === "recording") {
      processAudio(recorder.audioBlob);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.state, recorder.audioBlob, appState]);

  // A stray tab close mid-meeting loses the whole recording.
  useEffect(() => {
    if (!BUSY.includes(appState)) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [appState]);

  if (supported === false) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Please open this in Chrome
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
          Recording a meeting needs desktop Chrome or Edge on a computer. Phones
          and tablets can’t capture meeting audio, and neither can Safari.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-tight">
          Meeting Notes
        </h1>
        <p className="mt-3 text-[var(--color-text-muted)]">
          Record your meeting and get a written summary
        </p>
      </div>

      <div className="space-y-6">
        {(appState === "idle" || appState === "recording") && (
          <AgendaInput
            value={agenda}
            onChange={setAgenda}
            disabled={appState === "recording"}
          />
        )}

        {appState === "idle" && (
          <>
            <ShareInstructions />
            <button
              onClick={handleStart}
              className="w-full rounded-2xl bg-[var(--color-primary)] py-4 text-lg font-semibold text-white shadow-md transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-lg active:scale-[0.98]"
            >
              Start Recording
            </button>
          </>
        )}

        {appState === "recording" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-[var(--color-recording)]/20 bg-[var(--color-recording)]/5 px-6 py-4">
              <RecordingIndicator duration={recorder.duration} />
            </div>

            {recorder.silent && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-800">
                <strong className="font-semibold">No sound yet.</strong> Stop the
                recording and start again, making sure you pick the meeting tab and
                turn on “Also share tab audio”.
              </div>
            )}

            {!recorder.hasMic && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-800">
                Your microphone isn’t being recorded, so your own voice won’t appear
                in the notes. Everyone else in the meeting will.
              </div>
            )}

            <button
              onClick={recorder.stop}
              className="w-full rounded-2xl bg-[var(--color-success)] py-4 text-lg font-semibold text-white shadow-md transition-all hover:bg-[var(--color-success-hover)] hover:shadow-lg active:scale-[0.98]"
            >
              Stop Recording
            </button>
          </div>
        )}

        {appState === "transcribing" && (
          <ProcessingView
            label="Writing down what was said…"
            reassurance="Long meetings take a few minutes. Please leave this tab open."
          />
        )}

        {appState === "transcription-failed" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm leading-relaxed text-red-700">
              {error}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => recorder.audioBlob && processAudio(recorder.audioBlob)}
                className="flex-1 rounded-2xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-lg active:scale-[0.98]"
              >
                Try Again
              </button>
              <button
                onClick={handleNewMeeting}
                className="flex-1 rounded-2xl border border-[var(--color-border)] py-3 text-sm font-medium transition hover:bg-[var(--color-border)]/50"
              >
                Start Over
              </button>
            </div>
            {recorder.audioBlob && (
              <button
                onClick={() =>
                  downloadBlob(recorder.audioBlob!, `meeting-recording-${today()}.webm`)
                }
                className="w-full text-center text-xs text-[var(--color-text-muted)] underline underline-offset-4 hover:text-[var(--color-text)]"
              >
                Save the audio to your computer just in case
              </button>
            )}
          </div>
        )}

        {appState === "mapping" && (
          <SpeakerMap
            speakers={speakers}
            speakerSamples={speakerSamples}
            onConfirm={handleSpeakerConfirm}
            onSkip={() => summarize(transcript)}
          />
        )}

        {appState === "summarizing" && (
          <div className="space-y-4">
            <ProcessingView label="Writing your summary…" />
            <TranscriptCard transcript={transcript} />
          </div>
        )}

        {appState === "summary-failed" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm leading-relaxed text-red-700">
              {error}
            </div>
            <TranscriptCard transcript={transcript} />
            <div className="flex gap-3">
              <button
                onClick={() => summarize(transcript)}
                className="flex-1 rounded-2xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-lg active:scale-[0.98]"
              >
                Try Again
              </button>
              <button
                onClick={handleNewMeeting}
                className="flex-1 rounded-2xl border border-[var(--color-border)] py-3 text-sm font-medium transition hover:bg-[var(--color-border)]/50"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

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

        {/* States above render their own error UI. */}
        {error && appState !== "transcription-failed" && appState !== "summary-failed" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}

function TranscriptCard({ transcript }: { transcript: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-muted)]">
        Transcript
      </h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{transcript}</p>
    </div>
  );
}
