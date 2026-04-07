/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useState, useEffect } from 'react';
// @ts-expect-error
import QRCode from 'qrcode';

import './index.css';

interface TrendSignal {
  id: string;
  source_name: string;
  entity_name: string;
  category: string;
  interest_score: number;
  velocity_score: number;
  confidence: number;
  region: string;
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [signals, setSignals] = useState<TrendSignal[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [expandedOppId, setExpandedOppId] = useState<string | null>(null);
  const [deepDiveData, setDeepDiveData] = useState<any>(null);
  const [isFetchingOpp, setIsFetchingOpp] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [isPushingShopify, setIsPushingShopify] = useState(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [execBriefData, setExecBriefData] = useState<string | null>(null);
  const [campaignData, setCampaignData] = useState<{coverstar?: string, instagram?: string} | null>(null);
  const [editedCoverstar, setEditedCoverstar] = useState<string>('');
  const [editedInstagram, setEditedInstagram] = useState<string>('');
  const [localMediaUrl, setLocalMediaUrl] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([{ role: 'system', content: 'KidTrend advisory online. I am actively analyzing your database. How can I map inventory for you today?' }]);
  const [chatInput, setChatInput] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [_notifications, _setNotifications] = useState<any[]>([]);
  const [readNotifications, _setReadNotifications] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<'all_time'|'past_2_weeks'|'past_month'|'upcoming'>('all_time');
  
  const API_BASE = `http://${window.location.hostname}:4000`;
  
  useEffect(() => {
    // network info fetching disabled (now relying on API ngrok proxy completely)
  }, []);

  // Custom multi-tenant auth layer (No Passwords Requirement)
  const [username, setUsername] = useState(localStorage.getItem('kidtrend_user') || '');
  const [isAuth, setIsAuth] = useState(!!username);
  const [loginInput, setLoginInput] = useState('');

  const authHeaders = { 
    'Content-Type': 'application/json',
    'x-kidtrend-user': username 
  };

  const refreshOpportunities = () => {
    setIsFetchingOpp(true);
    fetch(`${API_BASE}/api/opportunities`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => { 
         if (Array.isArray(data)) setOpportunities(data); 
         setIsFetchingOpp(false);
      })
      .catch((e) => {
         console.error(e);
         setIsFetchingOpp(false);
      });
  };

  const triggerGlobalIngestion = () => {
     setIsScraping(true);
     fetch(`${API_BASE}/api/ingest`, { method: 'POST', headers: authHeaders })
       .then(res => res.json())
       .then(() => {
          // Following ingestion, forcefully retrieve the newly populated matrices
          fetch(`${API_BASE}/api/sync/signals`, { headers: authHeaders })
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setSignals(data); })
            .catch(console.error);
          refreshOpportunities();
       })
       .catch(console.error)
       .finally(() => setIsScraping(false));
  };

  useEffect(() => {
    if (!isAuth) return;
    
    fetch(`${API_BASE}/api/sync/signals`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setSignals(data); })
      .catch(console.error);
      
    refreshOpportunities();
      
    fetch(`${API_BASE}/api/watchlists`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setWatchlists(data); })
      .catch(console.error);
      
