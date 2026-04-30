# EXPONENT — Website for productivity

> A self-improvement web app built for people who struggle with focus, procrastination, and turning vague goals into real action.


## What is Exponent?

Exponent is a browser-based productivity suite inspired by real struggles shared by people in self-improvement communities — the kind of person who knows what they *should* do but can't seem to start, loses hours without noticing, or has goals that feel too big and abstract to act on.

---

## Features

### ◷ Focus Timer (Pomodoro)
A circular animated Pomodoro timer with customizable work durations (5–90 min), pause/resume/reset controls, and automatic session logging. Tracks total focus minutes and deep work hours across sessions. Built around the **2-Minute Rule**
<img width="1366" height="524" alt="5313fc83-9b8a-468f-8d3a-bad1c0464e40" src="https://github.com/user-attachments/assets/09c840b3-f52d-420b-91fb-f29d77a0cdc1" />

### ⊞ Task Board (Kanban)
A drag-and-drop Kanban board with four columns: Backlog → Today → In Progress → Done. Each task supports priority levels (low / medium / high) and custom tags. All data persists in `localStorage` so nothing is lost on page refresh.
<img width="1366" height="536" alt="29050794-ce74-4961-8328-f940c6f49f56" src="https://github.com/user-attachments/assets/d3aeb90e-9fd3-4791-bb43-095a1b4e6aef" />

### ◉ Sound Lab (Binaural Beats + Noise)
A real-time audio engine built entirely with the **Web Audio API** — no audio files, no streaming, no external dependencies. Generates binaural beats across five scientifically-referenced frequency bands:

- **Delta (2 Hz)** — deep rest and recovery
- **Theta (7 Hz)** — creativity and divergent thinking
- **Alpha (10 Hz)** — relaxed focus, anxiety reduction
- **Beta (14 Hz)** — analytical concentration
- **Gamma (40 Hz)** — peak cognitive performance and flexibility

Also generates **White Noise** (equal-frequency masking, best for open offices) and **Brown Noise** (deep low-frequency rumble, ideal for ADHD and deep focus). All sounds loop infinitely with real-time volume control.


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

### Build for Production

```bash
npm run build
```
