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
exports.TikTokConnector = void 0;
const crypto_1 = __importDefault(require("crypto"));
class TikTokConnector {
    constructor() {
        this.name = 'TikTok Creative Center Mocker';
        this.sourceType = 'tiktok';
    }
    fetchTrendingKeys() {
        return __awaiter(this, void 0, void 0, function* () {
            // Simulated Payload (Authentic APIs would return these actual real-world brands)
            return [
                { id: "tt1", title: "LEGO Creator 3-in-1 Space Roller Coaster", rank: 1, view_growth: 850, region: "US", category: "Toys", url: "https://tiktok.com/tag/lego" },
                { id: "tt2", title: "Squishmallows Pikachu 14-Inch", rank: 2, view_growth: 720, region: "UK", category: "Plush", url: "https://tiktok.com/tag/squishmallows" },
                { id: "tt3", title: "Magnatiles 100-Piece Clear Colors Set", rank: 3, view_growth: 690, region: "US", category: "Education", url: "https://tiktok.com/tag/magnatiles" }
            ];
        });
    }
    normalize(raw, region) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                id: crypto_1.default.randomUUID(),
                sourceName: 'TikTok Creative Center',
                sourceType: 'tiktok',
                entityType: 'product',
                entityName: raw.title,
                productName: raw.title,
                category: raw.category,
                timestamp: new Date().toISOString(),
                interestScore: Math.min(100, (raw.view_growth / 10)),
                velocityScore: Math.min(100, (raw.view_growth / 5)), // high penalty for slow growth, high for fast
                confidence: 0.85,
                region: raw.region || region || "US",
                normalizedPayloadHash: '' // Populated by worker
            };
        });
    }
}
exports.TikTokConnector = TikTokConnector;
