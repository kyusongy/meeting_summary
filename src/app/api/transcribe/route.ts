import { DeepgramClient } from "@deepgram/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // 5 min timeout for long audio

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

  const buffer = Buffer.from(await audioFile.arrayBuffer());
  const deepgram = new DeepgramClient({ apiKey });

  try {
    const result = await deepgram.listen.v1.media.transcribeFile(buffer, {
      model: "nova-3",
      smart_format: true,
      language: "en",
      punctuate: true,
      paragraphs: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result as any;
    const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

    return NextResponse.json({ transcript });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