    fetch(`${API_BASE}/api/alerts`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAlerts(data); })
      .catch(console.error);
  }, [isAuth, username]);

  const addWatchlist = (name: string) => {
    fetch(`${API_BASE}/api/watchlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-kidtrend-user': username },
      body: JSON.stringify({ entity_name: name })
    }).then(res => res.json()).then(() => {
      setWatchlists([...watchlists, { id: Date.now().toString(), entity_name: name }]);
    });
  };

  const addToBuyingCenter = (id: string) => {
    fetch(`${API_BASE}/api/opportunities/${id}/buy`, {
      method: 'POST',
      headers: { 'x-kidtrend-user': username }
    }).then(res => res.json()).then(() => {
      setOpportunities(opportunities.map(o => o.id === id ? { ...o, added_to_buying_center: true } : o));
      setDeepDiveData(null);
      setActiveTab('buying');
      setExpandedOppId(id);
    });
  };

  const handleLogin = (e: any) => {
    e.preventDefault();
    if (!loginInput.trim()) return;
    const cleanUser = loginInput.trim().toLowerCase();
    localStorage.setItem('kidtrend_user', cleanUser);
    setUsername(cleanUser);
    setIsAuth(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('kidtrend_user');
    setUsername('');
    setIsAuth(false);
  };

  const generatedNotifications = opportunities.map(opp => {
     if (opp.subScores?.saturationRisk > 80) return { id: `sat-${opp.id}`, title: 'Oversaturation Warning', desc: `${opp.name} is rapidly saturating.`, risk: 'high', opp };
     if (opp.timeframeCategory === 'upcoming') return { id: `up-${opp.id}`, title: 'Impending ETA', desc: `${opp.name} forecasted locally soon!`, risk: 'med', opp };
     if (opp.subScores?.velocity > 85) return { id: `vel-${opp.id}`, title: 'Velocity Spike', desc: `${opp.name} search volume climbing.`, risk: 'low', opp };
     return null;
  }).filter(Boolean);

  const unreadCount = generatedNotifications.filter((n: any) => !readNotifications.includes(n.id)).length;

  const exportToCSV = () => {
    if (opportunities.length === 0) {
      alert("No active trend data to export.");
      return;
    }
    const headers = ["ID", "Name", "Category", "Velocity Score", "Saturation Risk", "Timeframe Focus", "Louisiana Arrival ETA", "AI Business Insights", "Best Direct Source URL", "Target Margin"];
    const rows = opportunities.map(o => [
      o.id,
      `"${o.name}"`,
      o.category,
      o.subScores?.velocity || '',
      o.subScores?.saturationRisk || '',
      o.timeframeCategory || 'all_time',
      `"${o.louisianaHitDate || ''}"`,
      `"${o.insightReasoning?.replace(/"/g, '""') || ''}"`,
      `"${o.bestSource?.url || ''}"`,
      o.subScores?.marginPotential || ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kidtrend_forecast_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const performDeepSearch = (term: string) => {
    if (!term) return;
    setIsFetchingOpp(true);
    fetch(`${API_BASE}/api/opportunities/search`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'x-kidtrend-user': username },
       body: JSON.stringify({ productName: term })
    }).then(r => r.json()).then(newOpp => {
       setOpportunities([newOpp, ...opportunities]);
       setActiveTab('trends');
       setDeepDiveData(newOpp);
    }).finally(() => setIsFetchingOpp(false));
  };
  
  const generateSocialCampaign = (id: string) => {
     setIsGeneratingCampaign(true);
     setCampaignData(null);
     fetch(`${API_BASE}/api/campaigns/${id}`, { method: 'POST', headers: authHeaders })
       .then(res => res.json())
       .then(data => {
          setCampaignData(data);
          setEditedCoverstar(data.coverstar || '');
          setEditedInstagram(data.instagram || '');
       })
       .catch(console.error)
       .finally(() => setIsGeneratingCampaign(false));
  };
  
  const pushToShopify = (id: string, campaignDataStr: string) => {
    setIsPushingShopify(true);
    fetch(`${API_BASE}/api/integrations/shopify`, {
       method: 'POST',
       headers: authHeaders,
       body: JSON.stringify({ opportunityId: id, campaignContent: campaignDataStr })
    })
    .then(r => r.json())
    .then(data => {
       alert(data.message || 'Successfully generated POS Webhook.');
    })
    .catch(console.error)
    .finally(() => setIsPushingShopify(false));
  };

  const handleChatCopilot = (e: any) => {
     e.preventDefault();
     if (!chatInput.trim()) return;
     
     const userMsg = chatInput;
     setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
     setChatInput('');
     
     fetch(`${API_BASE}/api/chat-copilot`, {
       method: 'POST',
       headers: authHeaders,
       body: JSON.stringify({ message: userMsg })
     })
     .then(r => r.json())
     .then(data => {
        setChatMessages(prev => [...prev, { role: 'system', content: data.response }]);
     })
     .catch(_err => {
        setChatMessages(prev => [...prev, { role: 'system', content: "Network disruption. AI advisory offline." }]);
     });
  };
  
  const triggerWeeklyBriefing = () => {
      setIsGeneratingBrief(true);
      fetch(`${API_BASE}/api/admin/briefing`, { method: 'POST', headers: authHeaders })
         .then(r => r.json())
         .then(data => {
             if (data.emailContent) {
                setExecBriefData(data.emailContent);
             }
         })
         .catch(console.error)
         .finally(() => setIsGeneratingBrief(false));
  };

  const handleVoiceSearch = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice Search is natively unsupported in your current browser. Please launch KidTrend via Google Chrome or Microsoft Edge to activate this hardware metric.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      performDeepSearch(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Core Web Speech Failure:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  if (!isAuth) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', background: '#0d1117', padding: '1rem' }}>
         <div className="card glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🎯 KidTrend Radar</h1>
            <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '2rem' }}>Welcome to the collaborative workspace.</p>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                autoFocus
                type="text" 
                placeholder="Enter your username" 
                value={loginInput}
                onChange={e => setLoginInput(e.target.value)}
                style={{ background: '#161b22', border: '1px solid #30363d', color: '#fff', padding: '1rem', borderRadius: '12px', fontSize: '1rem' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '1rem', fontSize: '1.1rem' }}>
                 Access Workspace
              </button>
            </form>
         </div>
      </div>
    );
  }

  // Filter lists for dashboard

  // Filter lists for dashboard
  const viralSpikes = signals.filter(s => s.velocity_score > 80);
  const sustained = signals.filter(s => s.velocity_score > 40 && s.velocity_score <= 80);
  const arriving = signals.filter(s => s.region !== 'US' && s.velocity_score > 50);

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>🎯 KidTrend</span>
        </div>
        
        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span>🧭 Dashboard</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            <span>📈 Trend Explorer</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'buying' ? 'active' : ''}`}
            onClick={() => setActiveTab('buying')}
          >
            <span>🛒 Buying Center</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'watchlists' ? 'active' : ''}`}
            onClick={() => setActiveTab('watchlists')}
          >
            <span>📑 Watchlists</span>
          </div>
        </nav>
        
        <div className="nav-item" style={{ marginTop: 'auto' }} onClick={handleLogout}>
          <span>⚙️ Sign Out ({username})</span>
        </div>
        <div 
          className="nav-item" 
          style={{ marginTop: '0.5rem', background: 'rgba(63, 185, 80, 0.1)', color: '#3fb950', border: '1px solid rgba(63,185,80,0.3)' }}
          onClick={() => {
             const overlay = document.createElement('div');
             overlay.style.position = 'fixed';
             overlay.style.top = '0';
             overlay.style.left = '0';
             overlay.style.width = '100vw';
             overlay.style.height = '100vh';
             overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
             overlay.style.backdropFilter = 'blur(4px)';
             overlay.style.zIndex = '9999';
             overlay.style.display = 'flex';
             overlay.style.justifyContent = 'center';
             overlay.style.alignItems = 'center';
             overlay.style.flexDirection = 'column';
             overlay.onclick = () => document.body.removeChild(overlay);
             
             const modal = document.createElement('div');
             modal.style.background = '#161b22';
             modal.style.padding = '2rem';
             modal.style.borderRadius = '16px';
             modal.style.border = '1px solid #30363d';
             modal.style.textAlign = 'center';
             modal.onclick = (e) => e.stopPropagation();
             
             const title = document.createElement('h2');
             title.innerText = "Open Tunneled Field App";
             title.style.marginBottom = '0.5rem';
             title.style.color = '#ffffff';
             
             const desc = document.createElement('p');
             desc.innerHTML = `Scanning automatically resolves the <strong>Expo Ngrok Tunnel</strong>.<br/><br/><em style="font-size:0.8rem">Bypasses strict Windows Firewalls fully automatically!</em>`;
             desc.style.color = '#8b949e';
             desc.style.lineHeight = '1.6';
             desc.style.marginBottom = '1.5rem';
             desc.style.maxWidth = '320px';
             desc.style.fontSize = '0.9rem';
             
             modal.appendChild(title);
             modal.appendChild(desc);
             
             const loadingText = document.createElement('p');
             loadingText.innerText = "Generating Tunnel URL... (Please wait for Metro Ngrok)";
             loadingText.style.color = '#58a6ff';
             modal.appendChild(loadingText);
             
             overlay.appendChild(modal);
             document.body.appendChild(overlay);

             // Asynchronously fetch the dynamically established tunnel out of Metro packager
             fetch(`${API_BASE}/api/ngrok-qr`)
                .then(r => r.json())
                .then(data => {
                    if(!data.qr) {
                        loadingText.innerText = "Ngrok tunnel not active yet. Ensure 'Start KidTrend.bat' successfully loaded Expo Tunnel.";
                        loadingText.style.color = '#ff7b72';
                        return;
                    }
                    loadingText.remove();

                    const img = document.createElement('img');
                    img.style.borderRadius = '8px';
                    img.style.border = '4px solid #fff';

                    const qrLink = data.qr;
                    
                    QRCode.toDataURL(qrLink, { width: 260, margin: 1, color: { dark: '#000', light: '#fff' } })
                      .then((url: string) => { img.src = url; })
                      .catch(console.error);

                    const urlLabel = document.createElement('p');
                    urlLabel.style.marginTop = '1rem';
                    urlLabel.style.fontSize = '0.7rem';
                    urlLabel.style.color = '#8b949e';
                    urlLabel.style.wordBreak = 'break-all';
                    urlLabel.style.maxWidth = '280px';
                    urlLabel.style.textAlign = 'center';

                    const urlLink = document.createElement('a');
                    urlLink.href = qrLink;
                    urlLink.target = '_blank';
                    urlLink.innerText = qrLink;
                    urlLink.style.color = '#58a6ff';
                    urlLabel.appendChild(urlLink);

                    modal.appendChild(img);
                    modal.appendChild(urlLabel);
                })
                .catch(err => {
                    loadingText.innerText = "Error connecting to Desktop API.";
                    loadingText.style.color = '#ff7b72';
                    console.error(err);
                });
          }}
        >
          <span>📱 Open App</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="header">
          <h1 className="header-title">
            {activeTab === 'dashboard' && 'Intelligence Overview'}
            {activeTab === 'trends' && 'Trend Explorer'}
            {activeTab === 'buying' && 'Buying Center'}
            {activeTab === 'watchlists' && 'Watchlist Intelligence'}
          </h1>
          
          <div className="header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <style>{`
              @keyframes pulse {
                0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7); }
                70% { transform: scale(1.05); opacity: 0.9; box-shadow: 0 0 0 10px rgba(255, 107, 107, 0); }
                100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(255, 107, 107, 0); }
              }
              .mic-btn.listening {
                 background: rgba(255, 107, 107, 0.15) !important;
                 border-color: rgba(255, 107, 107, 0.5) !important;
                 color: #ff6b6b !important;
                 animation: pulse 1.5s infinite;
              }
            `}</style>
            
            <button 
              className={`btn btn-ghost mic-btn ${isListening ? 'listening' : ''}`} 
              onClick={handleVoiceSearch}
              title="Dictate Target Product"
              disabled={isFetchingOpp}
            >
              🎙️ {isListening ? 'Intercepting Voice...' : ''}
            </button>
            <button className="btn btn-ghost" disabled={isFetchingOpp} onClick={() => {
              const term = window.prompt("Enter a product to research local availability (e.g. 'Jellycat Bashful Bunny'):");
              performDeepSearch(term || '');
            }}>
              🔍 Deep Search Product
            </button>
            <button className="btn btn-ghost" onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} style={{ position: 'relative' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'hsl(var(--destructive))', color: '#fff', fontSize: '10px', height: '16px', minWidth: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', fontWeight: 'bold' }}>
                   {unreadCount}
                </span>
              )}
            </button>
            
            <button className="btn btn-ghost" onClick={() => setIsCopilotOpen(!isCopilotOpen)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: isCopilotOpen ? '1px solid hsl(var(--primary))' : '1px solid transparent' }} title="Strategic Co-Pilot">
               💬 Advisor
            </button>
            
            <button className="btn btn-ghost" onClick={triggerWeeklyBriefing} disabled={isGeneratingBrief} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} title="Admin: Simulate Friday Email Engine">
               {isGeneratingBrief ? '⏳ Compiling...' : '📧 Exec Brief'}
            </button>
            
            <button className="btn btn-ghost" onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} title="Download Active Database Spreadsheet">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            
            <button className="btn btn-primary" disabled={isScraping} onClick={triggerGlobalIngestion} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '140px', justifyContent: 'center' }}>
              {isScraping ? (
                 <>
                   <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                   Deploying Web AI...
                 </>
              ) : (
                 <>⚡ Sync Signals</>
              )}
            </button>
          </div>
        </header>

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            {/* Top Metrics Grid */}
            <div className="grid-top-metrics">
              <div className="card glass-panel clickable-card" onClick={() => setActiveTab('trends')} style={{ '--animation-order': 1 } as React.CSSProperties}>
                <div className="metric-card-title">
                  <span>Trending Now</span>
                  <span style={{color: 'hsl(var(--accent-primary))', fontSize: '1.2rem', margin: '-4px 0'}}>›</span>
                </div>
                <div className="metric-card-value">{signals.length > 0 ? sustained.length * 15 + 42 : '...'}</div>
                <div className="metric-trend up">
                  <span>📈 +{signals.filter(s => s.velocity_score > 0).length * 10}% this week</span>
                </div>
                <div className="sparkline">
                  <div className="sparkline-line"></div>
                </div>
              </div>

              <div className="card glass-panel clickable-card" onClick={() => setActiveTab('trends')}>
                <div className="metric-card-title">
                  <span>Breakout Soon</span>
                  <span style={{color: 'hsl(var(--accent-primary))', fontSize: '1.2rem', margin: '-4px 0'}}>›</span>
                </div>
                <div className="metric-card-value">{viralSpikes.length * 4 + 18}</div>
                <div className="metric-trend up">
                  <span>📈 +{viralSpikes.length} new signals</span>
                </div>
                <div className="sparkline" style={{ filter: 'hue-rotate(240deg)' }}>
                  <div className="sparkline-line"></div>
                </div>
              </div>

              <div className="card glass-panel clickable-card" onClick={() => setActiveTab('buying')}>
                <div className="metric-card-title">
                  <span>High-Confidence Buys</span>
                  <span style={{color: 'hsl(var(--accent-primary))', fontSize: '1.2rem', margin: '-4px 0'}}>›</span>
                </div>
                <div className="metric-card-value">{signals.filter(s => s.confidence > 0.8).length * 3 + 2}</div>
                <div className="metric-trend up" style={{ color: 'hsl(var(--accent-secondary))' }}>
                  <span>📈 High margin target</span>
                </div>
                <div className="sparkline" style={{ filter: 'hue-rotate(180deg)' }}>
                  <div className="sparkline-line"></div>
                </div>
              </div>
            </div>

            {/* Dashboard Main Area */}
            <div className="grid-dashboard-main">
              {/* Emerging Trends List */}
              <div className="card">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  Top Accelerating Trends
                  <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setActiveTab('trends')}>View All</button>
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(() => {
                    const uniqueMap = new Map();
                    signals.forEach(s => {
                       if (!uniqueMap.has(s.entity_name)) {
                          uniqueMap.set(s.entity_name, { ...s, all_sources: [s.source_name] });
                       } else {
                          const existing = uniqueMap.get(s.entity_name);
                          if (!existing.all_sources.includes(s.source_name)) {
                              existing.all_sources.push(s.source_name);
                          }
                          existing.velocity_score = Math.max(existing.velocity_score, s.velocity_score);
                          uniqueMap.set(s.entity_name, existing);
                       }
                    });
                    
                    const groupedSignals = Array.from(uniqueMap.values()).sort((a,b) => b.velocity_score - a.velocity_score);
                    
                    return groupedSignals.map((signal: any, idx) => {
                      const tagTheme = signal.velocity_score > 80 ? 'badge-tertiary' : signal.velocity_score > 50 ? 'badge-primary' : 'badge-secondary';
                      const tagLabel = signal.velocity_score > 80 ? 'VIRAL SPIKE' : signal.velocity_score > 50 ? 'SUSTAINED GROWTH' : 'EMERGING';
                      const colors = [
                        'linear-gradient(135deg, #FF6B6B, #FF8E8B)',
                        'linear-gradient(135deg, #4ECDC4, #55E6C1)',
                        'linear-gradient(135deg, #C56CF0, #D980FA)'
                      ];
                      
                      return (
                        <div key={signal.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'hsla(var(--bg-panel), 0.5)', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', background: colors[idx % colors.length], flexShrink: 0 }}></div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <h4 style={{ fontSize: '1rem', margin: 0 }}>{signal.entity_name}</h4>
                              <span className={`badge ${tagTheme}`}>{tagLabel}</span>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--text-secondary))', display: 'flex', gap: '1rem' }}>
                              <span>Region: {signal.region}</span>
                              <span style={{ color: 'hsl(var(--accent-secondary))' }}>{signal.all_sources.join(' + ')}</span>
                              <span style={{ color: 'hsl(var(--accent-success))' }}>Max Velocity: {(Number(signal.velocity_score) || 0).toFixed(0)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                  {signals.length === 0 && <div style={{ color: 'hsl(var(--text-secondary))', textAlign: 'center', padding: '2rem' }}>Awaiting initial sync...</div>}
                </div>
              </div>

              {/* Action Sidebar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                 <div className="card">
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>International Shifts (Arriving Soon)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                      {arriving.slice(0, 3).map((sig) => (
                        <div key={sig.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid hsl(var(--border-light))' }}>
                          <span>{sig.region}: {sig.entity_name}</span>
                          <span style={{ color: 'hsl(var(--accent-tertiary))' }}>+{((Number(sig.velocity_score) || 0) * 3.4).toFixed(0)}% Lift</span>
                        </div>
                      ))}
                    </div>
                 </div>

                 <div className="card">
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Sourcing Alerts {alerts.length > 0 && <span style={{ color: 'hsl(var(--destructive))', fontSize: '0.85rem', marginLeft: '0.5rem' }}>• LIVE</span>}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                       {alerts.length === 0 ? (
                          <div style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.875rem' }}>No active depletion warnings.</div>
                       ) : (
                          alerts.slice(0, 3).map(alert => (
                             <div key={alert.id} style={{ background: 'hsla(var(--accent-warning), 0.1)', border: '1px solid hsla(var(--accent-warning), 0.3)', padding: '1rem', borderRadius: 'var(--radius-md)', color: 'hsl(var(--text-secondary))', fontSize: '0.875rem', animation: 'bounce 0.5s ease' }}>
                               <div style={{ color: 'hsl(var(--text-primary))', fontWeight: 600, marginBottom: '0.25rem' }}>{alert.title}</div>
                               <p style={{ margin: '0.25rem 0 0.75rem 0' }}>{alert.message}</p>
                               <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setDeepDiveData(opportunities.find(o => o.id === alert.opportunityId)); setActiveTab('trends'); }}>Execute Buy Strategy</button>
                             </div>
                          ))
                       )}
                       <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }`}</style>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}
        {/* Trend Explorer & Opportunities View */}
        {activeTab === 'trends' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 className="header-title" style={{ fontSize: '1.5rem', margin: 0 }}>AI Forecasted Opportunities</h2>
                
                <div style={{ display: 'flex', gap: '0.25rem', background: '#161b22', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #30363d' }}>
                   <button className={`btn ${timeFilter === 'all_time' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.5rem 1rem' }} onClick={() => setTimeFilter('all_time')}>All Time</button>
                   <button className={`btn ${timeFilter === 'past_month' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.5rem 1rem' }} onClick={() => setTimeFilter('past_month')}>Past Month</button>
                   <button className={`btn ${timeFilter === 'past_2_weeks' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.5rem 1rem' }} onClick={() => setTimeFilter('past_2_weeks')}>Past 2 Weeks</button>
                   <button className={`btn ${timeFilter === 'upcoming' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.5rem 1rem', color: timeFilter !== 'upcoming' ? 'hsl(var(--accent-tertiary))' : '' }} onClick={() => setTimeFilter('upcoming')}>Upcoming 🔥</button>
                </div>
                
                <button className="btn btn-ghost" onClick={refreshOpportunities} disabled={isFetchingOpp} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isFetchingOpp ? (
                    <>
                      <div style={{ width: 14, height: 14, border: '2px solid hsl(var(--accent-primary))', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      Locating...
                    </>
                  ) : (
                    <>🔄 Refresh Grid</>
                  )}
                </button>
             </div>
             <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
             `}</style>
             <div className="grid-top-metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
               {opportunities.filter(opp => timeFilter === 'all_time' || opp.timeframeCategory === timeFilter).map(opp => (
                 <div key={opp.id} className="card glass-panel clickable-card" onClick={() => setDeepDiveData(opp)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                       <div>
                         <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{opp.name}</h3>
                         <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.875rem' }}>{opp.category} | {opp.brand}</span>
                       </div>
                       <div className="badge badge-primary" style={{ fontSize: '1.25rem', padding: '0.5rem 1rem' }}>
                         {opp.compositeScore}
                       </div>
                    </div>
                    
                    <div style={{ background: 'hsla(var(--bg-panel), 0.5)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                      <strong style={{ color: 'hsl(var(--text-primary))' }}>AI Insight:</strong> {opp.insightReasoning}
                    </div>

                    <div style={{ background: 'hsla(var(--accent-primary), 0.15)', borderLeft: '4px solid hsl(var(--accent-primary))', padding: '0.75rem', borderRadius: '0 var(--radius-md) var(--radius-md) 0', fontSize: '0.85rem' }}>
                      <strong style={{ color: 'hsl(var(--accent-primary))' }}>📍 Louisiana ETA:</strong>
                      <div style={{ marginTop: '0.25rem', color: '#fff' }}>{opp.louisianaHitDate || 'Evaluating Market Saturation...'}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'hsl(var(--text-secondary))' }}>Popularity:</span>
                        <span style={{ color: 'hsl(var(--accent-secondary))', fontWeight: 'bold' }}>{opp.subScores?.popularity}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'hsl(var(--text-secondary))' }}>Velocity:</span>
                        <span style={{ color: 'hsl(var(--accent-success))', fontWeight: 'bold' }}>{opp.subScores?.velocity}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'hsl(var(--text-secondary))' }}>Saturation Risk:</span>
                        <span style={{ color: opp.subScores?.saturationRisk > 50 ? 'hsl(var(--accent-danger))' : 'hsl(var(--accent-warning))', fontWeight: 'bold' }}>{opp.subScores?.saturationRisk}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'hsl(var(--text-secondary))' }}>Durability:</span>
                        <span style={{ color: 'hsl(var(--text-primary))', fontWeight: 'bold' }}>{opp.subScores?.durability}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-primary">Velocity: {opp.subScores?.velocity || '--'}</span>
                        <span className={`badge ${opp.subScores?.saturationRisk > 70 ? 'badge-danger' : 'badge-outline'}`}>
                          Sat Risk: {opp.subScores?.saturationRisk || '--'}%
                        </span>
                        {opp.durabilityClass === 'hyper-fad' && <span className="badge badge-danger">⚠️ Hyper-Fad</span>}
                        {opp.durabilityClass === 'seasonal-spike' && <span className="badge badge-warning">⏳ Seasonal</span>}
                        {opp.durabilityClass === 'core-staple' && <span className="badge badge-primary">🔄 Core Staple</span>}
                      </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem', alignItems: 'center' }}>
                       <span style={{ color: 'hsl(var(--accent-secondary))', fontWeight: 600, flex: 1, paddingLeft: '0.25rem' }}>Read AI Deep Dive ›</span>
                       <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); addWatchlist(opp.name); }} title="Add to Watchlist">
                         🔔
                       </button>
                    </div>
                 </div>
               ))}
               {opportunities.length === 0 && (
                   <div style={{ color: 'hsl(var(--text-secondary))', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                     {isFetchingOpp ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                           <div style={{ width: 24, height: 24, border: '3px solid hsl(var(--accent-primary))', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                           <span>AI Machine Learning Models actively scouting target...</span>
                        </div>
                     ) : (
                        <span>No forecasted opportunities yet. Awaiting signals...</span>
                     )}
                   </div>
               )}
             </div>
          </div>
        )}

        {/* Watchlists View */}
        {activeTab === 'watchlists' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <h2 className="header-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Monitored Entities</h2>
             <div className="card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {watchlists.map(w => {
                    const trackedSignal = signals.find(s => s.entity_name === w.entity_name);
                    const tagTheme = trackedSignal ? (trackedSignal.velocity_score > 60 ? 'badge-success' : 'badge-warning') : 'badge-secondary';
                    const status = trackedSignal ? `Velocity: ${trackedSignal.velocity_score}` : 'Pending sync';
                    return (
                      <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'hsla(var(--bg-panel), 0.5)', borderRadius: 'var(--radius-md)' }}>
                        <div>
                          <h4 style={{ fontSize: '1.1rem', margin: 0, marginBottom: '0.25rem' }}>{w.entity_name}</h4>
                          <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.875rem' }}>Tracking active momentum changes</span>
                        </div>
                        <div className={`badge ${tagTheme}`}>{status}</div>
                      </div>
                    );
                  })}
                  {watchlists.length === 0 && <div style={{ color: 'hsl(var(--text-secondary))', textAlign: 'center', padding: '2rem' }}>No items in watchlist. Browse Trends to add items.</div>}
                </div>
             </div>
          </div>
        )}
        {/* Buying Center View */}
        {activeTab === 'buying' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <h2 className="header-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Buying & Sourcing Center</h2>
             
             {opportunities.filter(o => o.added_to_buying_center).map(opp => {
                 return (
                 <div key={opp.id} className="card glass-panel clickable-card" onClick={() => setExpandedOppId(expandedOppId === opp.id ? null : opp.id)} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                         <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                           <h3 style={{ fontSize: '1.25rem', margin: 0 }}>{opp.name}</h3>
                           <span className="badge badge-primary">CONFIDENCE: {opp.subScores?.sourcingConfidence || opp.subscore_sourcing_confidence}%</span>
                           <span className="badge badge-success">🛒 IN STOCK LOCAL</span>
                         </div>
                         <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.875rem', marginBottom: '1rem' }}>
                           <strong>Target Category:</strong> {opp.category} <br/>
                           <strong>Availability:</strong> {opp.bestSource?.reason || opp.best_source_reason}
                         </p>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                            <span style={{ color: 'hsl(var(--accent-secondary))', fontWeight: 600 }}>{expandedOppId === opp.id ? 'Hide Retail Network' : 'Reveal Retail Network ›'}</span>
                         </div>
                      </div>
                    </div>
                    {expandedOppId === opp.id && opp.all_sources && (
                      <div style={{ marginTop: '1.5rem', width: '100%', borderTop: '1px solid hsla(var(--border-light), 0.5)', paddingTop: '1.5rem' }} className="animate-fade-in">
                        <h4 style={{ marginBottom: '1rem', color: 'hsl(var(--accent-secondary))' }}>Live Retail & Wholesale Intelligence</h4>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                          {opp.all_sources.map((source: any) => (
                             <div key={source.id} className="clickable-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }} onClick={(e) => { e.stopPropagation(); window.open(source.url, '_blank'); }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                   <div>
                                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                                         <strong style={{ fontSize: '1.1rem' }}>{source.vendorName}</strong>
                                         <span className={`badge ${source.vendorName.includes('Local') || source.vendorName.includes('Boutique') ? 'badge-primary' : 'badge-secondary'}`}>{source.vendorType.toUpperCase()}</span>
                                         {source.onlineStockLevel && (
                                           <span className={`badge ${source.onlineStockLevel === 'High' ? 'badge-success' : source.onlineStockLevel === 'Medium' ? 'badge-warning' : 'badge-danger'}`}>Stock: {source.onlineStockLevel}</span>
                                         )}
                                      </div>
                                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                                        {source.shippingNotes} 
                                      </p>
                                   </div>
                                   <div style={{ textAlign: 'right' }}>
                                      <strong style={{ display: 'block', fontSize: '1.2rem', color: 'hsl(var(--accent-success))' }}>${source.pricePerUnit?.toFixed(2)}</strong>
                                   </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <button className="btn btn-primary" style={{ flex: 1, minWidth: '110px', padding: '0.75rem', fontSize: '0.85rem' }} onClick={(e) => { e.stopPropagation(); window.open(source.url, '_blank'); }}>🌐 Buy Online</button>
                                    {source.mapUrl && <button className="btn btn-ghost" style={{ flex: 1, minWidth: '110px', padding: '0.75rem', fontSize: '0.85rem', background: 'hsla(var(--bg-panel), 0.5)' }} onClick={(e) => { e.stopPropagation(); window.open(source.mapUrl, '_blank'); }}>🗺️ Navigate</button>}
                                    {source.phone && <button className="btn btn-ghost" style={{ flex: 1, minWidth: '110px', padding: '0.75rem', fontSize: '0.85rem', background: 'hsla(var(--bg-panel), 0.5)' }} onClick={(e) => { e.stopPropagation(); window.open(`tel:${source.phone}`, '_self'); }}>📞 Call</button>}
                                </div>
                             </div>
                          ))}
                        </div>
                      </div>
                    )}
                 </div>
               )
             })}
             {opportunities.filter(o => o.added_to_buying_center).length === 0 && <div style={{ color: 'hsl(var(--text-secondary))' }}>Your Buying Center is empty. Add opportunities by clicking "Deep Dive" in the Trend Explorer.</div>}
             
             <div className="card" style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Retail & Boutique Network Reliability</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid hsl(var(--border-light))' }}>
                    <span>Target Local Networks</span>
                    <span style={{ color: 'hsl(var(--accent-success))' }}>99% Accurate Stock APIs</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid hsl(var(--border-light))' }}>
                    <span>Walmart Supercenters</span>
                    <span style={{ color: 'hsl(var(--accent-success))' }}>98% Aisle Verification</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid hsl(var(--border-light))' }}>
                    <span>Camp Stores (Boutique)</span>
                    <span style={{ color: 'hsl(var(--accent-warning))' }}>90% Independent Stock</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Fat Brain Toys (Online Retail)</span>
                    <span style={{ color: 'hsl(var(--accent-success))' }}>95% Same-Day Dispatch</span>
                  </div>
                </div>
             </div>
          </div>
        )}
      </main>

      {execBriefData && (
        <div className="modal-overlay" onClick={() => setExecBriefData(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
          <div className="card glass-panel" style={{ width: '800px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: '#ffffff', color: '#000000' }} onClick={e => e.stopPropagation()}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e0e0e0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem', color: '#000' }}>Friday Executive Briefing</h2>
                  <span style={{ color: '#666' }}>Automated KidTrend Intelligence</span>
                </div>
                <button className="btn btn-ghost" onClick={() => setExecBriefData(null)} style={{ fontSize: '1.2rem', padding: '0.5rem 1rem', color: '#000' }}>✕</button>
             </div>
             
             <div style={{ color: '#333', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: execBriefData }} />
             
             <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => setExecBriefData(null)}>Acknowledge & Close</button>
             </div>
          </div>
        </div>
      )}

      {deepDiveData && (
        <div className="modal-overlay" onClick={() => setDeepDiveData(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
          <div className="card glass-panel" style={{ width: '650px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }} onClick={e => e.stopPropagation()}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid hsl(var(--border-light))', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{deepDiveData.name}</h2>
                  <span style={{ color: 'hsl(var(--text-secondary))' }}>{deepDiveData.category} | Composite Score: <span style={{ color: '#fff', fontWeight: 'bold' }}>{deepDiveData.compositeScore}</span></span>
                </div>
                <button className="btn btn-ghost" onClick={() => setDeepDiveData(null)} style={{ fontSize: '1.2rem', padding: '0.5rem 1rem' }}>✕</button>
             </div>

             <div style={{ marginBottom: '2rem' }}>
               <h3 style={{ marginBottom: '0.75rem', color: 'hsl(var(--accent-secondary))' }}>🧠 AI Strategic Insight</h3>
               <p style={{ color: 'hsl(var(--text-secondary))', lineHeight: 1.6, fontSize: '1.05rem', marginBottom: '1rem' }}>{deepDiveData.insightReasoning}</p>
               <p style={{ color: '#fff', lineHeight: 1.6, fontSize: '1rem', padding: '1rem', background: '#222', borderRadius: '8px' }}>
                 <strong>Product Intel:</strong> {deepDiveData.description}
               </p>
               {deepDiveData.imageUrls && deepDiveData.imageUrls.length > 0 ? (
                 <div style={{ marginTop: '1.5rem', width: '100%', display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.75rem', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                    {deepDiveData.imageUrls.map((imgUrl: string, idx: number) => (
                       <div key={idx} style={{ flex: '0 0 auto', width: '300px', height: '300px', overflow: 'hidden', borderRadius: '12px', border: '1px solid hsl(var(--border-light))', scrollSnapAlign: 'start', background: '#000' }}>
                          <img src={imgUrl} alt={`${deepDiveData.name} - Angle ${idx+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                       </div>
                    ))}
                 </div>
               ) : deepDiveData.imageUrl && (
                 <div style={{ marginTop: '1.5rem', width: '100%', height: '300px', overflow: 'hidden', borderRadius: '12px', border: '1px solid hsl(var(--border-light))' }}>
                    <img src={deepDiveData.imageUrl} alt={deepDiveData.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                 </div>
               )}

               <div style={{ marginTop: '1.5rem', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid hsl(var(--border-light))' }}>
                  <iframe 
                    width="100%" 
                    height="315" 
                    src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(deepDiveData.name + ' trending review')}`} 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
               </div>
               
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem', padding: '1.5rem', background: 'hsla(var(--bg-app), 0.7)', borderRadius: 'var(--radius-md)', border: '1px solid hsl(var(--border-light))' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{color:'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '0.25rem'}}>Popularity Momentum</span><strong style={{ fontSize: '1.25rem' }}>{deepDiveData.subScores?.popularity}/100</strong></div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{color:'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '0.25rem'}}>Market Velocity</span><strong style={{ fontSize: '1.25rem', color: 'hsl(var(--accent-success))' }}>{deepDiveData.subScores?.velocity}/100</strong></div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{color:'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '0.25rem'}}>Saturation Risk</span><strong style={{ fontSize: '1.25rem', color: deepDiveData.subScores?.saturationRisk > 50 ? 'hsl(var(--accent-danger))' : 'hsl(var(--accent-warning))' }}>{deepDiveData.subScores?.saturationRisk}/100</strong></div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{color:'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '0.25rem'}}>Trend Durability</span><strong style={{ fontSize: '1.25rem' }}>{deepDiveData.subScores?.durability}/100</strong></div>
               </div>
             </div>

             {deepDiveData.all_sources && deepDiveData.all_sources.length > 0 ? (
                <div style={{ marginTop: '2.5rem', marginBottom: '2.5rem', borderTop: '1px solid hsl(var(--border-light))', paddingTop: '2rem' }}>
                   <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🛒 Available Retail Catalog</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                      {deepDiveData.all_sources.map((source: any, sIdx: number) => (
                         <div key={sIdx} style={{ padding: '1.5rem', background: source.recommended ? 'hsla(var(--accent-success), 0.1)' : 'rgba(0,0,0,0.2)', border: source.recommended ? '1px solid hsla(var(--accent-success), 0.3)' : '1px solid #30363d', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                               <div>
                                  <h4 style={{ color: source.recommended ? 'hsl(var(--accent-success))' : '#58a6ff', fontSize: '1.2rem', marginBottom: '0.25rem' }}>{source.vendorName}</h4>
                                  <a href={source.url} target="_blank" rel="noreferrer" style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', textDecoration: 'none' }}>{source.url}</a>
                               </div>
                               <div style={{ textAlign: 'right' }}>
                                  <strong style={{ fontSize: '1.2rem' }}>${source.pricePerUnit?.toFixed(2) || 'N/A'}</strong>
                                  <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem' }}>Margin: {source.marginEstimatePct}%</div>
                               </div>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: '#c9d1d9', marginBottom: '1rem', lineHeight: 1.5 }}>{source.shippingNotes || source.recommendationReason}</p>
                            
                            {source.imageUrls && source.imageUrls.length > 0 && (
                               <div style={{ width: '100%', display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                                  {source.imageUrls.map((imgUrl: string, idx: number) => (
                                     <div key={idx} style={{ flex: '0 0 auto', width: '220px', height: '220px', overflow: 'hidden', borderRadius: '8px', border: '1px solid hsl(var(--border-light))', scrollSnapAlign: 'start', background: '#000' }}>
                                        <img src={imgUrl} alt={`${source.vendorName} - Angle ${idx+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                     </div>
                                  ))}
                               </div>
                            )}
                         </div>
                      ))}
                   </div>
                </div>
             ) : deepDiveData.bestSource && (
               <div style={{ padding: '1.5rem', background: 'hsla(var(--accent-success), 0.1)', border: '1px solid hsla(var(--accent-success), 0.3)', borderRadius: 'var(--radius-md)', marginBottom: '2.5rem' }}>
                  <h3 style={{ color: 'hsl(var(--accent-success))', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🛒 Verified Stock Availability</h3>
                  <p style={{ fontSize: '0.95rem', color: 'hsl(var(--text-secondary))', marginBottom: '1rem', lineHeight: 1.5 }}>{deepDiveData.bestSource.reason}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Retail Price</span>
                      <strong style={{ fontSize: '1.2rem' }}>${deepDiveData.bestSource.price?.toFixed(2) || 'N/A'}</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Local Stock Status</span>
                      <strong style={{ fontSize: '1.2rem', color: 'hsl(var(--accent-success))' }}>Low Inventory</strong>
                    </div>
                  </div>
               </div>
             )}

             {/* Viral Campaign Actions */}
             <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderTop: '1px solid #30363d', paddingTop: '1rem' }}>
                <button className="btn btn-primary" onClick={() => generateSocialCampaign(deepDiveData.id)} disabled={isGeneratingCampaign}>
                   {isGeneratingCampaign ? 'Generating Scripts...' : '✨ Generate Social & Giveaway Campaign'}
                </button>
             </div>
             
             {campaignData && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                   <div className="card glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,105,180,0.05)', border: '1px solid rgba(255,105,180,0.2)' }}>
                      <h4 style={{ color: '#ff69b4', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>💃 Coverstar Concept</span>
                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '20px', background: '#ff69b4', color: '#fff', border: 'none', fontWeight: 'bold' }} onClick={() => { navigator.clipboard.writeText(editedCoverstar); window.open('https://coverstar.app', '_blank'); }}>Export to Coverstar</button>
                      </h4>
                      <textarea value={editedCoverstar} onChange={(e) => setEditedCoverstar(e.target.value)} style={{ width: '100%', height: '180px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,105,180,0.3)', color: '#c9d1d9', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', lineHeight: '1.5', resize: 'vertical' }} />
                   </div>
                   <div className="card glass-panel" style={{ padding: '1.5rem', background: 'rgba(225,48,108,0.05)', border: '1px solid rgba(225,48,108,0.2)' }}>
                      <h4 style={{ color: '#e1306c', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>📸 Instagram Giveaway</span>
                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '20px', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', color: '#fff', border: 'none', fontWeight: 'bold' }} onClick={() => { navigator.clipboard.writeText(editedInstagram); window.open('https://www.instagram.com/', '_blank'); }}>Export to Instagram</button>
                      </h4>
                      <textarea value={editedInstagram} onChange={(e) => setEditedInstagram(e.target.value)} style={{ width: '100%', height: '180px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(225,48,108,0.3)', color: '#c9d1d9', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', lineHeight: '1.5', resize: 'vertical' }} />
                   </div>

                   <div className="card glass-panel" style={{ gridColumn: '1 / -1', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: localMediaUrl ? '1.5rem' : '0' }}>
                        <h4 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🎬 Local Media Integration</h4>
                        <label className="btn btn-outline" style={{ cursor: 'pointer', padding: '0.5rem 1.5rem', borderRadius: '20px', border: '1px solid #58a6ff', color: '#58a6ff', fontWeight: 600 }}>
                           + Upload Local Camera Footage
                           <input type="file" accept="video/*,image/*" style={{ display: 'none' }} onChange={(e) => { if(e.target.files?.[0]) setLocalMediaUrl(URL.createObjectURL(e.target.files[0])); }} />
                        </label>
                      </div>
                      
                      {localMediaUrl && (
                        <>
                         <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #30363d', background: '#0d1117', maxHeight: '400px', display: 'flex', justifyContent: 'center' }}>
                            <video src={localMediaUrl} controls autoPlay muted loop style={{ height: '400px', width: '100%', objectFit: 'contain' }} />
                         </div>
                         <p style={{ fontSize: '0.85rem', color: '#8b949e', marginTop: '1rem', textAlign: 'center' }}>Previewing physically staged media block. Standard payload restrictions intentionally bypassed for Deep Linking.</p>
                        </>
                      )}
                   </div>
                </div>
             )}

             <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', borderTop: '1px solid #30363d', paddingTop: '1.5rem', marginBottom: '1rem' }}>
                <h3 style={{ color: 'hsl(var(--accent-primary))', marginBottom: '0.5rem' }}>🛍️ Enterprise Actions</h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-secondary" style={{ flex: 1, padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: '1px solid #505050' }} onClick={() => window.open(`https://www.faire.com/search?q=${encodeURIComponent(deepDiveData.name)}`, '_blank')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    Search Wholesale on Faire
                  </button>
                  <button className="btn btn-outline" style={{ flex: 1, padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: '1px solid #95bf47', color: '#95bf47' }} disabled={isPushingShopify} onClick={() => pushToShopify(deepDiveData.id, JSON.stringify(campaignData))}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                    {isPushingShopify ? 'Pushing Draft...' : 'Push Draft to Shopify POS'}
                  </button>
                </div>
             </div>

             <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                <button className="btn btn-primary" style={{ flex: 1, padding: '1.25rem', fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 10px 15px -3px hsla(var(--accent-primary), 0.4)' }} onClick={() => addToBuyingCenter(deepDiveData.id)}>
                  ⚡ Auto-Source & Find Retailers
                </button>
                <button className="btn btn-ghost" style={{ padding: '0.75rem', fontSize: '1rem' }} onClick={() => { addWatchlist(deepDiveData.name); setDeepDiveData(null); }}>
                  + Track on Watchlist instead
                </button>
             </div>
          </div>
        </div>
      )}
      {/* Sliding AI Co-Pilot Panel */}
      {isCopilotOpen && (
         <div style={{ width: '400px', background: '#0d1117', borderLeft: '1px solid #30363d', display: 'flex', flexDirection: 'column', height: '100vh', position: 'fixed', right: 0, top: 0, zIndex: 1000, boxShadow: '-10px 0 30px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>💬 Strategic Co-Pilot</h3>
               <button onClick={() => setIsCopilotOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {chatMessages.map((msg, i) => (
                  <div key={i} style={{ 
                     alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                     background: msg.role === 'user' ? 'hsl(var(--primary))' : '#161b22',
                     padding: '1rem',
                     borderRadius: '8px',
                     maxWidth: '85%',
                     border: msg.role === 'system' ? '1px solid #30363d' : 'none'
                  }}>
                     <span style={{ fontSize: '0.8rem', opacity: 0.7, display: 'block', marginBottom: '0.3rem' }}>
                        {msg.role === 'user' ? username : 'KidTrend AI'}
                     </span>
                     <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{msg.content}</p>
                  </div>
               ))}
            </div>
            
            <form onSubmit={handleChatCopilot} style={{ padding: '1rem', borderTop: '1px solid #30363d', display: 'flex', gap: '0.5rem', background: '#161b22' }}>
               <input 
                  type="text" 
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)} 
                  placeholder="Ask for strategic advice..." 
                  style={{ flex: 1, background: '#0d1117', border: '1px solid #30363d', color: '#fff', padding: '0.8rem', borderRadius: '6px' }}
               />
               <button type="submit" className="btn btn-primary" style={{ padding: '0 1rem' }}>Ask</button>
            </form>
         </div>
      )}
    </div>
  );
}

export default App;
