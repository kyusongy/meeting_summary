"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type RecordingState = "idle" | "recording" | "stopped";

/** Auto-stop so a forgotten tab can't grow an unbounded blob. */
const MAX_DURATION_SEC = 3 * 60 * 60;

/** Below this peak amplitude we treat the input as silent. */
const SILENCE_THRESHOLD = 0.01;

/** How long to wait before telling the user we hear nothing. */
const SILENCE_GRACE_SEC = 12;

export class NoAudioTrackError extends Error {
  constructor() {
    super(
      "No audio was shared. In the Chrome dialog, pick the meeting tab and turn on “Also share tab audio” before clicking Share."
    );
    this.name = "NoAudioTrackError";
  }
}

export function useAudioRecorder() {
  const [state, setState] = useState<RecordingState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [hasMic, setHasMic] = useState(false);
  const [silent, setSilent] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const heardSoundRef = useRef(false);

  /** Tear down capture hardware. Safe to call twice. */
  const teardown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streamsRef.current = [];
    analyserRef.current = null;
    // Closing the context releases the mixing graph; without this every
    // recording leaks one and Chrome caps how many a page may hold.
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  }, []);

  const stop = useCallback(() => {
    // onstop fires after the last chunk flushes, so teardown happens there.
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    else teardown();
  }, [teardown]);

  const start = useCallback(async () => {
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true, // required by the API; we never record it
      audio: true,
    });
    streamsRef.current = [displayStream];

    // Chrome hands back a video-only stream when the user forgets the audio
    // toggle, or shares a window/screen on macOS. Recording that yields an
    // hour of silence, so fail loudly now instead.
    if (displayStream.getAudioTracks().length === 0) {
      teardown();
      throw new NoAudioTrackError();
    }

    let micStream: MediaStream | null = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamsRef.current.push(micStream);
    } catch {
      // Mic is optional — tab audio alone still captures everyone else.
    }
    setHasMic(!!micStream);

    // Leave the video track live but muted. Stopping it can end the whole
    // capture session in Chrome, which would kill the audio we actually want.
    displayStream.getVideoTracks().forEach((t) => (t.enabled = false));

    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const destination = ctx.createMediaStreamDestination();
    ctx.createMediaStreamSource(displayStream).connect(destination);
    if (micStream) ctx.createMediaStreamSource(micStream).connect(destination);

    // Tap the mix so we can tell her if nothing is coming through.
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    ctx.createMediaStreamSource(destination.stream).connect(analyser);
    analyserRef.current = analyser;
    heardSoundRef.current = false;
    setSilent(false);

    chunksRef.current = [];
    const recorder = new MediaRecorder(destination.stream, {
      mimeType: "audio/webm;codecs=opus",
      // Speech-grade opus. Keeps a 3h meeting near 40 MB instead of ~170 MB,
      // which matters both for her upload and for the 1 GB server.
      audioBitsPerSecond: 32000,
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      setAudioBlob(new Blob(chunksRef.current, { type: "audio/webm" }));
      setState("stopped");
      teardown();
    };
    recorderRef.current = recorder;

    recorder.start(1000);
    setState("recording");
    startTimeRef.current = Date.now();
    setDuration(0);

    const buf = new Float32Array(analyser.fftSize);
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDuration(elapsed);

      analyser.getFloatTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v));
      if (peak > SILENCE_THRESHOLD) heardSoundRef.current = true;
      setSilent(!heardSoundRef.current && elapsed >= SILENCE_GRACE_SEC);

      if (elapsed >= MAX_DURATION_SEC) stop();
    }, 1000);

    // Chrome's "Stop sharing" bar ends the track rather than calling us.
    displayStream.getAudioTracks()[0]?.addEventListener("ended", () => stop());
  }, [stop, teardown]);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    setState("idle");
    setSilent(false);
    setHasMic(false);
  }, []);

  // Release hardware if the component goes away mid-recording.
  useEffect(() => () => teardown(), [teardown]);

  return { state, audioBlob, duration, hasMic, silent, start, stop, reset };
}
