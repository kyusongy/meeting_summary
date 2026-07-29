import { DeepgramClient } from "@deepgram/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // 5 min timeout for long audio

/**
 * 3h at our 32 kbps capture is ~43 MB. The server has under 1 GB of RAM and
 * buffers the upload, so refuse anything far past that rather than OOM.
 */
const MAX_AUDIO_BYTES = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Deepgram API key not configured" }, { status: 500 });
  }

  const formData = await req.formData();
  const audioFile = formData.get("audio") as File | null;
  if (!audioFile) {
    return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
  }
  if (audioFile.size === 0) {
    return NextResponse.json(
      { error: "The recording is empty. Nothing was captured." },
      { status: 400 }
    );
  }
  if (audioFile.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "That recording is too long to process. Try recording in shorter sessions." },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await audioFile.arrayBuffer());
  const deepgram = new DeepgramClient({ apiKey });

  try {
    const result = await deepgram.listen.v1.media.transcribeFile(buffer, {
      model: "nova-3",
      smart_format: true,
      language: "en",
      punctuate: true,
      paragraphs: true,
      diarize: true,
      utterances: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result as any;

    // Build speaker-labeled transcript from utterances
    const utterances: { speaker: number; text: string }[] =
      data?.results?.utterances?.map((u: { speaker: number; transcript: string }) => ({
        speaker: u.speaker,
        text: u.transcript,
      })) ?? [];

    // Collect unique speaker IDs
    const speakers = [...new Set(utterances.map((u) => u.speaker))].sort();

    // Group consecutive same-speaker utterances into paragraphs
    const grouped: { speaker: number; text: string }[] = [];
    for (const u of utterances) {
      const last = grouped[grouped.length - 1];
      if (last && last.speaker === u.speaker) {
        last.text += " " + u.text;
      } else {
        grouped.push({ speaker: u.speaker, text: u.text });
      }
    }

    const transcript = grouped
      .map((g) => `Speaker ${g.speaker}: ${g.text}`)
      .join("\n\n");

    // Silent capture is the common failure here — the share dialog's audio
    // toggle is easy to miss. Say so plainly instead of handing an empty
    // string to the summarizer.
    if (!transcript.trim()) {
      return NextResponse.json(
        {
          error:
            "No speech was found in the recording. This usually means the meeting audio wasn’t shared — in the Chrome dialog, pick the meeting tab and turn on “Also share tab audio”.",
        },
        { status: 422 }
      );
    }

    // Extract 2-3 sample quotes per speaker for identification
    const speakerSamples: Record<number, string[]> = {};
    for (const s of speakers) {
      const blocks = grouped
        .filter((g) => g.speaker === s && g.text.length >= 20);
      if (!blocks.length) continue;
      const picks = [0, Math.floor(blocks.length / 2), blocks.length - 1];
      speakerSamples[s] = [...new Set(picks)]
        .map((i) => blocks[i].text.slice(0, 120) + (blocks[i].text.length > 120 ? "..." : ""))
        .slice(0, 3);
    }

    return NextResponse.json({ transcript, speakers, speakerSamples });
  } catch (e) {
    console.error("Deepgram request failed:", e);
    return NextResponse.json(
      { error: "Couldn’t transcribe the recording. You can retry without recording again." },
      { status: 502 }
    );
  }
}
