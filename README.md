# Meeting Summary

Record a meeting, get an AI-powered summary with action items. One-click start/stop, speaker identification, and .docx export.

Built for capturing Teams/Zoom meetings via browser tab sharing — hit Start before a meeting, Stop after, and get a structured summary.

## How it works

1. Click **Start Recording** — share your meeting tab with system audio
2. Microphone is captured automatically for your voice
3. Click **Stop Recording** when done
4. Audio is transcribed via [Deepgram](https://deepgram.com/) (speaker diarization included)
5. Name the detected speakers (optional)
6. An LLM generates a structured summary via [OpenRouter](https://openrouter.ai/)
7. Download the summary or transcript as .docx

If you paste a meeting agenda before recording, the summary is organized around those topics.

## Setup

```bash
git clone https://github.com/kyusongy/meeting_summary.git
cd meeting_summary
npm install
cp .env.example .env.local
```

Fill in your API keys in `.env.local`:

| Variable | Where to get it |
|---|---|
| `DEEPGRAM_API_KEY` | [console.deepgram.com](https://console.deepgram.com/) |
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `OPENROUTER_MODEL` | Any model on OpenRouter (default: `x-ai/grok-4.1-fast`) |

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000) in Chrome.

## Deploy

Deploy to Vercel and set the three environment variables above in the Vercel dashboard.

## Tech

- Next.js (App Router)
- Tailwind CSS v4
- Deepgram Nova-3 for transcription
- OpenRouter for summarization
- `docx` package for .docx export

## Requirements

- Chrome (uses `getDisplayMedia` for system audio capture)
- Desktop only — no mobile support

## License

MIT
