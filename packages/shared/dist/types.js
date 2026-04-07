"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductOpportunitySchema = exports.TrendSignalSchema = void 0;
const zod_1 = require("zod");
exports.TrendSignalSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sourceName: zod_1.z.string(),
    sourceType: zod_1.z.enum(["google_trends", "tiktok", "pinterest", "web", "retailer", "marketplace", "brand", "social", "manual"]),
    entityType: zod_1.z.enum(["product", "brand", "character", "category", "keyword"]),
    entityName: zod_1.z.string(),
    productName: zod_1.z.string().optional(),
    brandName: zod_1.z.string().optional(),
    category: zod_1.z.string(),
    subcategory: zod_1.z.string().optional(),
    region: zod_1.z.string(), // local, national, international, or specific country code
    timestamp: zod_1.z.string().datetime(),
    interestScore: zod_1.z.number().min(0).max(100),
    velocityScore: zod_1.z.number().min(-100).max(100),
    sentimentEstimate: zod_1.z.number().min(-1).max(1).optional(),
    sourceUrl: zod_1.z.string().url().optional(),
    productUrl: zod_1.z.string().url().optional(),
    imageUrl: zod_1.z.string().url().optional(),
    currency: zod_1.z.string().length(3).optional(),
    observedPrice: zod_1.z.number().nonnegative().optional(),
    availabilitySignal: zod_1.z.enum(["in_stock", "out_of_stock", "preorder", "limited"]).optional(),
    confidence: zod_1.z.number().min(0).max(1),
    rawPayload: zod_1.z.record(zod_1.z.any()).optional(),
    normalizedPayloadHash: zod_1.z.string()
});
exports.ProductOpportunitySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    brand: zod_1.z.string(),
    category: zod_1.z.string(),
    description: zod_1.z.string(),
    compositeScore: zod_1.z.number().min(0).max(100),
    subScores: zod_1.z.object({
        popularity: zod_1.z.number(),
        velocity: zod_1.z.number(),
        earlySignal: zod_1.z.number(),
        durability: zod_1.z.number(),
        marginPotential: zod_1.z.number(),
        sourcingConfidence: zod_1.z.number(),
        saturationRisk: zod_1.z.number(),
    }),
    insightReasoning: zod_1.z.string(),
    timeframeCategory: zod_1.z.enum(["past_2_weeks", "past_month", "upcoming", "all_time"]),
    durabilityClass: zod_1.z.enum(["hyper-fad", "seasonal-spike", "core-staple"]).optional(),
    louisianaHitDate: zod_1.z.string(),
    bestSource: zod_1.z.object({
        url: zod_1.z.string().url(),
        price: zod_1.z.number(),
        confidence: zod_1.z.number(),
        reason: zod_1.z.string(),
    }).optional(),
    momentumData: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string(),
        value: zod_1.z.number()
    })),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime()
});
