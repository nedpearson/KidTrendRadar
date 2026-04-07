# KidTrend Radar - Architectural Overview

## 1. Core Architecture
The system consists of three main components adhering to a local-first, offline-enabled paradigm.

- **Desktop Shell**: An Electron/Tauri or local browser-based React application serving as the control center.
- **Mobile Field App**: A React Native (Expo) app optimized for offline performance, swift manual capture, and LAN synchronization.
- **Shared Toolkit**: A monorepo package exposing Data Schemas (Zod), Sync Logic, and Offline Data conflict resolution algorithms.

## 2. Sync Engine (LAN Local-First)
To achieve secure, offline-first LAN sync without relying on a cloud server:
- **Protocol**: Local MDNS (Multicast DNS) or Bonjour to auto-discover the Desktop instance on the network.
- **Replication Log**: Both Desktop and Mobile maintain an append-only operations log (`Operation_ID`, `Timestamp`, `Action`, `Payload`).
- **Conflict Resolution**: Last-Write-Wins (LWW) per field, managed by Vector Clocks or monotonically increasing hybrid logical clocks (HLC). 

## 3. Ingestion & Agent Orchestration Layer
The system uses specialized localized LLMs/Local AI to process the ingestion pipeline:
- **Trend Scout Agent**: Cron-based worker that parses generic `TrendSignal` data from platforms (TikTok, Pinterest, Google Trends). 
- **Forecast Agent**: Calculates `Trend Opportunity Score` via sub-score aggregation (Popularity, Velocity, Durability, Sourcing Confidence).
- **Source Finder Agent**: Scrapes or leverages APIs for wholesale distribution paths to enrich `ProductOpportunity`.
- **Daily Briefing Agent**: Uses an LLM pass to convert data points into a narrative briefing text.

## 4. Environment Setup
To run KidTrend Radar:
1. Ensure Node.js 20+ is installed.
2. In the root directory, run `npm run install:all`.
3. Start the Desktop App: `npm run dev:desktop`.
4. Start the Mobile App shell: `npm run dev:mobile`.
