import { TrendSignal, TrendSignalSchema } from '@kidtrend-radar/shared';
import crypto from 'crypto';

export interface BaseConnector {
  name: string;
  sourceType: TrendSignal['sourceType'];
  fetchTrendingKeys(): Promise<any[]>;
  normalize(raw: any, region?: string): Promise<TrendSignal>;
}

export class PipelineWorker {
  private connectors: BaseConnector[] = [];

  register(connector: BaseConnector) {
    this.connectors.push(connector);
  }

  generateHash(payload: Record<string, any>): string {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  async runCycle(db: any, username?: string) {
    console.log(`[PipelineWorker] Running ingestion cycle for tenant: ${username || 'default'}...`);
    for (const connector of this.connectors) {
      try {
        console.log(`[PipelineWorker] Fetching from ${connector.name}...`);
        const rawItems = await connector.fetchTrendingKeys();
        
        for (const raw of rawItems) {
          try {
             const normalized = await connector.normalize(raw);
             normalized.normalizedPayloadHash = this.generateHash(normalized);
             
             // Validate format
             TrendSignalSchema.parse(normalized);
             
             // Insert
             db.prepare(`
               INSERT OR IGNORE INTO trends_signals (
                 id, source_name, source_type, entity_type, entity_name, 
                 product_name, brand_name, category, timestamp, interest_score, 
                 velocity_score, confidence, normalized_payload_hash, region, description, image_url
               ) VALUES (
                 @id, @sourceName, @sourceType, @entityType, @entityName, 
                 @productName, @brandName, @category, @timestamp, @interestScore, 
                 @velocityScore, @confidence, @normalizedPayloadHash, @region, @description, @image_url
               )
             `).run({ ...normalized, username: username || 'default' });
          } catch(e) {
            console.warn(`[PipelineWorker] Normalization/DB insertion failed for signal from ${connector.name}`);
          }
        }
      } catch (e) {
        console.error(`[PipelineWorker] Error in connector ${connector.name}:`, e);
      }
    }
    console.log("[PipelineWorker] Ingestion cycle complete.");
  }
}
