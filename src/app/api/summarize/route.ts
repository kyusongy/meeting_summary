import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // 5 min timeout for long summaries

export async function POST(req: NextRequest) {
  const baseUrl = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!baseUrl || !apiKey || !model) {
    return NextResponse.json({ error: "LLM provider not configured" }, { status: 500 });
  }

  const { transcript, agenda } = await req.json();
  if (!transcript) {
    return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
  }

  let prompt: string;

  // Headings are pinned to `##` because the .docx exporter maps them to Word
  // heading styles; free-form output exports as an unreadable flat wall.
  const RULES = `Output only the summary itself. No preamble, no commentary, no closing remarks.
Write in English using markdown. Use "##" for every section heading.
Omit a section entirely if the meeting contained nothing for it — never write "None" or "N/A".
Only state things that were actually said; do not infer or invent.`;

  if (agenda?.trim()) {
    prompt = `${RULES}

Summarize this meeting, organized around the agenda below.

Structure:
## <agenda item name>
One short paragraph on what was discussed. Put any decision in **bold**.
(repeat for each agenda item)

## Other Topics
Anything substantive discussed outside the agenda.

## Action Items
Every task anyone committed to, from anywhere in the meeting, as "- [ ] Task — Owner".

## Key Takeaways
3-5 bullets.

# Agenda
${agenda}

# Transcript
"""
${transcript}
"""`;
  } else {
    prompt = `${RULES}

Summarize this meeting.

Structure:
## Overview
One short paragraph.

## Key Takeaways
3-5 bullets.

## Decisions
Each decision in **bold**.

## Action Items
"- [ ] Task — Owner" for each.

# Transcript
"""
${transcript}
"""`;
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const body = JSON.stringify({
    model,
    messages: [{ role: "user", content: prompt }],
  });
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 240_000); // 4 min

    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LLM ${response.status}: ${errorText}`);
      return NextResponse.json(
        { error: `The summarizer returned an error (${response.status}). Your transcript is safe — try again.` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!summary) {
      return NextResponse.json(
        { error: "The summarizer returned nothing. Your transcript is safe — try again." },
        { status: 502 }
      );
    }
    return NextResponse.json({ summary });
  } catch (err: unknown) {
    console.error("LLM request failed:", err);
    const aborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: aborted
          ? "The summary took too long and timed out. Your transcript is safe — try again."
          : "Couldn’t reach the summarizer. Your transcript is safe — try again.",
      },
      { status: 502 }
    );
  }
}
