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
exports.activeAgents = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./db");
const ingestion_1 = require("./ingestion");
const webScraper_1 = require("./ingestion/connectors/webScraper");
const engine_1 = require("./scoring/engine");
const sourcingAgent_1 = require("./scoring/sourcingAgent");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const localtunnel_1 = __importDefault(require("localtunnel"));
// Initialize the Sync SQLite Database
console.log("Starting KidTrend Radar API...");
exports.activeAgents = { forecaster: null, sourcing: null };
(0, db_1.initDB)();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize Background Ingestion (Live AI Mode)
const worker = new ingestion_1.PipelineWorker();
worker.register(new webScraper_1.LiveWebScraperConnector());
const forecaster = new engine_1.TrendScoringEngine(db_1.db);
const sourcingAgent = new sourcingAgent_1.SourceFinderAgent(db_1.db);
exports.activeAgents.forecaster = forecaster;
exports.activeAgents.sourcing = sourcingAgent;
// For Phase 4, trigger ingestion instantly & forecast & source
worker.runCycle(db_1.db).then(() => __awaiter(void 0, void 0, void 0, function* () {
    forecaster.processSignals();
    yield sourcingAgent.evaluateOpportunities();
})).catch(console.error);
// ----------------------------------------------------------------------------
// API Routes (Desktop <-> Mobile / Local Sync)
// ----------------------------------------------------------------------------
let apiTunnelUrl = '';
// Start Localtunnel to completely proxy Windows Firewalled API Port remotely
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tunnelApi = yield (0, localtunnel_1.default)({ port: 4000, local_host: '127.0.0.1' });
        apiTunnelUrl = tunnelApi.url;
        console.log(`\n===========================================`);
        console.log(`🚀 API CLOUD TUNNEL: ${apiTunnelUrl}`);
        console.log(`===========================================\n`);
        // Save the API tunnel URL persistently to the offline React Native bundle config
        const mobileConfigDest = path_1.default.join(__dirname, '../../mobile/assets/tunnel-sync.json');
        if (!fs_1.default.existsSync(path_1.default.dirname(mobileConfigDest))) {
            fs_1.default.mkdirSync(path_1.default.dirname(mobileConfigDest), { recursive: true });
        }
        fs_1.default.writeFileSync(mobileConfigDest, JSON.stringify({ apiBase: apiTunnelUrl }));
        tunnelApi.on('close', () => console.log('API Tunnel Closed.'));
    }
    catch (e) {
        console.error("Failed to start Tunnel:", e);
    }
}))();
app.get('/api/network-info', (req, res) => {
    const interfaces = os_1.default.networkInterfaces();
    let lanIp = '127.0.0.1';
    let adapterFound = false;
    // Pass 1: Prioritize actual physical Wi-Fi or local Ethernet networks over VMs
    const priorityAdapters = ['Wi-Fi', 'Ethernet', 'en0', 'eth0', 'wlan0'];
    for (const target of priorityAdapters) {
        if (adapterFound)
            break;
        for (const name of Object.keys(interfaces)) {
            if (name.toLowerCase().includes(target.toLowerCase())) {
                for (const iface of interfaces[name]) {
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
            if (adapterFound)
                break;
            // explicit skip of WSL/Virtual machine adapters if possible
            if (name.toLowerCase().includes('vbox') || name.toLowerCase().includes('vmware') || name.toLowerCase().includes('hyper-v') || name.toLowerCase().includes('wsl') || name.toLowerCase().includes('vethernet'))
                continue;
            for (const iface of interfaces[name]) {
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
app.get('/api/opportunities', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = req.headers['x-kidtrend-user'];
        // Explicit runtime evaluation of sourcing bots
        yield ((_a = exports.activeAgents.sourcing) === null || _a === void 0 ? void 0 : _a.evaluateOpportunities({ username: user }));
        const opportunities = db_1.db.prepare('SELECT * FROM product_opportunities').all({ username: user });
        // Enrich with live local and online sources discovered
        const enriched = opportunities.map((o) => {
            const sources = db_1.db.prepare('SELECT * FROM sources WHERE opportunity_id = @id').all({ id: o.id, username: user });
            return Object.assign(Object.assign({}, o), { all_sources: sources });
        });
        res.json(enriched);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}));
app.post('/api/opportunities/:id/buy', (req, res) => {
    try {
        const user = req.headers['x-kidtrend-user'];
        db_1.db.prepare(`UPDATE product_opportunities SET added_to_buying_center = 1 WHERE id = @id`).run({ id: req.params.id, username: user });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/opportunities/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = req.headers['x-kidtrend-user'];
        const { productName } = req.body;
        if (!productName)
            return res.status(400).json({ error: "Product name required" });
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
        db_1.db.prepare(`INSERT INTO product_opportunities`).run(Object.assign(Object.assign({}, newOpp), { username: user }));
        // Explicitly command the agent to run exhaustive research now
        yield ((_a = exports.activeAgents.sourcing) === null || _a === void 0 ? void 0 : _a.evaluateOpportunities({ username: user }));
        // Return the fresh data WITH the newly scraped local sources
        const fullyResearched = db_1.db.prepare('SELECT * FROM product_opportunities').all({ username: user }).find((o) => o.id === newOpp.id);
        const sources = db_1.db.prepare('SELECT * FROM sources WHERE opportunity_id = @id').all({ id: newOpp.id, username: user });
        res.json(Object.assign(Object.assign({}, fullyResearched), { all_sources: sources }));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}));
app.get('/api/watchlists', (req, res) => {
    try {
        const user = req.headers['x-kidtrend-user'];
        const watchlists = db_1.db.prepare('SELECT * FROM watchlists').all({ username: user });
        res.json(watchlists);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/sources/:id', (req, res) => {
    try {
        const user = req.headers['x-kidtrend-user'];
        const sources = db_1.db.prepare('SELECT * FROM sources').all({ id: req.params.id, username: user });
        res.json(sources);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/watchlists', (req, res) => {
    try {
        const data = req.body;
        const user = req.headers['x-kidtrend-user'];
        db_1.db.prepare('INSERT INTO watchlists').run(Object.assign(Object.assign({}, data), { id: Date.now().toString(), username: user }));
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/ngrok-qr', (req, res) => {
    // Desktop independently fetches the fully qualified Metro Localtunnel URL (which bypasses Firewall)
    try {
        const packagerPath = path_1.default.join(__dirname, '../../mobile/.expo/packager-info.json');
        if (fs_1.default.existsSync(packagerPath)) {
            const info = JSON.parse(fs_1.default.readFileSync(packagerPath, 'utf8'));
            if (info.packagerNgrokUrl) {
                // Must replace https:// with exp:// so Expo Go camera parser recognizes it!
                const expUrl = info.packagerNgrokUrl.replace(/^https?:\/\//, 'exp://');
                return res.json({ qr: expUrl });
            }
        }
        res.json({ qr: null });
    }
    catch (e) {
        res.json({ qr: null });
    }
});
app.get('/api/sync/signals', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = req.headers['x-kidtrend-user'];
        // Explicit runtime evaluation
        (_a = exports.activeAgents.forecaster) === null || _a === void 0 ? void 0 : _a.processSignals({ username: user });
        const signals = db_1.db.prepare('SELECT * FROM trends_signals ORDER BY timestamp DESC').all({ username: user });
        res.json(signals);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}));
app.post('/api/ingest', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = req.headers['x-kidtrend-user'];
        // Visually trigger the active scraper
        yield worker.runCycle(db_1.db);
        // Explicitly run trend forecast matrix locally against new data
        (_a = exports.activeAgents.forecaster) === null || _a === void 0 ? void 0 : _a.processSignals({ username: user });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}));
app.post('/api/sync/operations', (req, res) => {
    const operations = req.body;
    if (!Array.isArray(operations)) {
        return res.status(400).json({ error: "Expected an array of operations" });
    }
    const insertStmt = db_1.db.prepare(`
    INSERT OR IGNORE INTO sync_operations_log 
    (operation_id, table_name, record_id, action, payload, timestamp, origin_device_id) 
    VALUES (@operationId, @tableName, @recordId, @action, @payload, @timestamp, @originDeviceId)
  `);
    const tx = db_1.db.transaction((ops) => {
        for (const op of ops) {
            insertStmt.run(op);
        }
    });
    try {
        tx(operations);
        res.json({ success: true, processed: operations.length });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ---------------------------------------------------------------------------
// Serve the pre-built Expo web app at /app  (port 4000, already LAN-accessible)
// The QR code points here: http://LAN_IP:4000/app?user=ned&ip=192.168.x.x
// ---------------------------------------------------------------------------
const WEB_DIST = path_1.default.resolve(__dirname, '../../mobile/web-dist');
if (fs_1.default.existsSync(WEB_DIST)) {
    // Inject user & ip into the HTML at request time
    app.get('/app', (req, res) => {
        const user = req.query.user || '';
        const ip = req.query.ip || '';
        const tunnel = req.query.tunnel || '';
        const indexPath = path_1.default.join(WEB_DIST, 'index.html');
        let html = fs_1.default.readFileSync(indexPath, 'utf8');
        const injection = `<script>window.__KIDTREND_CONFIG={user:${JSON.stringify(user)},ip:${JSON.stringify(ip)},tunnel:${JSON.stringify(tunnel)}};</script>`;
        html = html.replace('<head>', `<head>${injection}`);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    });
    // Expo's built assets use absolute paths like /_expo/static/... and /assets/...
    // Mount these at the root so the browser resolves them correctly from any base path
    app.use('/_expo', express_1.default.static(path_1.default.join(WEB_DIST, '_expo')));
    app.use('/assets', express_1.default.static(path_1.default.join(WEB_DIST, 'assets')));
    app.use('/app', express_1.default.static(WEB_DIST));
    console.log('📱 Mobile field app served at http://YOUR_LAN_IP:4000/app');
}
else {
    console.warn('⚠️  web-dist not found — run in apps/mobile: npx expo export --platform web --output-dir ./web-dist');
}
// ---------------------------------------------------------------------------
// Serve the pre-built Desktop Dashboard PWA at /  (Root)
// This allows the full desktop experience on the phone via public tunnel
// ---------------------------------------------------------------------------
const DESKTOP_DIST = path_1.default.resolve(__dirname, '../../desktop/dist');
if (fs_1.default.existsSync(DESKTOP_DIST)) {
    // If hitting root with query parameters (e.g., ?user=), serve the HTML directly
    // so the frontend can read the params.
    app.use('/', express_1.default.static(DESKTOP_DIST));
    // Handle SPA routing
    app.get('*', (req, res, next) => {
        if (req.url.startsWith('/api') || req.url.startsWith('/app') || req.url.startsWith('/_expo'))
            return next();
        res.sendFile(path_1.default.join(DESKTOP_DIST, 'index.html'));
    });
    console.log('💻 Desktop Dashboard PWA served at http://YOUR_LAN_IP:4000/');
}
else {
    console.warn('⚠️  Desktop dist not found — run in apps/desktop: npm run build');
}
const PORT = parseInt(String(process.env.PORT || '4000'), 10);
app.listen(PORT, '0.0.0.0', () => {
    console.log(`KidTrend Local Sync Server running on http://0.0.0.0:${PORT}`);
});
