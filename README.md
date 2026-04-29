# EXPONENT — Website for productivity

> A self-improvement web app built for people who struggle with focus, procrastination, and turning vague goals into real action.

---

## What is Exponent?

Exponent is a browser-based productivity suite inspired by real struggles shared by people in self-improvement communities — the kind of person who knows what they *should* do but can't seem to start, loses hours without noticing, or has goals that feel too big and abstract to act on.

Instead of yet another to-do list, Exponent bundles five science-informed tools into a single dark, distraction-free interface:

---

## Features

### ◷ Focus Timer (Pomodoro)
A circular animated Pomodoro timer with customizable work durations (5–90 min), pause/resume/reset controls, and automatic session logging. Tracks total focus minutes and deep work hours across sessions. Built around the **2-Minute Rule** — if a task takes under 2 minutes, do it now; otherwise schedule a Pomodoro for it.

### ⊞ Task Board (Kanban)
A drag-and-drop Kanban board with four columns: Backlog → Today → In Progress → Done. Each task supports priority levels (low / medium / high) and custom tags. All data persists in `localStorage` so nothing is lost on page refresh.

### ◉ Sound Lab (Binaural Beats + Noise)
A real-time audio engine built entirely with the **Web Audio API** — no audio files, no streaming, no external dependencies. Generates binaural beats across five scientifically-referenced frequency bands:

- **Delta (2 Hz)** — deep rest and recovery
- **Theta (7 Hz)** — creativity and divergent thinking
- **Alpha (10 Hz)** — relaxed focus, anxiety reduction
- **Beta (14 Hz)** — analytical concentration
- **Gamma (40 Hz)** — peak cognitive performance and flexibility

Also generates **White Noise** (equal-frequency masking, best for open offices) and **Brown Noise** (deep low-frequency rumble, ideal for ADHD and deep focus). All sounds loop infinitely with real-time volume control.

> Binaural beats require stereo headphones. The brain perceives the frequency *difference* between the two ears and can be guided toward the target brainwave state.

### ✦ AI Plan Builder (Visual Whiteboard)
Powered by the **Claude API (claude-sonnet-4)**. The user types a raw, messy brain-dump — any goal, struggle, or life situation in plain language — and the AI extracts a structured action plan and renders it as an **interactive node-connection whiteboard**. Nodes are color-coded by type (goal, phase, action, habit, obstacle, milestone) and are fully draggable. Clicking a node shows its detail description in a sidebar panel.

### ▦ Stats Dashboard
A 14-day focus activity bar chart, key productivity metrics (total focus minutes, Pomodoro count, tasks completed, day streak), and a reference card of six evidence-based productivity techniques: the 2-Minute Rule, Time Blocking, the 5-Second Rule, Eat the Frog, Environment Design, and Ultradian Rhythms.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 (hooks, functional components) |
| Build Tool | Vite |
| Audio Engine | Web Audio API (native browser) |
| AI Integration | Anthropic Claude API (`claude-sonnet-4`) |
| Data Persistence | `localStorage` |
| Fonts | IBM Plex Mono + DM Sans |
| Hosting | Vercel (free tier) |

> This is currently a frontend-only MVP. The full MERN stack (MongoDB, Express, Node.js) will be added in a future version to support user accounts, cloud sync, and a backend API proxy.

---

## Getting Started

### Prerequisites
- Node.js (LTS) — [nodejs.org](https://nodejs.org)
- An Anthropic API key — [console.anthropic.com](https://console.anthropic.com)

### Installation

```bash
# 1. Scaffold a Vite + React project
npm create vite@latest exponent-app -- --template react
cd exponent-app
npm install

# 2. Place exponent-app.jsx inside the src/ folder
# 3. Update src/main.jsx to import App from './exponent-app.jsx'

# 4. Create a .env file in the project root
echo "VITE_ANTHROPIC_KEY=sk-ant-your-key-here" > .env

# 5. Start the dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build for Production

```bash
npm run build
```

The optimized output lands in `dist/` and is ready to deploy to Vercel, Netlify, or Cloudflare Pages.

---

## Deployment

The fastest way to get a public URL (free, no credit card):

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Add `VITE_ANTHROPIC_KEY` as an environment variable in Vercel's project settings
4. Click Deploy — you'll get a live URL like `https://exponent-app.vercel.app`

Every subsequent `git push` auto-redeploys the site.

> **Security note:** Never commit your `.env` file. Add `.env` to `.gitignore` and store the API key only in Vercel's environment variable settings. For a public production launch, move the Claude API call to a backend proxy (Express/Node) so the key is never exposed in the browser.

---

## Why This Exists

Most productivity apps assume the user already has discipline. Exponent is designed for the opposite case — the person at the beginning, overwhelmed, not sure where to start. Every tool in this app is a direct response to a specific, documented struggle: the inability to start (Pomodoro + 2-Minute Rule), invisible time loss (focus tracking), mental clutter (AI planner), distraction by silence (sound lab), and lack of visible progress (stats dashboard).

---

## License

MIT — free to use, fork, and build on.
