import express, { Request, Response } from 'express';
import cors from 'cors';
import { db, initDB } from './db';
import { PipelineWorker } from './ingestion';
import { LiveWebScraperConnector } from './ingestion/connectors/webScraper';
import { TrendScoringEngine } from './scoring/engine';
import { SourceFinderAgent } from './scoring/sourcingAgent';
import os from 'os';
import path from 'path';
import fs from 'fs';
import localtunnel from 'localtunnel';

import cron from 'node-cron';
require('dotenv').config();

// Initialize the Sync SQLite Database
console.log("Starting KidTrend Radar API...");
export const activeAgents: { forecaster: any, sourcing: any } = { forecaster: null, sourcing: null };
initDB();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Background Ingestion (Live AI Mode)
const worker = new PipelineWorker();
worker.register(new LiveWebScraperConnector());

const forecaster = new TrendScoringEngine(db);
const sourcingAgent = new SourceFinderAgent(db);

activeAgents.forecaster = forecaster;
activeAgents.sourcing = sourcingAgent;

// ----------------------------------------------------------------------------
// Automated System Cron Daemon (Overnight Analytics Sync)
// ----------------------------------------------------------------------------
cron.schedule('0 3 * * *', async () => {
   console.log('[System Cron] Executing 3:00 AM Global Ingestion Sequence');
   // Assuming basic iteration since this is highly personalized tracking
   const users = ['nedpearson@gmail.com'];
   for (const u of users) {
       await worker.runCycle(db, u);
       forecaster.processSignals({ username: u });
       await sourcingAgent.evaluateOpportunities({ username: u });
   }
});

// For Phase 4, trigger ingestion instantly & forecast & source locally just for demo
worker.runCycle(db).then(async () => {
   forecaster.processSignals();
   await sourcingAgent.evaluateOpportunities();
}).catch(console.error);

// ----------------------------------------------------------------------------
// API Routes (Desktop <-> Mobile / Local Sync)
// ----------------------------------------------------------------------------

let apiTunnelUrl = '';

// Start Localtunnel to completely proxy Windows Firewalled API Port remotely
(async () => {
    try {
        const tunnelApi = await localtunnel({ port: 4000, local_host: '127.0.0.1' });
        apiTunnelUrl = tunnelApi.url;
        
        console.log(`\n===========================================`);
        console.log(`🚀 API CLOUD TUNNEL: ${apiTunnelUrl}`);
        console.log(`===========================================\n`);
        
        // Save the API tunnel URL persistently to the offline React Native bundle config
        const mobileConfigDest = path.join(__dirname, '../../mobile/assets/tunnel-sync.json');
        if (!fs.existsSync(path.dirname(mobileConfigDest))) {
            fs.mkdirSync(path.dirname(mobileConfigDest), { recursive: true });
        }
        
        fs.writeFileSync(mobileConfigDest, JSON.stringify({ apiBase: apiTunnelUrl }));
        
        tunnelApi.on('close', () => console.log('API Tunnel Closed.'));
    } catch(e) {
        console.error("Failed to start Tunnel:", e);
    }
})();

app.get('/api/network-info', (req: Request, res: Response) => {
   const interfaces = os.networkInterfaces();
   let lanIp = '127.0.0.1';
   let adapterFound = false;

   // Pass 1: Prioritize actual physical Wi-Fi or local Ethernet networks over VMs
   const priorityAdapters = ['Wi-Fi', 'Ethernet', 'en0', 'eth0', 'wlan0'];
   
   for (const target of priorityAdapters) {
      if (adapterFound) break;
      for (const name of Object.keys(interfaces)) {
         if (name.toLowerCase().includes(target.toLowerCase())) {
            for (const iface of interfaces[name]!) {
               if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254')) {
                  lanIp = iface.address;
                  adapterFound = true;
                  break;
               }
            }
         }
      }
   }
   
   // Pass 2: Fallback to the very first non-internal IPv4 if no physical match was found
   if (!adapterFound) {
       for (const name of Object.keys(interfaces)) {
          if (adapterFound) break;
          // explicit skip of WSL/Virtual machine adapters if possible
          if (name.toLowerCase().includes('vbox') || name.toLowerCase().includes('vmware') || name.toLowerCase().includes('hyper-v') || name.toLowerCase().includes('wsl') || name.toLowerCase().includes('vethernet')) continue;
          
          for (const iface of interfaces[name]!) {
             if (iface.family === 'IPv4' && !iface.internal) {
                lanIp = iface.address;
                adapterFound = true;
                break;
             }
          }
       }
   }
   res.json({ ip: lanIp, mobileWebPort: process.env.MOBILE_WEB_PORT || 8082 });
});

