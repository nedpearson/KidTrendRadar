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
exports.PinterestConnector = void 0;
const crypto_1 = __importDefault(require("crypto"));
class PinterestConnector {
    constructor() {
        this.name = 'Pinterest Predicts Mocker';
        this.sourceType = 'pinterest';
    }
    fetchTrendingKeys() {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                { pin_id: "p1", keyword: "Tonies Audio Player Starter Set", search_volume: 12500, yoy_lift: 1.8, trend_type: "emerging" },
                { pin_id: "p2", keyword: "Hot Wheels Ultimate Garage", search_volume: 8500, yoy_lift: 2.4, trend_type: "breakout" }
            ];
        });
    }
    normalize(raw, region) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                id: crypto_1.default.randomUUID(),
                sourceName: 'Pinterest Predicts Trends',
                sourceType: 'pinterest',
                entityType: 'product', // inferring from typical pinterest kids trends
                entityName: raw.keyword,
                category: 'Education/Activity',
                timestamp: new Date().toISOString(),
                interestScore: Math.min(100, (raw.search_volume / 1000)),
                velocityScore: raw.yoy_lift * 20,
                confidence: 0.75, // Pinterest signals are highly reliable but often lagging
                region: region || "US",
                normalizedPayloadHash: ''
            };
        });
    }
}
exports.PinterestConnector = PinterestConnector;
