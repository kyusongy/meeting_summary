"use client";

import { useState, useRef, useCallback } from "react";

export type RecordingState = "idle" | "recording" | "stopped";

export function useAudioRecorder() {
  const [state, setState] = useState<RecordingState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streamsRef.current = [];
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const start = useCallback(async () => {
    // Get system audio via screen share dialog
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true, // required by API, we discard it
      audio: true,
    });

    // Get microphone
    let micStream: MediaStream | null = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // mic optional — system audio alone is fine
    }

    // Discard video track
    displayStream.getVideoTracks().forEach((t) => t.stop());

    // Merge audio tracks
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    const systemSource = audioContext.createMediaStreamSource(displayStream);
    systemSource.connect(destination);

    if (micStream) {
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(destination);
    }

    const combinedStream = destination.stream;
    streamsRef.current = [displayStream, ...(micStream ? [micStream] : [])];

    // Record
    chunksRef.current = [];
    const recorder = new MediaRecorder(combinedStream, {
      mimeType: "audio/webm;codecs=opus",
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setAudioBlob(blob);
      setState("stopped");
      if (timerRef.current) clearInterval(timerRef.current);
    };

    mediaRecorderRef.current = recorder;
    recorder.start(1000); // collect chunks every second
    setState("recording");
    startTimeRef.current = Date.now();
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // Stop recording if the user stops screen sharing
    displayStream.getAudioTracks()[0]?.addEventListener("ended", () => {
      stop();
    });
  }, [stop]);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    setState("idle");
  }, []);

  return { state, audioBlob, duration, start, stop, reset };
}