app.get('/api/opportunities', async (req: Request, res: Response) => {
  try {
    const user = req.headers['x-kidtrend-user'] as string;
    
    // Explicit runtime evaluation of sourcing bots
    await activeAgents.sourcing?.evaluateOpportunities({ username: user });

    const opportunities = db.prepare('SELECT * FROM product_opportunities').all({ username: user });
    
    // Enrich with live local and online sources discovered
    const enriched = opportunities.map((o: any) => {
       const sources = db.prepare('SELECT * FROM sources WHERE opportunity_id = @id').all({ id: o.id, username: user });
       return { ...o, all_sources: sources };
    });
    
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/opportunities/:id/buy', (req: Request, res: Response) => {
  try {
    const user = req.headers['x-kidtrend-user'] as string;
    db.prepare(`UPDATE product_opportunities SET added_to_buying_center = 1 WHERE id = @id`).run({ id: req.params.id, username: user });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/opportunities/search', async (req: Request, res: Response) => {
  try {
    const user = req.headers['x-kidtrend-user'] as string;
    const { productName } = req.body;
    if (!productName) return res.status(400).json({ error: "Product name required" });

    const newOpp = {
      id: "search_" + Date.now().toString(),
      name: productName,
      category: "Custom Search Request",
      brand: "Unknown",
      compositeScore: 99,
      insightReasoning: `User manually triggered extensive research for "${productName}". The AI specifically targeted Baton Rouge first before falling back to small independent stores.`,
      subScores: { popularity: 85, velocity: 90, saturationRisk: 20, durability: 70, sourcingConfidence: 95 },
      subscore_popularity: 85,
      subscore_sourcing_confidence: 95,
      all_sources: []
    };

    db.prepare(`INSERT INTO product_opportunities`).run({ ...newOpp, username: user });
    
    // Explicitly command the agent to run exhaustive research now
    await activeAgents.sourcing?.evaluateOpportunities({ username: user });

    // Return the fresh data WITH the newly scraped local sources
    const fullyResearched = db.prepare('SELECT * FROM product_opportunities').all({ username: user }).find((o: any) => o.id === newOpp.id);
    const sources = db.prepare('SELECT * FROM sources WHERE opportunity_id = @id').all({ id: newOpp.id, username: user });
    
    res.json({ ...fullyResearched, all_sources: sources });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/watchlists', (req: Request, res: Response) => {
  try {
    const user = req.headers['x-kidtrend-user'] as string;
    const watchlists = db.prepare('SELECT * FROM watchlists').all({ username: user });
    res.json(watchlists);
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sources/:id', (req: Request, res: Response) => {
  try {
    const user = req.headers['x-kidtrend-user'] as string;
    const sources = db.prepare('SELECT * FROM sources').all({ id: req.params.id, username: user });
    res.json(sources);
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/watchlists', (req: Request, res: Response) => {
  try {
    const data = req.body;
    const user = req.headers['x-kidtrend-user'] as string;
    db.prepare('INSERT INTO watchlists').run({ ...data, id: Date.now().toString(), username: user });
    res.json({ success: true });
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ngrok-qr', (req: Request, res: Response) => {
   // Desktop independently fetches the fully qualified Metro Localtunnel URL (which bypasses Firewall)
   try {
       const packagerPath = path.join(__dirname, '../../mobile/.expo/packager-info.json');
       if(fs.existsSync(packagerPath)) {
           const info = JSON.parse(fs.readFileSync(packagerPath, 'utf8'));
           if(info.packagerNgrokUrl) {
               // Must replace https:// with exp:// so Expo Go camera parser recognizes it!
               const expUrl = info.packagerNgrokUrl.replace(/^https?:\/\//, 'exp://');
               return res.json({ qr: expUrl });
           }
       }
       res.json({ qr: null });
   } catch(e) {
       res.json({ qr: null });
   }
});

app.get('/api/sync/signals', async (req: Request, res: Response) => {
  try {
    const user = req.headers['x-kidtrend-user'] as string;
    
    // Explicit runtime evaluation
    activeAgents.forecaster?.processSignals({ username: user });

    const signals = db.prepare('SELECT * FROM trends_signals ORDER BY timestamp DESC').all({ username: user });
    res.json(signals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ingest', async (req: Request, res: Response) => {
  try {
    const user = req.headers['x-kidtrend-user'] as string;
    // Visually trigger the active scraper
    await worker.runCycle(db, user);
    // Explicitly run trend forecast matrix locally against new data
    activeAgents.forecaster?.processSignals({ username: user });
    
    // Evaluate for Mobile Push Notification Alert via Velocity Trigger!
    const signals = db.prepare('SELECT * FROM trends_signals ORDER BY timestamp DESC LIMIT 5').all({ username: user });
    const pushTokenRec = db.prepare('SELECT push_token FROM mobile_devices WHERE username = @username LIMIT 1').get({ username: user }) as { push_token: string } | undefined;
    
    if (pushTokenRec && pushTokenRec.push_token) {
        const spikes = signals.filter((s:any) => s.velocity_score >= 90);
        if (spikes.length > 0) {
            console.log(`\n\n🚨 [EXPO PUSH SIMULATOR] Dispatching Live Notification to ${pushTokenRec.push_token}`);
            console.log(`Title: 🚨 VELOCITY SPIKE: ${spikes[0].entity_name}`);
            console.log(`Body: Surging ${spikes[0].velocity_score}% regionally. Tap to execute strategy.\n\n`);
        }
    }
    
    res.json({ success: true });
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin CRON Job execution simulation
app.post('/api/admin/briefing', async (req: Request, res: Response) => {
    try {
        const user = req.headers['x-kidtrend-user'] as string;
        console.log(`\n\n📧 [EMAIL SIMULATOR] Synthesizing Friday Executive Briefing for ${user}...`);
        
        const rawOpps = db.prepare('SELECT * FROM product_opportunities').all({ username: user });
        const opps = rawOpps.map((o:any) => {
           let parsedScores = {};
           try { parsedScores = typeof o.subScores === 'string' ? JSON.parse(o.subScores) : (o.subScores || {}); } catch(e){}
           return { name: o.name, category: o.category, score: o.compositeScore, insight: o.insightReasoning, velocity: o.subscore_velocity || (parsedScores as any).velocity || 0 };
        }).sort((a:any, b:any) => b.score - a.score).slice(0, 10);
        
        const { OpenAI } = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const prompt = `Write a clean, professional HTML Executive Briefing Email summarizing these KidTrend targets to buy:
        ${JSON.stringify(opps)}
        Make it sound like an elite intelligence report. Do not use markdown backticks in the response, just return bare HTML.`;
        
        const completion = await openai.chat.completions.create({
           model: "gpt-4o",
           messages: [{ role: "user", content: prompt }]
        });
        
        res.json({ success: true, emailContent: completion.choices[0].message.content });
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Register Mobile API Token
app.post('/api/notifications/register-token', (req: Request, res: Response) => {
    try {
        const { pushToken } = req.body;
        const user = req.headers['x-kidtrend-user'] as string;
        
        // Ensure table exists for tracking devices
        db.prepare(`
          CREATE TABLE IF NOT EXISTS mobile_devices (
             username TEXT PRIMARY KEY,
             push_token TEXT,
             updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run({});
        
        db.prepare('INSERT OR REPLACE INTO mobile_devices (username, push_token, updated_at) VALUES (@username, @pushToken, CURRENT_TIMESTAMP)')
          .run({ username: user, pushToken });
          
        res.json({ success: true });
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Shopify Commerce Webhook Integration Simulation
app.post('/api/integrations/shopify', (req: Request, res: Response) => {
    try {
        const { opportunityId, campaignContent } = req.body;
        const user = req.headers['x-kidtrend-user'] as string;
        
        // In a live physical environment, this parses an Admin API Key and executes fetch('https://{store}.myshopify.com/admin/api/2023-01/products.json')
        console.log(`\n\n🛒 [SHOPIFY POS SIMULATOR] Pushing Opportunity ${opportunityId} to Shopify Drafts...`);
        console.log(`[Payload Transmitted] Description Copy: ${campaignContent}`);
        
        setTimeout(() => {
           res.json({ success: true, message: `Successfully pushed Draft Product to Shopify Admin API.` });
        }, 1000);
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chat-copilot', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const user = req.headers['x-kidtrend-user'] as string;
    const opps = db.prepare('SELECT * FROM product_opportunities').all({ username: user });
    
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const contextStr = opps.map((o: any) => `- Name: ${o.name}, Durability: ${o.durabilityClass}, Velocity: ${o.subscore_velocity || o.subScores?.velocity}, Action: ${o.insightReasoning}`).join("\\n");
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are the KidTrend Strategic Co-Pilot. You advise retail buyers on inventory. ONLY reference the provided database context. Keep answers short and strategic." },
        { role: "system", content: `CURRENT DATABASE CONTEXT:\n${contextStr}` },
        { role: "user", content: message }
      ]
    });
    
    res.json({ response: completion.choices[0].message.content });
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const oppId = req.params.id;
    const user = req.headers['x-kidtrend-user'] as string;
    const opp = db.prepare('SELECT * FROM product_opportunities').all({ username: user }).find((o: any) => o.id === oppId);
    
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
    
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const prompt = `You are an expert social media manager for a local children's boutique in Louisiana.
    Write two highly engaging, viral giveaway posts for the trending item: "${opp.name}".
    This item has a Louisiana Arrival ETA of: ${opp.louisianaHitDate}.
    
    1. A short, punchy script/caption for Coverstar (a kid/tween dance video app). Focus on energy, dancing, or cool transitions.
    2. A highly aesthetic, engaging Instagram caption for moms/parents. Focus on tagging friends to enter.
    
    Return exactly a JSON object: { "coverstar": "string", "instagram": "string" }`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }]
    });
    
    const campaigns = JSON.parse(completion.choices[0].message.content);
    res.json(campaigns);
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sync/operations', (req: Request, res: Response) => {
  const operations = req.body;
  if (!Array.isArray(operations)) {
    return res.status(400).json({ error: "Expected an array of operations" });
  }

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO sync_operations_log 
    (operation_id, table_name, record_id, action, payload, timestamp, origin_device_id) 
    VALUES (@operationId, @tableName, @recordId, @action, @payload, @timestamp, @originDeviceId)
  `);

  const tx = db.transaction((ops: any[]) => {
    for (const op of ops) {
      insertStmt.run(op);
    }
  });

  try {
    tx(operations);
    res.json({ success: true, processed: operations.length });
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Serve the pre-built Expo web app at /app  (port 4000, already LAN-accessible)
// The QR code points here: http://LAN_IP:4000/app?user=ned&ip=192.168.x.x
// ---------------------------------------------------------------------------
const WEB_DIST = path.resolve(__dirname, '../../mobile/web-dist');

if (fs.existsSync(WEB_DIST)) {
  // Inject user & ip into the HTML at request time
  app.get('/app', (req: Request, res: Response) => {
    const user   = (req.query.user   as string) || '';
    const ip     = (req.query.ip     as string) || '';
    const tunnel = (req.query.tunnel as string) || '';
    const indexPath = path.join(WEB_DIST, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    const injection = `<script>window.__KIDTREND_CONFIG={user:${JSON.stringify(user)},ip:${JSON.stringify(ip)},tunnel:${JSON.stringify(tunnel)}};</script>`;
    html = html.replace('<head>', `<head>${injection}`);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // Expo's built assets use absolute paths like /_expo/static/... and /assets/...
  // Mount these at the root so the browser resolves them correctly from any base path
  app.use('/_expo', express.static(path.join(WEB_DIST, '_expo')));
  app.use('/assets', express.static(path.join(WEB_DIST, 'assets')));
  app.use('/app', express.static(WEB_DIST));
  console.log('📱 Mobile field app served at http://YOUR_LAN_IP:4000/app');
} else {
  console.warn('⚠️  web-dist not found — run in apps/mobile: npx expo export --platform web --output-dir ./web-dist');
}

// ---------------------------------------------------------------------------
// Serve the pre-built Desktop Dashboard PWA at /  (Root)
// This allows the full desktop experience on the phone via public tunnel
// ---------------------------------------------------------------------------
const DESKTOP_DIST = path.resolve(__dirname, '../../desktop/dist');

if (fs.existsSync(DESKTOP_DIST)) {
  // If hitting root with query parameters (e.g., ?user=), serve the HTML directly
  // so the frontend can read the params.
  app.use('/', express.static(DESKTOP_DIST));

  // Handle SPA routing
  app.get('*', (req: Request, res: Response, next) => {
     if (req.url.startsWith('/api') || req.url.startsWith('/app') || req.url.startsWith('/_expo')) return next();
     res.sendFile(path.join(DESKTOP_DIST, 'index.html'));
  });
  console.log('💻 Desktop Dashboard PWA served at http://YOUR_LAN_IP:4000/');
} else {
  console.warn('⚠️  Desktop dist not found — run in apps/desktop: npm run build');
}

const PORT = parseInt(String(process.env.PORT || '4000'), 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`KidTrend Local Sync Server running on http://0.0.0.0:${PORT}`);
});
