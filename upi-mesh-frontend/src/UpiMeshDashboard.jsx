/**
 * UPI Offline Mesh — React Dashboard
 * ------------------------------------
 * Drop this file into any React project.
 * Requires: tailwind (optional — all styles are inline), no other deps.
 *
 * Usage:
 *   import UpiMeshDashboard from './UpiMeshDashboard';
 *   <UpiMeshDashboard apiBase="http://localhost:8080" />
 *
 * The apiBase prop points at your running Spring Boot server.
 * Make sure CORS is enabled on the backend (see README section below).
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── tiny design tokens ────────────────────────────────────────────────────────
const C = {
  bg:        "#0A0F1E",
  surface:   "#111827",
  card:      "#161D2F",
  border:    "#1E2D45",
  accent:    "#3B82F6",
  accentGlow:"rgba(59,130,246,0.18)",
  teal:      "#14B8A6",
  tealGlow:  "rgba(20,184,166,0.15)",
  orange:    "#F97316",
  red:       "#EF4444",
  green:     "#22C55E",
  textPrim:  "#F1F5F9",
  textSec:   "#94A3B8",
  textMuted: "#475569",
};

const css = (obj) => Object.entries(obj).map(([k,v])=>`${k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}:${v}`).join(';');

// ─── style helpers ─────────────────────────────────────────────────────────────
const S = {
  page:        { background: C.bg, minHeight: "100vh", fontFamily: "'DM Mono', 'Fira Code', monospace", color: C.textPrim, padding: "24px" },
  card:        { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px" },
  cardGlow:    { background: C.card, border: `1px solid ${C.accent}`, borderRadius: 12, padding: "20px", boxShadow: `0 0 24px ${C.accentGlow}` },
  btn:         (col="#3B82F6") => ({ background: col, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", transition: "opacity .15s, transform .1s" }),
  btnGhost:    { background: "transparent", color: C.textSec, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 },
  input:       { background: "#0D1526", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.textPrim, fontFamily: "inherit", fontSize: 13, outline: "none" },
  label:       { fontSize: 11, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4, display: "block" },
  tag:         (col) => ({ background: col+"22", color: col, border: `1px solid ${col}44`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }),
  mono:        { fontFamily: "'DM Mono','Fira Code',monospace", fontSize: 12 },
  sectionTitle:{ fontSize: 11, color: C.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14, fontWeight: 700 },
  h1:          { fontSize: 22, fontWeight: 800, color: C.textPrim, letterSpacing: "-0.02em" },
  h2:          { fontSize: 15, fontWeight: 700, color: C.textPrim, letterSpacing: "-0.01em" },
  divider:     { border: "none", borderTop: `1px solid ${C.border}`, margin: "16px 0" },
};

// ─── API layer ─────────────────────────────────────────────────────────────────
function makeApi(base) {
  const call = async (method, path, body) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  return {
    accounts:    ()      => call("GET",  "/api/accounts"),
    transactions:()      => call("GET",  "/api/transactions"),
    meshState:   ()      => call("GET",  "/api/mesh/state"),
    serverKey:   ()      => call("GET",  "/api/server-key"),
    send:        (body)  => call("POST", "/api/demo/send",    body),
    gossip:      ()      => call("POST", "/api/mesh/gossip"),
    flush:       ()      => call("POST", "/api/mesh/flush"),
    reset:       ()      => call("POST", "/api/mesh/reset"),
  };
}

// ─── tiny hooks ────────────────────────────────────────────────────────────────
function useApi(apiBase) {
  const api = useRef(makeApi(apiBase));
  useEffect(() => { api.current = makeApi(apiBase); }, [apiBase]);
  return api.current;
}

function useInterval(fn, ms) {
  const cb = useRef(fn);
  useEffect(() => { cb.current = fn; }, [fn]);
  useEffect(() => {
    const id = setInterval(() => cb.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

// ─── sub-components ────────────────────────────────────────────────────────────

function TopBar({ apiBase, setApiBase, connected }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(apiBase);
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>📡</span>
          <span style={S.h1}>UPI Offline Mesh</span>
          <span style={S.tag(C.accent)}>REACT UI</span>
        </div>
        <div style={{ color:C.textMuted, fontSize:12, marginTop:4 }}>
          Encrypted payments over ad-hoc mesh — zero internet required
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background: connected ? C.green : C.red, display:"inline-block", boxShadow: connected ? `0 0 8px ${C.green}` : "none" }} />
          <span style={{ fontSize:12, color: connected ? C.green : C.red }}>
            {connected ? "Backend Connected" : "Backend Offline"}
          </span>
        </div>
        {editing ? (
          <div style={{ display:"flex", gap:6 }}>
            <input style={{ ...S.input, width:200 }} value={draft} onChange={e=>setDraft(e.target.value)} />
            <button style={S.btn(C.teal)} onClick={()=>{ setApiBase(draft); setEditing(false); }}>Save</button>
            <button style={S.btnGhost} onClick={()=>setEditing(false)}>✕</button>
          </div>
        ) : (
          <button style={S.btnGhost} onClick={()=>setEditing(true)}>
            ⚙ {apiBase}
          </button>
        )}
      </div>
    </div>
  );
}

function StepBadge({ n, active }) {
  return (
    <span style={{
      width:24, height:24, borderRadius:"50%", display:"inline-flex", alignItems:"center", justifyContent:"center",
      background: active ? C.accent : C.border, color: active ? "#fff" : C.textMuted,
      fontSize:12, fontWeight:800, flexShrink:0,
    }}>{n}</span>
  );
}

function SendPanel({ api, onRefresh, log }) {
  const VPAs = ["alice@demo","bob@demo","carol@demo","dave@demo"];
  const [form, setForm] = useState({ senderVpa:"alice@demo", receiverVpa:"bob@demo", amount:"500", pin:"1234", ttl:5, startDevice:"phone-alice" });
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const send = async () => {
    setLoading(true);
    try {
      const res = await api.send({ ...form, amount: parseFloat(form.amount) });
      setLastResult({ ok:true, ...res });
      log(`💳 Packet ${res.packetId?.slice(0,8)} injected at ${res.injectedAt}`);
      onRefresh();
    } catch(e) {
      setLastResult({ ok:false, error: e.message });
      log(`❌ Send failed: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={S.cardGlow}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <StepBadge n="1" active />
        <div>
          <div style={S.h2}>Compose &amp; Inject Payment</div>
          <div style={{ fontSize:11, color:C.textMuted }}>Simulates sender phone encrypting and broadcasting the packet</div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        <div>
          <label style={S.label}>Sender VPA</label>
          <select style={{ ...S.input, width:"100%" }} value={form.senderVpa} onChange={e=>set("senderVpa",e.target.value)}>
            {VPAs.map(v=><option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Receiver VPA</label>
          <select style={{ ...S.input, width:"100%" }} value={form.receiverVpa} onChange={e=>set("receiverVpa",e.target.value)}>
            {VPAs.map(v=><option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Amount (₹)</label>
          <input style={{ ...S.input, width:"100%" }} type="number" value={form.amount} onChange={e=>set("amount",e.target.value)} />
        </div>
        <div>
          <label style={S.label}>PIN</label>
          <input style={{ ...S.input, width:"100%" }} type="password" value={form.pin} onChange={e=>set("pin",e.target.value)} />
        </div>
        <div>
          <label style={S.label}>TTL (hops)</label>
          <input style={{ ...S.input, width:"100%" }} type="number" min={1} max={10} value={form.ttl} onChange={e=>set("ttl",parseInt(e.target.value))} />
        </div>
        <div>
          <label style={S.label}>Start Device</label>
          <select style={{ ...S.input, width:"100%" }} value={form.startDevice} onChange={e=>set("startDevice",e.target.value)}>
            {["phone-alice","phone-bridge","phone-stranger1","phone-stranger2","phone-stranger3"].map(d=><option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <button style={{ ...S.btn(C.accent), width:"100%", padding:"11px", fontSize:14 }} onClick={send} disabled={loading}>
        {loading ? "⏳ Encrypting & Injecting…" : "🔒 Encrypt & Inject into Mesh"}
      </button>

      {lastResult && (
        <div style={{ marginTop:12, background: lastResult.ok ? "#14B8A611" : "#EF444411", border:`1px solid ${lastResult.ok?C.teal:C.red}33`, borderRadius:8, padding:"10px 12px" }}>
          {lastResult.ok ? (
            <div style={{ ...S.mono, color: C.teal }}>
              <div>✓ packetId: <b>{lastResult.packetId?.slice(0,16)}…</b></div>
              <div>✓ injected at: <b>{lastResult.injectedAt}</b></div>
              <div style={{ color:C.textMuted, marginTop:4, fontSize:11 }}>ciphertext: {lastResult.ciphertextPreview}</div>
            </div>
          ) : (
            <div style={{ color:C.red, fontSize:12 }}>✕ {lastResult.error}</div>
          )}
        </div>
      )}
    </div>
  );
}

function MeshPanel({ api, meshState, onRefresh, log }) {
  const [gossipResult, setGossipResult]   = useState(null);
  const [flushResult,  setFlushResult]    = useState(null);
  const [loadingG, setLoadingG]           = useState(false);
  const [loadingF, setLoadingF]           = useState(false);
  const [loadingR, setLoadingR]           = useState(false);

  const gossip = async () => {
    setLoadingG(true);
    try {
      const r = await api.gossip();
      setGossipResult(r);
      log(` Gossip round: ${JSON.stringify(r.transfers)} transfer(s)`);
      onRefresh();
    } catch(e) { log(`❌ Gossip failed: ${e.message}`); }
    setLoadingG(false);
  };

  const flush = async () => {
    setLoadingF(true);
    try {
      const r = await api.flush();
      setFlushResult(r);
      log(` Flush: ${r.uploadsAttempted} upload(s) attempted`);
      r.results?.forEach(x => log(`  ${x.bridgeNode} → ${x.outcome}${x.reason?" ("+x.reason+")":""}`));
      onRefresh();
    } catch(e) { log(`❌ Flush failed: ${e.message}`); }
    setLoadingF(false);
  };

  const reset = async () => {
    setLoadingR(true);
    setGossipResult(null); setFlushResult(null);
    try {
      await api.reset();
      log(`🗑 Mesh + idempotency cache cleared`);
      onRefresh();
    } catch(e) { log(`❌ Reset failed: ${e.message}`); }
    setLoadingR(false);
  };

  const devices = meshState?.devices || [];
  const cacheSize = meshState?.idempotencyCacheSize ?? "–";

  return (
    <div style={S.card}>
      {/* Step buttons */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <StepBadge n="2" active={devices.some(d=>d.packetCount>0)} />
          <button style={S.btn(C.teal)} onClick={gossip} disabled={loadingG}>
            {loadingG ? "⏳ Gossiping…" : "🔄 Run Gossip Round"}
          </button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <StepBadge n="3" active={devices.some(d=>d.hasInternet&&d.packetCount>0)} />
          <button style={S.btn(C.orange)} onClick={flush} disabled={loadingF}>
            {loadingF ? "⏳ Uploading…" : "📡 Flush Bridges → Backend"}
          </button>
        </div>
        <button style={{ ...S.btn(C.red), marginLeft:"auto" }} onClick={reset} disabled={loadingR}>
          {loadingR ? "…" : "🗑 Reset"}
        </button>
      </div>

      {/* Device grid */}
      <div style={S.sectionTitle}>📱 Mesh Devices</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:8 }}>
        {devices.map(d => {
          const isOnline  = d.hasInternet;
          const hasPacket = d.packetCount > 0;
          const borderCol = isOnline ? C.accent : hasPacket ? C.teal : C.border;
          return (
            <div key={d.deviceId} style={{
              background:"#0D1526", border:`1px solid ${borderCol}`,
              borderRadius:10, padding:"12px 14px",
              boxShadow: isOnline ? `0 0 16px ${C.accentGlow}` : "none",
              transition:"all .3s",
            }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontWeight:700, fontSize:13, color: isOnline ? C.accent : C.textPrim }}>
                  {isOnline ? "📶" : "📵"} {d.deviceId}
                </span>
                <span style={S.tag(isOnline ? C.green : C.textMuted)}>
                  {isOnline ? "4G" : "OFF"}
                </span>
              </div>
              <div style={{ fontSize:12, color: hasPacket ? C.teal : C.textMuted }}>
                {hasPacket ? `📦 ${d.packetCount} packet(s)` : "empty"}
              </div>
              {d.packetIds?.length > 0 && (
                <div style={{ marginTop:4, fontSize:10, color:C.textMuted, ...S.mono }}>
                  {d.packetIds.map(id=><div key={id}>#{id}</div>)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Gossip result */}
      {gossipResult && (
        <div style={{ marginTop:12, background:"#14B8A608", border:`1px solid ${C.teal}22`, borderRadius:8, padding:"10px 12px" }}>
          <div style={{ fontSize:11, color:C.teal, marginBottom:4, fontWeight:700 }}>GOSSIP RESULT</div>
          <div style={{ ...S.mono, fontSize:11, color:C.textSec }}>
            {Object.entries(gossipResult.transfers||{}).map(([k,v])=>(
              <div key={k}>{k}: <span style={{color:C.textPrim}}>{v} transfer(s)</span></div>
            ))}
          </div>
        </div>
      )}

      {/* Flush result */}
      {flushResult && (
        <div style={{ marginTop:12, background:"#F9731608", border:`1px solid ${C.orange}22`, borderRadius:8, padding:"10px 12px" }}>
          <div style={{ fontSize:11, color:C.orange, marginBottom:6, fontWeight:700 }}>
            BRIDGE UPLOAD — {flushResult.uploadsAttempted} upload(s)
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {flushResult.results?.map((r,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, ...S.mono, fontSize:11 }}>
                <span style={S.tag(r.outcome==="SETTLED"?C.green:r.outcome==="DUPLICATE_DROPPED"?C.orange:C.red)}>
                  {r.outcome}
                </span>
                <span style={{color:C.textSec}}>{r.bridgeNode}</span>
                <span style={{color:C.textMuted}}>#{r.packetId}</span>
                {r.reason && <span style={{color:C.textMuted}}>— {r.reason}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Idempotency cache */}
      <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:12, color:C.textMuted }}>Idempotency cache:</span>
        <span style={{ ...S.tag(cacheSize>0?C.accent:C.textMuted), fontSize:12 }}>{cacheSize} entries</span>
        <span style={{ fontSize:11, color:C.textMuted }}>— prevents duplicate settlements</span>
      </div>
    </div>
  );
}

function AccountsPanel({ accounts }) {
  const colors = ["alice@demo","bob@demo","carol@demo","dave@demo"];
  const palette = [C.accent, C.teal, C.orange, "#A855F7"];
  return (
    <div style={S.card}>
      <div style={S.sectionTitle}>🏦 Account Balances</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {accounts.map((acc,i) => {
          const col = palette[i % palette.length];
          const pct = Math.min(100, (parseFloat(acc.balance)/5000)*100);
          return (
            <div key={acc.vpa} style={{ background:"#0D1526", borderRadius:10, padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <div>
                  <span style={{ fontWeight:700, fontSize:13, color:C.textPrim }}>{acc.holderName}</span>
                  <span style={{ fontSize:11, color:C.textMuted, marginLeft:8 }}>{acc.vpa}</span>
                </div>
                <span style={{ fontWeight:800, fontSize:15, color:col }}>
                  ₹{parseFloat(acc.balance).toLocaleString("en-IN", {minimumFractionDigits:2})}
                </span>
              </div>
              <div style={{ background:C.border, borderRadius:4, height:4 }}>
                <div style={{ background:col, borderRadius:4, height:4, width:`${pct}%`, transition:"width .5s" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TransactionsPanel({ transactions }) {
  if (!transactions.length) return (
    <div style={S.card}>
      <div style={S.sectionTitle}>📋 Transaction Ledger</div>
      <div style={{ color:C.textMuted, fontSize:13, textAlign:"center", padding:"24px 0" }}>No transactions yet</div>
    </div>
  );
  return (
    <div style={S.card}>
      <div style={S.sectionTitle}>📋 Transaction Ledger</div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", ...S.mono, fontSize:12 }}>
          <thead>
            <tr style={{ color:C.textMuted, fontSize:11, letterSpacing:"0.06em" }}>
              {["ID","FROM","TO","AMOUNT","STATUS","BRIDGE","HOPS","SETTLED"].map(h=>(
                <th key={h} style={{ textAlign:"left", padding:"6px 10px", borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx,i)=>{
              const isSettled = tx.status === "SETTLED";
              return (
                <tr key={tx.id} style={{ background: i%2===0?"transparent":"#0D152622", transition:"background .15s" }}>
                  <td style={{ padding:"8px 10px", color:C.textMuted }}>#{tx.id}</td>
                  <td style={{ padding:"8px 10px", color:C.textSec }}>{tx.senderVpa}</td>
                  <td style={{ padding:"8px 10px", color:C.textSec }}>{tx.receiverVpa}</td>
                  <td style={{ padding:"8px 10px", color:isSettled?C.green:C.red, fontWeight:700 }}>
                    ₹{parseFloat(tx.amount).toLocaleString("en-IN",{minimumFractionDigits:2})}
                  </td>
                  <td style={{ padding:"8px 10px" }}>
                    <span style={S.tag(isSettled?C.green:C.red)}>{tx.status}</span>
                  </td>
                  <td style={{ padding:"8px 10px", color:C.textMuted }}>{tx.bridgeNodeId}</td>
                  <td style={{ padding:"8px 10px", color:C.textMuted, textAlign:"center" }}>{tx.hopCount}</td>
                  <td style={{ padding:"8px 10px", color:C.textMuted, whiteSpace:"nowrap" }}>
                    {tx.settledAt ? new Date(tx.settledAt).toLocaleTimeString() : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityLog({ logs }) {
  const ref = useRef(null);
  useEffect(()=>{ if(ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
  return (
    <div style={S.card}>
      <div style={S.sectionTitle}>🖥 Activity Log</div>
      <div ref={ref} style={{ background:"#050A14", borderRadius:8, padding:"12px", height:180, overflowY:"auto", ...S.mono, fontSize:11 }}>
        {logs.length===0 && <span style={{color:C.textMuted}}>Waiting for activity…</span>}
        {logs.map((l,i)=>(
          <div key={i} style={{ color: l.startsWith("❌")? C.red : l.startsWith("✓")||l.includes("SETTLED")?C.green:C.textSec, lineHeight:"1.7" }}>
            <span style={{color:C.textMuted}}>[{new Date().toLocaleTimeString()}] </span>{l}
          </div>
        ))}
      </div>
    </div>
  );
}

function ServerKeyPanel({ api }) {
  const [key, setKey] = useState(null);
  const [open, setOpen] = useState(false);
  const fetch_ = async () => {
    const k = await api.serverKey();
    setKey(k); setOpen(true);
  };
  return (
    <div style={S.card}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={S.sectionTitle}>🔑 Server Public Key</div>
          <div style={{ fontSize:11, color:C.textMuted }}>RSA-2048 / OAEP-SHA256 — Sender phones use this to encrypt the AES key</div>
        </div>
        <button style={S.btnGhost} onClick={key?()=>setOpen(!open):fetch_}>
          {key ? (open?"Hide":"Show") : "Fetch Key"}
        </button>
      </div>
      {open && key && (
        <div style={{ marginTop:12, background:"#050A14", borderRadius:8, padding:12, ...S.mono, fontSize:10, color:C.teal, wordBreak:"break-all", lineHeight:1.6 }}>
          <div style={{ color:C.textMuted, marginBottom:4 }}>Algorithm: {key.algorithm}</div>
          <div style={{ color:C.textMuted, marginBottom:6 }}>Scheme: {key.hybridScheme}</div>
          {key.publicKey}
        </div>
      )}
    </div>
  );
}

function HowItWorksPanel() {
  const steps = [
    { icon:"🔒", title:"Encrypt", desc:"Sender phone generates AES-256 key, encrypts payload with AES-GCM, wraps AES key with server RSA-2048 public key." },
    { icon:"📶", title:"Gossip", desc:"Packet hops device-to-device via BLE (simulated here). TTL decrements each hop. Intermediaries can't read it." },
    { icon:"☁", title:"Bridge", desc:"First phone with 4G uploads all held packets to POST /api/bridge/ingest in parallel." },
    { icon:"✅", title:"Settle", desc:"Server: SHA-256 hash → atomic claim → RSA decrypt → freshness check → @Transactional debit+credit." },
  ];
  return (
    <div style={S.card}>
      <div style={S.sectionTitle}>📖 How It Works</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {steps.map((s,i)=>(
          <div key={i} style={{ textAlign:"center", padding:"14px 10px", background:"#0D1526", borderRadius:10, position:"relative" }}>
            {i<3 && <div style={{ position:"absolute", right:-8, top:"50%", transform:"translateY(-50%)", color:C.textMuted, fontSize:18, zIndex:1 }}>›</div>}
            <div style={{ fontSize:22, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontWeight:700, fontSize:12, color:C.textPrim, marginBottom:4 }}>{s.title}</div>
            <div style={{ fontSize:11, color:C.textMuted, lineHeight:1.6 }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CORS helper notice ────────────────────────────────────────────────────────
function CorsNotice({ visible }) {
  if (!visible) return null;
  return (
    <div style={{ background:"#EF444411", border:`1px solid ${C.red}44`, borderRadius:10, padding:"14px 18px", marginBottom:20 }}>
      <div style={{ fontWeight:700, color:C.red, marginBottom:6 }}>⚠ Backend not reachable — add CORS to Spring Boot</div>
      <div style={{ ...S.mono, fontSize:12, color:C.textSec, lineHeight:1.8 }}>
        Add this class to your Spring Boot project:<br/>
        <span style={{color:C.teal}}>@Configuration</span><br/>
        <span style={{color:C.teal}}>public class</span> <span style={{color:C.accent}}>CorsConfig</span> <span style={{color:C.teal}}>implements</span> WebMvcConfigurer {"{"}<br/>
        &nbsp;&nbsp;<span style={{color:C.teal}}>@Override public void</span> addCorsMappings(CorsRegistry r) {"{"}<br/>
        &nbsp;&nbsp;&nbsp;&nbsp;r.addMapping(<span style={{color:C.orange}}>"/api/**"</span>).allowedOrigins(<span style={{color:C.orange}}>"*"</span>).allowedMethods(<span style={{color:C.orange}}>"*"</span>);<br/>
        &nbsp;&nbsp;{"}"}<br/>
        {"}"}
      </div>
    </div>
  );
}

// ─── ROOT COMPONENT ────────────────────────────────────────────────────────────
export default function UpiMeshDashboard({ apiBase: initialBase = "http://localhost:8080" }) {
  const [apiBase, setApiBase]         = useState(initialBase);
  const api                           = useApi(apiBase);
  const [accounts, setAccounts]       = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [meshState, setMeshState]     = useState(null);
  const [connected, setConnected]     = useState(false);
  const [logs, setLogs]               = useState([]);

  const log = useCallback((msg) => setLogs(l => [...l.slice(-100), msg]), []);

  const refresh = useCallback(async () => {
    try {
      const [accs, txs, mesh] = await Promise.all([
        api.accounts(), api.transactions(), api.meshState(),
      ]);
      setAccounts(accs);
      setTransactions(txs);
      setMeshState(mesh);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, [api]);

  useEffect(() => { refresh(); }, [refresh]);
  useInterval(refresh, 3000);

  return (
    <div style={S.page}>
      {/* Google Font */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <TopBar apiBase={apiBase} setApiBase={setApiBase} connected={connected} />
      <CorsNotice visible={!connected} />
      <HowItWorksPanel />
      <div style={{ height:16 }} />

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <SendPanel api={api} onRefresh={refresh} log={log} />
        <AccountsPanel accounts={accounts} />
      </div>

      <MeshPanel api={api} meshState={meshState} onRefresh={refresh} log={log} />
      <div style={{ height:16 }} />

      <TransactionsPanel transactions={transactions} />
      <div style={{ height:16 }} />

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <ActivityLog logs={logs} />
        <ServerKeyPanel api={api} />
      </div>

      <div style={{ textAlign:"center", marginTop:24, color:C.textMuted, fontSize:11 }}>
        Auto-refreshes every 3s · Spring Boot {apiBase} · React UI
      </div>
    </div>
  );
}
