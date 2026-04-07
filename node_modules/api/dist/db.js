"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.initDB = initDB;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dbDir = path_1.default.join(__dirname, '../../../../local-data');
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
let masterDb = {};
function initDB() {
    // Initially we just load the legacy 'default' db or leave it blank until requests come in.
    // The individual user DBs will be lazy-loaded in verifyUserDb.
    verifyUserDb('default');
    console.log("Multi-Tenant DB Engine Initialized!");
}
function verifyUserDb(username) {
    if (!username)
        username = 'default';
    if (!masterDb[username]) {
        const userFile = path_1.default.join(dbDir, `kidtrend_${username}.json`);
        // Load legacy file for default if valid
        const legacyFile = path_1.default.join(dbDir, 'kidtrend.json');
        // All new tenants should clone the legacy master DB to get starting signals & opportunities
        let initialFile = fs_1.default.existsSync(userFile) ? userFile : (fs_1.default.existsSync(legacyFile) ? legacyFile : null);
        let instance = { trends_signals: [], product_opportunities: [], sync_operations_log: [], watchlists: [], sources: [] };
        if (initialFile) {
            try {
                const parsed = JSON.parse(fs_1.default.readFileSync(initialFile, 'utf-8'));
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
            }
            catch (e) { }
        }
        if (!instance.watchlists)
            instance.watchlists = [];
        if (!instance.sources)
            instance.sources = [];
        masterDb[username] = instance;
    }
    return masterDb[username];
}
function persist(username) {
    if (!username)
        username = 'default';
    const userFile = path_1.default.join(dbDir, `kidtrend_${username}.json`);
    fs_1.default.writeFileSync(userFile, JSON.stringify(masterDb[username], null, 2));
}
exports.db = {
    prepare: (sql) => {
        return {
            all: (params) => {
                const u = (params === null || params === void 0 ? void 0 : params.username) || 'default';
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
                    if (params === null || params === void 0 ? void 0 : params.id)
                        return data.sources.filter(s => s.opportunityId === params.id);
                    return data.sources;
                }
                return [];
            },
            get: (params) => {
                const u = (params === null || params === void 0 ? void 0 : params.username) || 'default';
                const data = verifyUserDb(u);
                if (sql.includes('product_opportunities')) {
                    return data.product_opportunities.find(o => o.id === params.id || o.name === params.name);
                }
                return null;
            },
            run: (params) => {
                const u = (params === null || params === void 0 ? void 0 : params.username) || 'default';
                const data = verifyUserDb(u);
                if (sql.includes('UPDATE product_opportunities SET added_to_buying_center = 1')) {
                    const exist = data.product_opportunities.findIndex(o => o.id === params.id);
                    if (exist !== -1) {
                        data.product_opportunities[exist].added_to_buying_center = true;
                        persist(u);
                    }
                }
                else if (sql.includes('UPDATE product_opportunities')) {
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
                    if (!data.trends_signals.find(s => s.normalized_payload_hash === params.normalizedPayloadHash)) {
                        data.trends_signals.push(Object.assign(Object.assign({}, params), { interest_score: params.interestScore, velocity_score: params.velocityScore, normalized_payload_hash: params.normalizedPayloadHash }));
                        persist(u);
                    }
                }
                if (sql.includes('INSERT') && sql.includes('product_opportunities')) {
                    const exist = data.product_opportunities.findIndex(o => o.id === params.id);
                    if (exist !== -1) {
                        data.product_opportunities[exist] = Object.assign(Object.assign(Object.assign({}, data.product_opportunities[exist]), params), { updatedAt: new Date().toISOString() });
                    }
                    else {
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
        };
    },
    transaction: (fn) => {
        return (ops, username) => {
            fn(ops);
            // Transactions should pass username directly to queries, persist handled in queries
        };
    }
};
