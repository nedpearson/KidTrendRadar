"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendScoringEngine = void 0;
const crypto_1 = __importDefault(require("crypto"));
// The Forecast Agent
class TrendScoringEngine {
    constructor(db) {
        this.db = db;
    }
    processSignals(params) {
        console.log(`[ScoringEngine] Generating Trend Forecasts... (${(params === null || params === void 0 ? void 0 : params.username) || 'default'})`);
        const allSignals = this.db.prepare('SELECT * FROM trends_signals').all(params);
        // Group by entity
        const grouped = allSignals.reduce((acc, curr) => {
            acc[curr.entity_name] = acc[curr.entity_name] || [];
            acc[curr.entity_name].push(curr);
            return acc;
        }, {});
        for (const [entityName, signals] of Object.entries(grouped)) {
            this.evaluateEntity(entityName, signals, params);
        }
        console.log("[ScoringEngine] Forecasting complete.");
    }
    evaluateEntity(entityName, signals, params) {
        // 1. Calculate Momentum (Velocity sum)
        let totalVelocity = 0;
        let totalInterest = 0;
        signals.forEach(s => {
            totalVelocity += s.velocity_score;
            totalInterest += s.interest_score;
        });
        const avgVelocity = totalVelocity / signals.length;
        const avgInterest = totalInterest / signals.length;
        const isMultiSource = new Set(signals.map(s => s.source_name)).size > 1;
        const isInternational = signals.some(s => s.region && s.region !== 'US');
        // Subscores
        const popularity = Math.min(100, avgInterest * 1.5);
        const velocity = Math.min(100, Math.max(0, avgVelocity)); // 0-100 mapped
        const earlySignal = isInternational ? 85 : 40;
        const durability = isMultiSource ? 75 : 30; // Better if seen in multiple places
        // Saturation Risk is low if interest is low but velocity is high
        let saturationRisk = 10;
        if (popularity > 80 && velocity < 20)
            saturationRisk = 90; // High saturation
        const compositeScore = (popularity * 0.3) + (velocity * 0.4) + ((100 - saturationRisk) * 0.2) + (durability * 0.1);
        // AI Insight Gen
        let insightReasoning = `Trend accelerating at ${velocity.toFixed(0)} velocity. `;
        if (isMultiSource)
            insightReasoning += "Converging across multiple platforms. ";
        if (isInternational)
            insightReasoning += "Early international lead-lag detected. Arriving soon locally. ";
        if (saturationRisk > 80)
            insightReasoning += "Warning: Trend is stalling or saturating. ";
        // Extrapolate the Timeframe Bucket dynamically
        let timeframeCategory = 'all_time';
        if (isInternational && velocity > 50)
            timeframeCategory = 'upcoming';
        else if (!isInternational && velocity > 80 && saturationRisk < 50)
            timeframeCategory = 'past_2_weeks';
        else if (!isInternational && velocity > 40 && saturationRisk < 80)
            timeframeCategory = 'past_month';
        else if (saturationRisk >= 80)
            timeframeCategory = 'all_time';
        // Calculate Louisiana Regional Hit Prediction
        let louisianaHitDate = '';
        if (timeframeCategory === 'upcoming') {
            louisianaHitDate = `Expected Louisiana Arrival: ${new Date(Date.now() + 1000 * 60 * 60 * 24 * (Math.random() * 30 + 45)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
        }
        else if (timeframeCategory === 'past_2_weeks') {
            louisianaHitDate = `Early Saturation: Recently entered MS/LA distribution. Active local hunt recommended.`;
        }
        else if (timeframeCategory === 'past_month') {
            louisianaHitDate = `Active Local Market. Regional stock may be low.`;
        }
        else {
            louisianaHitDate = `Historical Trend. Readily available or phased out.`;
        }
        const existing = this.db.prepare('SELECT * FROM product_opportunities WHERE name = @name').get(Object.assign({ name: entityName }, params));
        const opportunity = {
            id: existing ? existing.id : crypto_1.default.randomUUID(),
            name: entityName,
            brand: signals[0].brand_name || "Unknown",
            category: signals[0].category || "Misc",
            description: `Trending Kid's item identified via ${signals[0].source_name}`,
            compositeScore: Number(compositeScore.toFixed(1)),
            subScores: {
                popularity: Number(popularity.toFixed(1)),
                velocity: Number(velocity.toFixed(1)),
                earlySignal: Number(earlySignal.toFixed(1)),
                durability: Number(durability.toFixed(1)),
                marginPotential: 60, // Placeholder for Phase 4 (Sourcing)
                sourcingConfidence: 50, // Placeholder
                saturationRisk: Number(saturationRisk.toFixed(1))
            },
            insightReasoning,
            timeframeCategory,
            louisianaHitDate,
            momentumData: [
                { date: new Date().toISOString().split('T')[0], value: compositeScore } // historical append can be done here
            ],
            createdAt: existing ? existing.created_at : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.db.prepare(`
      INSERT OR REPLACE INTO product_opportunities 
      (id) 
    `).run(Object.assign(Object.assign({}, opportunity), params));
    }
}
exports.TrendScoringEngine = TrendScoringEngine;
