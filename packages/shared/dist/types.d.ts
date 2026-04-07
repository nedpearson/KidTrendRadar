import { z } from "zod";
export declare const TrendSignalSchema: z.ZodObject<{
    id: z.ZodString;
    sourceName: z.ZodString;
    sourceType: z.ZodEnum<["google_trends", "tiktok", "pinterest", "web", "retailer", "marketplace", "brand", "social", "manual"]>;
    entityType: z.ZodEnum<["product", "brand", "character", "category", "keyword"]>;
    entityName: z.ZodString;
    productName: z.ZodOptional<z.ZodString>;
    brandName: z.ZodOptional<z.ZodString>;
    category: z.ZodString;
    subcategory: z.ZodOptional<z.ZodString>;
    region: z.ZodString;
    timestamp: z.ZodString;
    interestScore: z.ZodNumber;
    velocityScore: z.ZodNumber;
    sentimentEstimate: z.ZodOptional<z.ZodNumber>;
    sourceUrl: z.ZodOptional<z.ZodString>;
    productUrl: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodString>;
    currency: z.ZodOptional<z.ZodString>;
    observedPrice: z.ZodOptional<z.ZodNumber>;
    availabilitySignal: z.ZodOptional<z.ZodEnum<["in_stock", "out_of_stock", "preorder", "limited"]>>;
    confidence: z.ZodNumber;
    rawPayload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    normalizedPayloadHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    sourceName: string;
    sourceType: "google_trends" | "tiktok" | "pinterest" | "web" | "retailer" | "marketplace" | "brand" | "social" | "manual";
    entityType: "brand" | "product" | "character" | "category" | "keyword";
    category: string;
    entityName: string;
    region: string;
    timestamp: string;
    interestScore: number;
    velocityScore: number;
    confidence: number;
    normalizedPayloadHash: string;
    productName?: string | undefined;
    brandName?: string | undefined;
    subcategory?: string | undefined;
    sentimentEstimate?: number | undefined;
    sourceUrl?: string | undefined;
    productUrl?: string | undefined;
    imageUrl?: string | undefined;
    currency?: string | undefined;
    observedPrice?: number | undefined;
    availabilitySignal?: "in_stock" | "out_of_stock" | "preorder" | "limited" | undefined;
    rawPayload?: Record<string, any> | undefined;
}, {
    id: string;
    sourceName: string;
    sourceType: "google_trends" | "tiktok" | "pinterest" | "web" | "retailer" | "marketplace" | "brand" | "social" | "manual";
    entityType: "brand" | "product" | "character" | "category" | "keyword";
    category: string;
    entityName: string;
    region: string;
    timestamp: string;
    interestScore: number;
    velocityScore: number;
    confidence: number;
    normalizedPayloadHash: string;
    productName?: string | undefined;
    brandName?: string | undefined;
    subcategory?: string | undefined;
    sentimentEstimate?: number | undefined;
    sourceUrl?: string | undefined;
    productUrl?: string | undefined;
    imageUrl?: string | undefined;
    currency?: string | undefined;
    observedPrice?: number | undefined;
    availabilitySignal?: "in_stock" | "out_of_stock" | "preorder" | "limited" | undefined;
    rawPayload?: Record<string, any> | undefined;
}>;
export type TrendSignal = z.infer<typeof TrendSignalSchema>;
export declare const ProductOpportunitySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    brand: z.ZodString;
    category: z.ZodString;
    description: z.ZodString;
    compositeScore: z.ZodNumber;
    subScores: z.ZodObject<{
        popularity: z.ZodNumber;
        velocity: z.ZodNumber;
        earlySignal: z.ZodNumber;
        durability: z.ZodNumber;
        marginPotential: z.ZodNumber;
        sourcingConfidence: z.ZodNumber;
        saturationRisk: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        popularity: number;
        velocity: number;
        earlySignal: number;
        durability: number;
        marginPotential: number;
        sourcingConfidence: number;
        saturationRisk: number;
    }, {
        popularity: number;
        velocity: number;
        earlySignal: number;
        durability: number;
        marginPotential: number;
        sourcingConfidence: number;
        saturationRisk: number;
    }>;
    insightReasoning: z.ZodString;
    timeframeCategory: z.ZodEnum<["past_2_weeks", "past_month", "upcoming", "all_time"]>;
    durabilityClass: z.ZodOptional<z.ZodEnum<["hyper-fad", "seasonal-spike", "core-staple"]>>;
    louisianaHitDate: z.ZodString;
    bestSource: z.ZodOptional<z.ZodObject<{
        url: z.ZodString;
        price: z.ZodNumber;
        confidence: z.ZodNumber;
        reason: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        url: string;
        price: number;
        reason: string;
    }, {
        confidence: number;
        url: string;
        price: number;
        reason: string;
    }>>;
    momentumData: z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        value: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        value: number;
        date: string;
    }, {
        value: number;
        date: string;
    }>, "many">;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    brand: string;
    category: string;
    name: string;
    description: string;
    compositeScore: number;
    subScores: {
        popularity: number;
        velocity: number;
        earlySignal: number;
        durability: number;
        marginPotential: number;
        sourcingConfidence: number;
        saturationRisk: number;
    };
    insightReasoning: string;
    timeframeCategory: "past_2_weeks" | "past_month" | "upcoming" | "all_time";
    louisianaHitDate: string;
    momentumData: {
        value: number;
        date: string;
    }[];
    createdAt: string;
    updatedAt: string;
    durabilityClass?: "hyper-fad" | "seasonal-spike" | "core-staple" | undefined;
    bestSource?: {
        confidence: number;
        url: string;
        price: number;
        reason: string;
    } | undefined;
}, {
    id: string;
    brand: string;
    category: string;
    name: string;
    description: string;
    compositeScore: number;
    subScores: {
        popularity: number;
        velocity: number;
        earlySignal: number;
        durability: number;
        marginPotential: number;
        sourcingConfidence: number;
        saturationRisk: number;
    };
    insightReasoning: string;
    timeframeCategory: "past_2_weeks" | "past_month" | "upcoming" | "all_time";
    louisianaHitDate: string;
    momentumData: {
        value: number;
        date: string;
    }[];
    createdAt: string;
    updatedAt: string;
    durabilityClass?: "hyper-fad" | "seasonal-spike" | "core-staple" | undefined;
    bestSource?: {
        confidence: number;
        url: string;
        price: number;
        reason: string;
    } | undefined;
}>;
export type ProductOpportunity = z.infer<typeof ProductOpportunitySchema>;
