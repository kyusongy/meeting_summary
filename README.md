# Meeting Summary

Record a meeting, get an AI-powered summary with action items. One-click start/stop, speaker identification, and .docx export.

Built for capturing Teams/Zoom meetings via browser tab sharing — hit Start before a meeting, Stop after, and get a structured summary.

## How it works

1. Click **Start Recording** — share your meeting tab with system audio
2. Microphone is captured automatically for your voice
3. Click **Stop Recording** when done
4. Audio is transcribed via [Deepgram](https://deepgram.com/) (with speaker diarization)
5. Name the detected speakers (optional)
6. An LLM generates a structured summary (any OpenAI-compatible provider)
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

| Variable | Description |
|---|---|
| `APP_PASSWORD` | Shared password to open the app. **Required** — without it the app serves 503 to everyone. |
| `DEEPGRAM_API_KEY` | [console.deepgram.com](https://console.deepgram.com/) |
| `LLM_BASE_URL` | Any OpenAI-compatible API (e.g. `https://openrouter.ai/api/v1`, `https://api.openai.com/v1`) |
| `LLM_API_KEY` | API key for your LLM provider |
| `LLM_MODEL` | Model ID (e.g. `deepseek/deepseek-v4-flash`) |

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000) in Chrome.

## Access control

The whole app sits behind a single shared password (`APP_PASSWORD`), enforced in
`src/proxy.ts` for both pages and API routes. Signing in sets a year-long signed
cookie, so it's a one-time step per device. It fails closed: no password
configured means nobody gets in — the deployment is a public URL in front of
paid API keys.

## Deploy

Self-hosted on an Oracle Cloud VM behind a Cloudflare Tunnel. The box has under
1 GB of RAM and can't run `next build`, so the build happens locally and only
the standalone output ships:

```bash
./deploy.sh
```

That builds, rsyncs `.next/standalone` to `/opt/meeting-notes`, installs
`.env.local` as root-only `/etc/meeting-notes.env`, and restarts the
`meeting-notes` systemd unit (bound to `127.0.0.1:3000`, capped at 400 MB).

Logs: `ssh oracle journalctl -u meeting-notes -f`

## Tech

- Next.js 16 (App Router)
- Tailwind CSS v4
- Deepgram Nova-3 for transcription (English, speaker diarization)
- Any OpenAI-compatible API for summarization — currently DeepSeek V4 Flash via OpenRouter
- `docx` package for .docx export

## Requirements

- Chrome (uses `getDisplayMedia` for system audio capture)
- Desktop only — no mobile support

## License

MIT
