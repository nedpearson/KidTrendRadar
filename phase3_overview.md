# KidTrend Radar - Phase 3 Delivery

## Core Deliverables Generated
Phase 3 establishes the intelligence core of the platform: turning raw signals into actionable trend scores and opportunities.

### 1. Trend Scoring Engine & AI Forecasting (`apps/api/src/scoring/engine.ts`)
- **Signal Aggregation**: Consolidates disjointed TikTok/Pinterest/Web signals grouped by product entities.
- **Weighted Momentum Variables**: Calculates `Popularity`, `Velocity`, `Early Validation` (multi-source discovery), and builds a primary `Composite Score` designed for early-purchase scenarios.
- **Saturation Risk Mapping**: Evaluates metrics automatically identifying when a trend might be a "fad" (huge popularity but crashing velocity), flagging it as high-risk for sourcing.
- **Rule-based AI Insights**: Generates plain-language reasoning (e.g., "MojiMonsters: Trend accelerating at 100 velocity. Early international lead-lag detected. Arriving soon locally.").

### 2. Product Opportunity Framework
- Automatically structures validated forecasts strictly conforming to the `@kidTrend-radar/shared` Zod type definitions constraint (e.g. `ProductOpportunitySchema`).
- Preserves offline-friendly timestamps supporting LAN-sync updates.

### 3. Application UI Upgrades (`apps/desktop/src/App.tsx`)
1. **Trend Explorer View**: 
   - A newly established card layout showing all AI forecasted opportunities matching the dark UI theme logic.
   - Highlights granular metrics per item (Saturation bounds, Velocity bounds, Deep Dives).
   - "Add to Watchlist" capability.
2. **Watchlist Intelligence View**:
   - Stores user-added opportunities.
   - Merges with incoming sync signals from API to dynamically display active "Velocity" or identify gaps.

## Next Step: Phase 4 (Source Discovery / Buying Center)
In Phase 4 we will integrate the **Source Finder Agent**: An advanced buying agent mechanism that resolves our forecasted "Trend Opportunities" into actionable wholesale sources, marketplace URLs, margins, and compare features.
