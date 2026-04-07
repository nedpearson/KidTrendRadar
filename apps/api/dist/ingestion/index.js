"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineWorker = void 0;
const shared_1 = require("@kidtrend-radar/shared");
const crypto_1 = __importDefault(require("crypto"));
class PipelineWorker {
    constructor() {
        this.connectors = [];
    }
    register(connector) {
        this.connectors.push(connector);
    }
    generateHash(payload) {
        return crypto_1.default.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    }
    runCycle(db) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("[PipelineWorker] Running ingestion cycle...");
            for (const connector of this.connectors) {
                try {
                    console.log(`[PipelineWorker] Fetching from ${connector.name}...`);
                    const rawItems = yield connector.fetchTrendingKeys();
                    for (const raw of rawItems) {
                        try {
                            const normalized = yield connector.normalize(raw);
                            normalized.normalizedPayloadHash = this.generateHash(normalized);
                            // Validate format
                            shared_1.TrendSignalSchema.parse(normalized);
                            // Insert
                            db.prepare(`
               INSERT OR IGNORE INTO trends_signals (
                 id, source_name, source_type, entity_type, entity_name, 
                 product_name, brand_name, category, timestamp, interest_score, 
                 velocity_score, confidence, normalized_payload_hash, region
               ) VALUES (
                 @id, @sourceName, @sourceType, @entityType, @entityName, 
                 @productName, @brandName, @category, @timestamp, @interestScore, 
                 @velocityScore, @confidence, @normalizedPayloadHash, @region
               )
             `).run(normalized);
                        }
                        catch (e) {
                            console.warn(`[PipelineWorker] Normalization/DB insertion failed for signal from ${connector.name}`);
                        }
                    }
                }
                catch (e) {
                    console.error(`[PipelineWorker] Error in connector ${connector.name}:`, e);
                }
            }
            console.log("[PipelineWorker] Ingestion cycle complete.");
        });
    }
}
exports.PipelineWorker = PipelineWorker;
