import { NextRequest, NextResponse } from "next/server";

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

  if (agenda?.trim()) {
    prompt = `Output only the requested content. No introductions, explanations, or commentary.

You are summarizing a meeting transcript. The meeting had a pre-defined agenda. Organize the summary around the agenda items.

## Agenda
${agenda}

## Instructions
For each agenda item, write:
- A brief summary of what was discussed
- Any decisions made (in bold)
- Action items (as a checklist with owner if mentioned)

Then add a section called "Other Topics" for anything discussed outside the agenda.

End with a "Key Takeaways" section (3-5 bullet points).

## Transcript
"""
${transcript}
"""`;
  } else {
    prompt = `Output only the requested content. No introductions, explanations, or commentary.

Write a concise summary of this meeting transcript in English using markdown. Include:
- A short overview paragraph
- 3-5 key takeaways as bullet points
- **Decisions** highlighted in bold
- Action items as a checklist (with owner if mentioned)

"""
${transcript}
"""`;
  }

  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ error: `LLM error: ${response.status} - ${errorText}` }, { status: 500 });
  }

  const data = await response.json();
  const summary = data.choices?.[0]?.message?.content ?? "";

  return NextResponse.json({ summary });
}
