import { createClient } from "@deepgram/sdk";
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
  const deepgram = createClient(apiKey);

  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(buffer, {
    model: "nova-3",
    smart_format: true,
    language: "en",
    punctuate: true,
    paragraphs: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

  return NextResponse.json({ transcript });
}
