import fs from 'fs';
import path from 'path';

const dbDir = path.join(__dirname, '../../../../local-data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

type DbSchema = { trends_signals: any[], product_opportunities: any[], sync_operations_log: any[], watchlists: any[], sources: any[] };

let masterDb: Record<string, DbSchema> = {};

export function initDB() {
   // Initially we just load the legacy 'default' db or leave it blank until requests come in.
   // The individual user DBs will be lazy-loaded in verifyUserDb.
   verifyUserDb('default');
   console.log("Multi-Tenant DB Engine Initialized!");
}

function verifyUserDb(username: string) {
   if (!username) username = 'default';
   if (!masterDb[username]) {
     const userFile = path.join(dbDir, `kidtrend_${username}.json`);
     // Load legacy file for default if valid
     const legacyFile = path.join(dbDir, 'kidtrend.json');
     
     // All new tenants should clone the legacy master DB to get starting signals & opportunities
     let initialFile = fs.existsSync(userFile) ? userFile : (fs.existsSync(legacyFile) ? legacyFile : null);
     
     let instance: DbSchema = { trends_signals: [], product_opportunities: [], sync_operations_log: [], watchlists: [], sources: [] };
     if (initialFile) {
        try {
           const parsed = JSON.parse(fs.readFileSync(initialFile, 'utf-8'));
           // Only merge if not corrupt
           if (typeof parsed === 'object') {
              // Deep copy arrays to detach references from sibling tenant branches
              instance = { 
                trends_signals: [...(parsed.trends_signals || [])], 
                product_opportunities: [...(parsed.product_opportunities || [])], 
                sync_operations_log: [...(parsed.sync_operations_log || [])], 
                watchlists: [...(parsed.watchlists || [])], 
                sources: [...(parsed.sources || [])]
              };
           }
        } catch(e) { }
     }
     
     if (!instance.watchlists) instance.watchlists = [];
     if (!instance.sources) instance.sources = [];
     
     masterDb[username] = instance;
   }
   return masterDb[username];
}

function persist(username: string) {
   if (!username) username = 'default';
   const userFile = path.join(dbDir, `kidtrend_${username}.json`);
   fs.writeFileSync(userFile, JSON.stringify(masterDb[username], null, 2));
}

export const db = {
  prepare: (sql: string) => {
    return {
      all: (params?: any) => {
        const u = params?.username || 'default';
        const data = verifyUserDb(u);
        
        if (sql.includes('trends_signals')) {
          if (sql.includes('WHERE entity_name =')) {
             return data.trends_signals.filter(s => s.entity_name === params.entityName);
          }
          return data.trends_signals;
        }
        if (sql.includes('product_opportunities')) {
          return data.product_opportunities;
        }
        if (sql.includes('watchlists')) {
          return data.watchlists;
        }
        if (sql.includes('sources')) {
          if (params?.id) return data.sources.filter(s => s.opportunityId === params.id);
          return data.sources;
        }
        return [];
      },
      get: (params?: any) => {
        const u = params?.username || 'default';
        const data = verifyUserDb(u);
        
        if (sql.includes('product_opportunities')) {
          return data.product_opportunities.find(o => o.id === params.id || o.name === params.name);
        }
        return null;
      },
      run: (params: any) => {
        const u = params?.username || 'default';
        const data = verifyUserDb(u);
        
        if (sql.includes('UPDATE product_opportunities SET added_to_buying_center = 1')) {
             const exist = data.product_opportunities.findIndex(o => o.id === params.id);
             if (exist !== -1) {
                data.product_opportunities[exist].added_to_buying_center = true;
                persist(u);
             }
        } else if (sql.includes('UPDATE product_opportunities')) {
             const exist = data.product_opportunities.findIndex(o => o.id === params.id);
             if (exist !== -1) {
                data.product_opportunities[exist].bestSource = {
                  url: params.url,
                  price: params.price,
                  confidence: params.confidence,
                  reason: params.reason
                };
                data.product_opportunities[exist].subScores.marginPotential = params.margin;
                data.product_opportunities[exist].subScores.sourcingConfidence = params.sourcingConf;
                persist(u);
             }
        }
        if (sql.includes('INSERT') && sql.includes('trends_signals')) {
             if(!data.trends_signals.find(s => s.normalized_payload_hash === params.normalizedPayloadHash)) {
                data.trends_signals.push({
                   ...params,
                   interest_score: params.interestScore,
                   velocity_score: params.velocityScore,
                   normalized_payload_hash: params.normalizedPayloadHash,
                   entity_name: params.entityName,
                   source_name: params.sourceName,
                   source_type: params.sourceType,
                   entity_type: params.entityType,
                   product_name: params.productName,
                   brand_name: params.brandName,
                   description: params.description,
                   image_url: params.image_url
                });
                persist(u);
             }
        }
        if (sql.includes('INSERT') && sql.includes('product_opportunities')) {
             const exist = data.product_opportunities.findIndex(o => o.id === params.id);
             if (exist !== -1) {
                data.product_opportunities[exist] = { ...data.product_opportunities[exist], ...params, updatedAt: new Date().toISOString() };
             } else {
                data.product_opportunities.push(params);
             }
             persist(u);
        }
        if (sql.includes('INSERT') && sql.includes('watchlists')) {
             data.watchlists.push(params);
             persist(u);
        }
        if (sql.includes('INSERT INTO sources')) {
             data.sources.push(params);
             persist(u);
        }
        if (sql.includes('sync_operations_log')) {
             data.sync_operations_log.push(params);
             persist(u);
        }
      }
    }
  },
  transaction: (fn: any) => {
    return (ops: any[], username?: string) => {
      fn(ops);
      // Transactions should pass username directly to queries, persist handled in queries
    }
  }
};

