# LOCKED IN

**Your voice reveals what your words hide.**

A voice-first productivity operating system that reads your biology and your world to give you decisions, not dashboards.

## The Problem

Productivity culture is broken. We consume 300+ pieces of content a week across 15 tools. We have calendars, newsletters, podcasts, Slack, WhatsApp, Reddit, Twitter, LinkedIn, all screaming for attention.

79% of UK workers experienced burnout last year. Not because they didn't know they were tired. Because every tool they use listens to their words, not their body.

The result: people push through bad days, skip recovery, miss the one signal that actually matters, and burn out.

## The Insight

Your voice carries more information than your words. In 15 seconds of natural speech, acoustic patterns reveal stress, fatigue, energy, happiness, and focus. Signals your words actively hide.

"I'm fine" is the most common lie in the workplace. Your voice knows the truth.

## The Solution

Locked In combines voice biomarkers with personal intelligence to give you decisions, not dashboards.

- Speak for 15 seconds about your day
- Locked In reads your biology: stress, fatigue, energy, happiness, focus, dedication from acoustic patterns in your voice
- Scans your world: calendar, newsletters, podcasts, Twitter, Reddit, LinkedIn, YouTube, WhatsApp, Luma events, Discord, GitHub, funding data
- Gives you 5 actions restructured around how you actually are, not how you think you are
- Talks back to you: a conversational agent that knows your calendar, your messages, your signals, and your biology

## Example

**You say:** "Morning. Slept badly. Have three calls today. Need to finish the investor deck."

**Locked In responds:** "Hey Himanshu. I can hear the fatigue in your voice. Your energy is at 35. I would move the deck to tomorrow. Take your first call at 11 when cortisol peaks. Cancel the team sync, send a Loom instead. Tonight there is an AI Founders meetup at Shoreditch, 43 RSVPs. Low key. Good for recharging. Also, 20VC just dropped an episode on closing Series B rounds. Listen before your investor call."

## How It Works

```
Your Voice
  > Gradium STT (real-time voice capture, sub-300ms)
  > Speechmatics (deep transcription, speaker diarization)
  > Thymia Sentinel (voice biomarkers: stress, fatigue, energy, happiness via Helios + Psyche models)
  > TinyFish (live web intelligence search)
  > 12 SignalIT sources (newsletters, podcasts, Twitter, Reddit, LinkedIn, YouTube, WhatsApp, Luma, Discord, GitHub, funding, books)
  > GPT-4o (reasoning engine: combines biology + calendar + signals)
  > Gradium TTS (speaks your plan back naturally)
```

## Sponsor Integration

| Sponsor | Role | How It Is Used |
|---|---|---|
| **Gradium** | Voice interface | STT captures audio input. TTS speaks the briefing and plan back. Powers the conversational agent loop. Sub-300ms Rust core. |
| **Speechmatics** | Transcription | Enhanced speech-to-text with medical-grade accuracy. Speaker diarization ready. 55+ languages. |
| **Thymia Sentinel** | Voice biomarkers | Helios model: stress, fatigue, burnout. Psyche model: real-time happiness, affect. Detects what words hide. |
| **TinyFish** | Web intelligence | Search API fetches live signals based on transcript topics. Augments cached SignalIT data with real-time web results. |

## Architecture

- **Frontend:** React + Vite + TypeScript + Tailwind (built with Lovable)
- **Voice:** Browser MediaRecorder + Web Speech API with Gradium endpoints wired
- **Biomarkers:** Thymia Sentinel (Helios wellness + Psyche affect models) via Python server on Render
- **Intelligence:** SignalIT Supabase backend (12 agents, 9 database tables, live cached data)
- **Calendar:** Google Calendar ICS feed (real events, no OAuth needed)
- **Pipeline visualization:** React Flow with animated agent pipeline
- **Conversation:** GPT-4o powered voice agent with full context (biomarkers + calendar + signals)

## 12 Connected Intelligence Sources

| Source | Data |
|---|---|
| YouTube | 36 channels, 50 videos monitored |
| Newsletters | Gmail integration, 11 sources (Morning Brew, Lenny's, StrictlyVC, Axios) |
| Podcasts | 69 Spotify shows, 345 episodes tracked |
| LinkedIn | 4 high-signal profiles monitored |
| Twitter/X | Naval + key accounts, categorized signals |
| GitHub | Trending repos, daily sync |
| Reddit | 20 tickers, sentiment analysis, stock intelligence |
| WhatsApp | 128 groups, signal extraction via WAHA |
| Luma | Events London/SF/NYC, 153 upcoming events |
| Discord | 15 channels monitored |
| Books | AI-generated insights and reading list |
| Funding | 11,986 companies tracked |

## Why This Is Big

- $73B workplace wellness market
- $4.3B productivity software market growing 14% YoY
- 79% of UK workers experienced burnout in 2025
- 67% of burnout goes undetected until someone quits

Every company spends money on Headspace, Calm, and employee surveys. None of them use biology. Locked In replaces guesswork with voice biomarkers.

## Business Model

B2B SaaS. Sell to companies who lose money when their people burn out.

- £10 per user per month
- 500-person company = £5K per month
- Start with founders and chiefs of staff, then HR teams at Series B+ companies

## Built By

**Himanshu Agarwal** — Founders Associate at Tilt (live commerce, Balderton-backed, Series B). CS engineering background. LBS MBA. Former VC at Albion. Built SignalIT as a personal intelligence platform. Built TrustStream at the Hedera hackathon. Locked In is the missing layer between your calendar and your biology.

## Track

**Productivity:** Voice and Productivity track sponsored by Gradium and TinyFish, with Speechmatics and Thymia integration for voice biomarker intelligence.

---

> "The most productive thing you can do on a bad day is know it is a bad day."
