import { z } from "zod";

export const TrendSignalSchema = z.object({
  id: z.string().uuid(),
  sourceName: z.string(),
  sourceType: z.enum(["google_trends", "tiktok", "pinterest", "web", "retailer", "marketplace", "brand", "social", "manual"]),
  entityType: z.enum(["product", "brand", "character", "category", "keyword"]),
  entityName: z.string(),
  productName: z.string().optional(),
  brandName: z.string().optional(),
  category: z.string(),
  subcategory: z.string().optional(),
  region: z.string(), // local, national, international, or specific country code
  timestamp: z.string().datetime(),
  interestScore: z.number().min(0).max(100),
  velocityScore: z.number().min(-100).max(100),
  sentimentEstimate: z.number().min(-1).max(1).optional(),
  sourceUrl: z.string().url().optional(),
  productUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  imageUrls: z.array(z.string().url()).optional(),
  currency: z.string().length(3).optional(),
  observedPrice: z.number().nonnegative().optional(),
  availabilitySignal: z.enum(["in_stock", "out_of_stock", "preorder", "limited"]).optional(),
  confidence: z.number().min(0).max(1),
  rawPayload: z.record(z.any()).optional(),
  normalizedPayloadHash: z.string()
});

export type TrendSignal = z.infer<typeof TrendSignalSchema>;

export const ProductOpportunitySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  brand: z.string(),
  category: z.string(),
  description: z.string(),
  imageUrl: z.string().url().optional(),
  imageUrls: z.array(z.string().url()).optional(),
  compositeScore: z.number().min(0).max(100),
  subScores: z.object({
    popularity: z.number(),
    velocity: z.number(),
    earlySignal: z.number(),
    durability: z.number(),
    marginPotential: z.number(),
    sourcingConfidence: z.number(),
    saturationRisk: z.number(),
  }),
  insightReasoning: z.string(),
  timeframeCategory: z.enum(["past_2_weeks", "past_month", "upcoming", "all_time"]),
  durabilityClass: z.enum(["hyper-fad", "seasonal-spike", "core-staple"]).optional(),
  louisianaHitDate: z.string(),
  bestSource: z.object({
    url: z.string().url(),
    price: z.number(),
    confidence: z.number(),
    reason: z.string(),
  }).optional(),
  momentumData: z.array(z.object({
    date: z.string(),
    value: z.number()
  })),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type ProductOpportunity = z.infer<typeof ProductOpportunitySchema>;
