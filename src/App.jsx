import { useState, useMemo, useEffect, useRef } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const initialData = [
  { id: 1, date: "2024-01-15", arsInvested: 150000, btcPrice: 42000, usdRate: 800 },
  { id: 2, date: "2024-02-15", arsInvested: 150000, btcPrice: 52000, usdRate: 850 },
  { id: 3, date: "2024-03-15", arsInvested: 150000, btcPrice: 71000, usdRate: 900 },
  { id: 4, date: "2024-04-15", arsInvested: 150000, btcPrice: 64000, usdRate: 950 },
  { id: 5, date: "2024-05-15", arsInvested: 150000, btcPrice: 61000, usdRate: 1000 },
  { id: 6, date: "2024-06-15", arsInvested: 150000, btcPrice: 63000, usdRate: 1050 },
  { id: 7, date: "2024-07-15", arsInvested: 150000, btcPrice: 66000, usdRate: 1100 },
  { id: 8, date: "2024-08-15", arsInvested: 150000, btcPrice: 59000, usdRate: 1150 },
  { id: 9, date: "2024-09-15", arsInvested: 150000, btcPrice: 63000, usdRate: 1200 },
  { id: 10, date: "2024-10-15", arsInvested: 150000, btcPrice: 68000, usdRate: 1250 },
  { id: 11, date: "2024-11-15", arsInvested: 150000, btcPrice: 91000, usdRate: 1300 },
  { id: 12, date: "2024-12-15", arsInvested: 150000, btcPrice: 97000, usdRate: 1350 },
];

const initialCocos = [
  { id: 1, date: "2024-01-20", ticker: "AL30", arsInvested: 200000, priceBought: 35000, quantity: 5.71 },
  { id: 2, date: "2024-02-25", ticker: "YPFD", arsInvested: 150000, priceBought: 18000, quantity: 8.33 },
];

const BTC_CURRENT_PRICE = 0;

function fmt(n, decimals = 2) {
  return n?.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtUSD(n) { return "$" + fmt(n, 2); }
function fmtARS(n) { return "ARS " + fmt(n, 0); }
function fmtBTC(n) { return fmt(n, 8) + " ₿"; }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(255,255,255,0.95)", border: "1px solid #e2e8f0",
      borderRadius: 8, padding: "10px 14px", fontSize: 12,
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
    }}>
      <div style={{ color: "#0f172a", fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "#0f172a" }}>
          {p.name}: <strong>{typeof p.value === "number" ? fmt(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

export default function BTCTracker() {
  const [purchases, setPurchases] = useState(initialData);
  const [cocosInvestments, setCocosInvestments] = useState(initialCocos);
  const [tab, setTab] = useState("dashboard");
  const [showModal, setShowModal] = useState(false);
  const [showCocosModal, setShowCocosModal] = useState(false);
  const [btcPrice, setBtcPrice] = useState(BTC_CURRENT_PRICE);
  const [usdtArs, setUsdtArs] = useState(0);
  const [btcChange24h, setBtcChange24h] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [priceStatus, setPriceStatus] = useState("loading"); // "loading" | "live" | "error"
  
  const [form, setForm] = useState({ date: "", arsInvested: 150000, btcPrice: "", usdRate: "" });
  const [editId, setEditId] = useState(null);

  const [cocosForm, setCocosForm] = useState({ date: "", ticker: "", arsInvested: "", priceBought: "" });
  const [cocosEditId, setCocosEditId] = useState(null);

  const intervalRef = useRef(null);

  async function fetchPrices() {
    try {
      setPriceStatus("loading");
      const [btcRes, usdtRes] = await Promise.all([
        fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"),
        fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=USDTARS"),
      ]);
      const btcData = await btcRes.json();
      const usdtData = await usdtRes.json();
      setBtcPrice(parseFloat(btcData.lastPrice));
      setBtcChange24h(parseFloat(btcData.priceChangePercent));
      setUsdtArs(parseFloat(usdtData.lastPrice));
      setLastUpdated(new Date());
      setPriceStatus("live");
    } catch (e) {
      setPriceStatus("error");
    }
  }

  useEffect(() => {
    fetchPrices();
    intervalRef.current = setInterval(fetchPrices, 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const enriched = useMemo(() => {
    let cumBTC = 0, cumARS = 0;
    return purchases.map(p => {
      const usdInvested = p.arsInvested / p.usdRate;
      const btcBought = usdInvested / p.btcPrice;
      cumBTC += btcBought;
      cumARS += p.arsInvested;
      const d = new Date(p.date);
      return {
        ...p,
        usdInvested,
        btcBought,
        cumBTC,
        cumARS,
        avgPrice: (cumARS / p.usdRate) / cumBTC,
        label: `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`,
        currentValueUSD: cumBTC * btcPrice,
        pnlUSD: (cumBTC * btcPrice) - (cumARS / p.usdRate),
      };
    });
  }, [purchases, btcPrice]);

  const cocosEnriched = useMemo(() => {
    return cocosInvestments.map(c => {
      return {
        ...c,
        quantity: c.arsInvested / c.priceBought
      };
    });
  }, [cocosInvestments]);

  const last = enriched[enriched.length - 1] || {};
  const totalARS = purchases.reduce((s, p) => s + p.arsInvested, 0);
  const totalBTC = enriched.reduce((s, p) => s + p.btcBought, 0);
  const avgBuyPrice = totalARS / (purchases[0]?.usdRate || 1) / totalBTC;
  const currentValueUSD = totalBTC * btcPrice;
  const totalUSDInvested = purchases.reduce((s, p) => s + p.arsInvested / p.usdRate, 0);
  const pnlUSD = currentValueUSD - totalUSDInvested;
  const pnlPct = (pnlUSD / totalUSDInvested) * 100;
  const isPnlPos = pnlUSD >= 0;

  const totalCocosARS = cocosInvestments.reduce((s, c) => s + Number(c.arsInvested), 0);

  function saveForm() {
    if (!form.date || !form.btcPrice || !form.usdRate) return;
    const entry = {
      id: editId || Date.now(),
      date: form.date,
      arsInvested: Number(form.arsInvested),
      btcPrice: Number(form.btcPrice),
      usdRate: Number(form.usdRate),
    };
    if (editId) {
      setPurchases(prev => prev.map(p => p.id === editId ? entry : p));
      setEditId(null);
    } else {
      setPurchases(prev => [...prev, entry].sort((a, b) => a.date.localeCompare(b.date)));
    }
    setForm({ date: "", arsInvested: 150000, btcPrice: "", usdRate: "" });
    setShowModal(false);
  }

  function startEdit(p) {
    setForm({ date: p.date, arsInvested: p.arsInvested, btcPrice: p.btcPrice, usdRate: p.usdRate });
    setEditId(p.id);
    setShowModal(true);
  }

  function deletePurchase(id) {
    setPurchases(prev => prev.filter(p => p.id !== id));
  }

  function saveCocosForm() {
    if (!cocosForm.date || !cocosForm.ticker || !cocosForm.arsInvested || !cocosForm.priceBought) return;
    const entry = {
      id: cocosEditId || Date.now(),
      date: cocosForm.date,
      ticker: cocosForm.ticker.toUpperCase(),
      arsInvested: Number(cocosForm.arsInvested),
      priceBought: Number(cocosForm.priceBought),
    };
    if (cocosEditId) {
      setCocosInvestments(prev => prev.map(p => p.id === cocosEditId ? entry : p));
      setCocosEditId(null);
    } else {
      setCocosInvestments(prev => [...prev, entry].sort((a, b) => a.date.localeCompare(b.date)));
    }
    setCocosForm({ date: "", ticker: "", arsInvested: "", priceBought: "" });
    setShowCocosModal(false);
  }

  function startCocosEdit(p) {
    setCocosForm({ date: p.date, ticker: p.ticker, arsInvested: p.arsInvested, priceBought: p.priceBought });
    setCocosEditId(p.id);
    setShowCocosModal(true);
  }

  function deleteCocosPurchase(id) {
    setCocosInvestments(prev => prev.filter(p => p.id !== id));
  }

  // UPDATED DESIGN (Light Mode)
  const s = {
    app: {
      minHeight: "100vh", background: "#f8fafc",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: "#0f172a",
    },
    header: {
      borderBottom: "1px solid #e2e8f0",
      padding: "0 32px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "rgba(255,255,255,0.9)",
      position: "sticky", top: 0, zIndex: 100,
      backdropFilter: "blur(12px)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    },
    logo: {
      display: "flex", alignItems: "center", gap: 10,
      padding: "16px 0",
    },
    logoIcon: {
      width: 36, height: 36, borderRadius: "50%",
      background: "linear-gradient(135deg, #f59e0b, #ea580c)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 18, fontWeight: 900, color: "#fff"
    },
    logoText: { fontSize: 16, fontWeight: 800, letterSpacing: 1.5, color: "#1e293b" },
    nav: { display: "flex", gap: 8 },
    navBtn: (active) => ({
      padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
      fontSize: 12, fontWeight: 700, letterSpacing: 1,
      fontFamily: "inherit",
      background: active ? "#fff" : "transparent",
      color: active ? "#ea580c" : "#64748b",
      boxShadow: active ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
      transition: "all 0.2s",
    }),
    priceBar: {
      display: "flex", alignItems: "center", gap: 16,
    },
    priceChip: (color) => ({
      display: "flex", flexDirection: "column", alignItems: "flex-end",
      background: "#fff", border: `1px solid #e2e8f0`,
      borderRadius: 8, padding: "6px 12px", minWidth: 110,
    }),
    priceLabel: { fontSize: 10, color: "#64748b", letterSpacing: 1, fontWeight: 600 },
    priceValue: (color) => ({ fontSize: 15, fontWeight: 800, color, lineHeight: 1.2 }),
    priceSub: (pos) => ({ fontSize: 10, color: pos ? "#16a34a" : "#dc2626", fontWeight: 600 }),
    statusDot: (status) => ({
      width: 7, height: 7, borderRadius: "50%",
      background: status === "live" ? "#16a34a" : status === "loading" ? "#f59e0b" : "#dc2626",
      boxShadow: status === "live" ? "0 0 6px #16a34a" : "none",
      animation: status === "loading" ? "pulse 1s infinite" : "none",
      display: "inline-block",
    }),
    content: { padding: "32px", maxWidth: 1400, margin: "0 auto" },
    grid4: {
      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16, marginBottom: 24,
    },
    grid2: {
      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 16, marginBottom: 24,
    },
    card: {
      background: "#fff", border: "1px solid #e2e8f0",
      borderRadius: 16, padding: "24px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
    },
    statCard: (accent = "#f59e0b") => ({
      background: "#fff",
      border: `1px solid #e2e8f0`,
      borderLeft: `4px solid ${accent}`,
      borderRadius: 12, padding: "20px 24px",
      position: "relative", overflow: "hidden",
      boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
    }),
    statLabel: { fontSize: 11, color: "#64748b", letterSpacing: 1, marginBottom: 6, fontWeight: 700 },
    statValue: (accent = "#f59e0b") => ({
      fontSize: 24, fontWeight: 800, color: "#0f172a", lineHeight: 1,
    }),
    statSub: { fontSize: 12, color: "#64748b", marginTop: 6, fontWeight: 500 },
    sectionTitle: {
      fontSize: 14, fontWeight: 800, letterSpacing: 1, color: "#1e293b",
      marginBottom: 20, display: "flex", alignItems: "center", gap: 8,
    },
    addBtn: {
      background: "linear-gradient(135deg, #f59e0b, #ea580c)",
      border: "none", color: "#fff", padding: "10px 20px",
      borderRadius: 8, cursor: "pointer", fontWeight: 700,
      fontSize: 12, letterSpacing: 1, fontFamily: "inherit",
      boxShadow: "0 4px 6px rgba(234, 88, 12, 0.2)",
    },
    addCocosBtn: {
      background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
      border: "none", color: "#fff", padding: "10px 20px",
      borderRadius: 8, cursor: "pointer", fontWeight: 700,
      fontSize: 12, letterSpacing: 1, fontFamily: "inherit",
      boxShadow: "0 4px 6px rgba(37, 99, 235, 0.2)",
    },
    table: { width: "100%", borderCollapse: "collapse" },
    th: {
      textAlign: "left", padding: "12px 14px",
      fontSize: 11, color: "#64748b", letterSpacing: 1, fontWeight: 700,
      borderBottom: "2px solid #e2e8f0",
      textTransform: "uppercase"
    },
    td: {
      padding: "14px", fontSize: 13, fontWeight: 500, color: "#334155",
      borderBottom: "1px solid #f1f5f9",
    },
    badge: (pos) => ({
      display: "inline-block", padding: "4px 10px", borderRadius: 6,
      fontSize: 11, fontWeight: 800,
      background: pos ? "#dcfce7" : "#fee2e2",
      color: pos ? "#16a34a" : "#dc2626",
    }),
    modal: {
      position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, backdropFilter: "blur(4px)",
    },
    modalBox: {
      background: "#fff", border: "1px solid #e2e8f0",
      borderRadius: 16, padding: "32px", minWidth: 400,
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    },
    input: {
      width: "100%", background: "#f8fafc", border: "1px solid #cbd5e1",
      color: "#0f172a", padding: "12px 14px", borderRadius: 8,
      fontFamily: "inherit", fontSize: 14, boxSizing: "border-box", fontWeight: 500,
      transition: "border 0.2s",
      outline: "none",
    },
    label: { fontSize: 11, color: "#475569", letterSpacing: 1, marginBottom: 6, display: "block", fontWeight: 700 },
    saveBtn: {
      background: "linear-gradient(135deg, #16a34a, #15803d)",
      border: "none", color: "#fff", padding: "14px 0",
      borderRadius: 8, cursor: "pointer", fontWeight: 800,
      fontSize: 13, letterSpacing: 1, fontFamily: "inherit",
      width: "100%", marginTop: 12,
      boxShadow: "0 4px 6px rgba(22, 163, 74, 0.2)",
    },
    cancelBtn: {
      background: "transparent", border: "1px solid #cbd5e1",
      color: "#64748b", padding: "14px 0", borderRadius: 8,
      cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
      width: "100%", marginTop: 8,
    },
    iconBtn: {
      background: "none", border: "none", cursor: "pointer",
      padding: "6px", borderRadius: 4, fontSize: 14,
    },
  };

  return (
    <div style={s.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        input:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); }
      `}</style>
      
      {/* HEADER */}
      <header style={s.header}>
        <div style={s.logo}>
          <div style={s.logoIcon}>₿</div>
          <span style={s.logoText}>PORTFOLIO TRACKER</span>
        </div>
        <nav style={s.nav}>
          {["dashboard","compras BTC","cocos", "graficos"].map(t => (
            <button key={t} style={s.navBtn(tab === t)} onClick={() => setTab(t)}>
              {t.toUpperCase()}
            </button>
          ))}
        </nav>
        <div style={s.priceBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={s.statusDot(priceStatus)} />
            <span style={{ fontSize: 10, color: "#64748b", letterSpacing: 0.5, fontWeight: 600 }}>
              {priceStatus === "live" ? (lastUpdated ? `${lastUpdated.toLocaleTimeString("es-AR")}` : "LIVE") : priceStatus === "loading" ? "ACTUALIZANDO..." : "ERROR"}
            </span>
          </div>
          <div style={s.priceChip("#f59e0b")}>
            <span style={s.priceLabel}>BTC / USDT</span>
            <span style={s.priceValue("#ea580c")}>
              {btcPrice > 0 ? "$" + btcPrice.toLocaleString("es-AR", { maximumFractionDigits: 0 }) : "—"}
            </span>
            {btcChange24h !== 0 && (
              <span style={s.priceSub(btcChange24h >= 0)}>
                {btcChange24h >= 0 ? "▲" : "▼"} {Math.abs(btcChange24h).toFixed(2)}% 24h
              </span>
            )}
          </div>
          <div style={s.priceChip("#0ea5e9")}>
            <span style={s.priceLabel}>USDT / ARS</span>
            <span style={s.priceValue("#0284c7")}>
              {usdtArs > 0 ? "$ " + usdtArs.toLocaleString("es-AR", { maximumFractionDigits: 0 }) : "—"}
            </span>
            <span style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>dólar cripto</span>
          </div>
          <button
            onClick={fetchPrices}
            style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 14, fontWeight: "bold", fontFamily: "inherit", transition: "all 0.2s" }}
            title="Actualizar precios"
          >⟳</button>
        </div>
      </header>

      <div style={s.content}>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <>
            <div style={s.sectionTitle}><span style={{ color: "#3b82f6" }}>◈</span> RESUMEN GLOBAL</div>
            <div style={s.grid4}>
              {[
                { label: "PATRIMONIO ESTIMADO", value: fmtARS(currentValueUSD * usdtArs + totalCocosARS), sub: fmtUSD(currentValueUSD + (totalCocosARS / (usdtArs || 1200))), accent: "#3b82f6" },
                { label: "BTC VALOR ACTUAL", value: fmtUSD(currentValueUSD), sub: fmt(totalBTC, 6) + " ₿", accent: "#f59e0b" },
                { label: "COCOS INVERTIDO", value: fmtARS(totalCocosARS), sub: cocosInvestments.length + " activos", accent: "#0ea5e9" },
                 {
                  label: "P&L HISTÓRICO BTC",
                  value: (isPnlPos ? "+" : "") + fmtUSD(pnlUSD),
                  sub: (isPnlPos ? "▲" : "▼") + " " + fmt(Math.abs(pnlPct), 1) + "%",
                  accent: isPnlPos ? "#16a34a" : "#dc2626"
                },
              ].map((c, i) => (
                <div key={i} style={s.statCard(c.accent)}>
                  <div style={s.statLabel}>{c.label}</div>
                  <div style={s.statValue()}>{c.value}</div>
                  <div style={{...s.statSub, color: c.accent}}>{c.sub}</div>
                </div>
              ))}
            </div>

            <div style={s.sectionTitle}><span style={{ color: "#f59e0b" }}>◈</span> MÉTRICAS BITCOIN</div>
            <div style={s.grid4}>
              {[
                { label: "PRECIO PROMEDIO COMPRA", value: fmtUSD(avgBuyPrice), sub: "weighted avg", accent: "#8b5cf6" },
                { label: "VALOR INVERTIDO BTC", value: fmtUSD(totalUSDInvested), sub: fmtARS(totalARS) + " (histórico)", accent: "#f59e0b" },
                { label: "MÚLTIPLO DE RETORNO", value: currentValueUSD > 0 ? fmt(currentValueUSD / totalUSDInvested, 2) + "x" : "—", sub: "retorno sobre invertido", accent: "#10b981" },
                { label: "USDT / ARS (HOY)", value: usdtArs > 0 ? "$ " + usdtArs.toLocaleString("es-AR", { maximumFractionDigits: 0 }) : "—", sub: "dólar cripto Binance", accent: "#0ea5e9" },
              ].map((c, i) => (
                <div key={i} style={s.statCard(c.accent)}>
                  <div style={s.statLabel}>{c.label}</div>
                  <div style={s.statValue()}>{c.value}</div>
                  <div style={s.statSub}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Mini chart */}
            <div style={s.card}>
              <div style={s.sectionTitle}>
                <span style={{ color: "#f59e0b" }}>◈</span> EVOLUCIÓN DEL PORTAFOLIO BTC (USD)
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={enriched}>
                  <defs>
                    <linearGradient id="gVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={v => "$" + (v/1000).toFixed(0) + "k"} dx={-10} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="currentValueUSD" name="Valor USD" stroke="#ea580c" fill="url(#gVal)" strokeWidth={3} activeDot={{ r: 6, fill: "#ea580c", stroke: "#fff", strokeWidth: 2 }} />
                  <ReferenceLine y={totalUSDInvested} stroke="#3b82f6" strokeDasharray="4 4" label={{ position: "insideTopLeft", value: "Costo Invertido", fill: "#3b82f6", fontSize: 12, fontWeight: 700 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* COMPRAS BTC */}
        {tab === "compras BTC" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={s.sectionTitle}><span style={{ color: "#f59e0b" }}>◈</span> REGISTRO DE COMPRAS BITCOIN</div>
              <button style={s.addBtn} onClick={() => { setEditId(null); setForm({ date: "", arsInvested: 150000, btcPrice: "", usdRate: "" }); setShowModal(true); }}>
                + NUEVA COMPRA BTC
              </button>
            </div>
            <div style={s.card}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["FECHA","ARS INVERTIDO","T/C USD","USD INVERTIDO","PRECIO BTC","BTC COMPRADO","BTC ACUM.","VALOR HOY","P&L",""].map((h,i) => (
                      <th key={i} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {enriched.map((p, i) => {
                    const pnl = p.btcBought * btcPrice - p.usdInvested;
                    const pos = pnl >= 0;
                    return (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "#ffffff" }}>
                        <td style={{ ...s.td, color: "#1e293b", fontWeight: 700 }}>{p.label}</td>
                        <td style={s.td}>{fmtARS(p.arsInvested)}</td>
                        <td style={s.td}>{fmt(p.usdRate, 0)}</td>
                        <td style={{ ...s.td, fontWeight: 700 }}>{fmtUSD(p.usdInvested)}</td>
                        <td style={s.td}>{fmtUSD(p.btcPrice)}</td>
                        <td style={{ ...s.td, color: "#3b82f6", fontWeight: 700 }}>{fmt(p.btcBought, 6)} ₿</td>
                        <td style={{ ...s.td, color: "#8b5cf6", fontWeight: 700 }}>{fmt(p.cumBTC, 6)} ₿</td>
                        <td style={s.td}>{fmtUSD(p.btcBought * btcPrice)}</td>
                        <td style={s.td}><span style={s.badge(pos)}>{pos ? "+" : ""}{fmtUSD(pnl)}</span></td>
                        <td style={s.td}>
                          <button style={{ ...s.iconBtn, color: "#3b82f6" }} onClick={() => startEdit(p)}>✎</button>
                          <button style={{ ...s.iconBtn, color: "#dc2626" }} onClick={() => deletePurchase(p.id)}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* COCOS CAPITAL */}
        {tab === "cocos" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={s.sectionTitle}><span style={{ color: "#0ea5e9" }}>◈</span> PORTAFOLIO COCOS CAPITAL</div>
              <button style={s.addCocosBtn} onClick={() => { setCocosEditId(null); setCocosForm({ date: "", ticker: "", arsInvested: "", priceBought: "" }); setShowCocosModal(true); }}>
                + NUEVA TRANSACCIÓN COCOS
              </button>
            </div>
            
            <div style={s.grid4}>
              <div style={s.statCard("#0ea5e9")}>
                <div style={s.statLabel}>TOTAL INVERTIDO EN COCOS</div>
                <div style={s.statValue()}>{fmtARS(totalCocosARS)}</div>
                <div style={{...s.statSub, color: "#0ea5e9"}}>{cocosInvestments.length} compras en cartera</div>
              </div>
            </div>

            <div style={s.card}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["FECHA","TICKER (ACTIVO)","ARS INVERTIDO","PRECIO COMPRA (ARS)","CANTIDAD APROX.",""].map((h,i) => (
                      <th key={i} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cocosEnriched.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>No hay inversiones en Cocos todavía.</td></tr>
                  )}
                  {cocosEnriched.map((p, i) => (
                    <tr key={p.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "#ffffff" }}>
                      <td style={{ ...s.td, color: "#1e293b", fontWeight: 700 }}>{p.date}</td>
                      <td style={{ ...s.td, color: "#0ea5e9", fontWeight: 800 }}>{p.ticker}</td>
                      <td style={{...s.td, fontWeight: 700}}>{fmtARS(p.arsInvested)}</td>
                      <td style={s.td}>{fmtARS(p.priceBought)}</td>
                      <td style={s.td}>{fmt(p.quantity, 4)} unidades</td>
                      <td style={s.td}>
                        <button style={{ ...s.iconBtn, color: "#3b82f6" }} onClick={() => startCocosEdit(p)}>✎</button>
                        <button style={{ ...s.iconBtn, color: "#dc2626" }} onClick={() => deleteCocosPurchase(p.id)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* GRAFICOS */}
        {tab === "graficos" && (
          <>
            <div style={s.grid2}>
              <div style={s.card}>
                <div style={s.sectionTitle}><span style={{ color: "#f59e0b" }}>◈</span> BTC ACUMULADO</div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={enriched}>
                    <defs>
                      <linearGradient id="gBTC" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="cumBTC" name="BTC Acum." stroke="#ea580c" fill="url(#gBTC)" strokeWidth={3} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={s.card}>
                <div style={s.sectionTitle}><span style={{ color: "#8b5cf6" }}>◈</span> PRECIO PROMEDIO DE COMPRA</div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={enriched}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={v => "$" + (v/1000).toFixed(0) + "k"} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="avgPrice" name="Avg Price" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: "#8b5cf6", r: 4, stroke: "#fff", strokeWidth: 2 }} />
                    <ReferenceLine y={btcPrice} stroke="#f59e0b" strokeDasharray="4 4" label={{ position: "insideBottomLeft", value: "Actual", fill: "#f59e0b", fontSize: 11, fontWeight: 700 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={s.grid2}>
              <div style={s.card}>
                <div style={s.sectionTitle}><span style={{ color: "#10b981" }}>◈</span> P&L POR COMPRA (USD)</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={enriched.map(p => ({ ...p, pnlBuy: p.btcBought * btcPrice - p.usdInvested }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#cbd5e1" />
                    <Bar dataKey="pnlBuy" name="P&L USD" fill="#10b981" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={s.card}>
                <div style={s.sectionTitle}><span style={{ color: "#3b82f6" }}>◈</span> BTC COMPRADO POR MES</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={enriched}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="btcBought" name="BTC Comprado" fill="#3b82f6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL BTC */}
      {showModal && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={s.modalBox}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", marginBottom: 24, letterSpacing: 1 }}>
              {editId ? "✎ EDITAR COMPRA BTC" : "+ REGISTRAR COMPRA BTC"}
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              {[
                { label: "FECHA", key: "date", type: "date" },
                { label: "ARS INVERTIDO", key: "arsInvested", type: "number" },
                { label: "PRECIO BTC (USD)", key: "btcPrice", type: "number", placeholder: "ej: 67000" },
                { label: "TIPO DE CAMBIO ARS/USD", key: "usdRate", type: "number", placeholder: "ej: 1200" },
              ].map(f => (
                <div key={f.key}>
                  <label style={s.label}>{f.label}</label>
                  <input
                    style={s.input}
                    type={f.type}
                    placeholder={f.placeholder || ""}
                    value={form[f.key]}
                    onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              {form.btcPrice && form.usdRate && form.arsInvested && (
                <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: "12px 14px", fontSize: 12, marginTop: 4 }}>
                  <span style={{ color: "#78350f" }}>BTC que comprarías: </span>
                  <strong style={{ color: "#d97706", fontSize: 14 }}>
                    {fmt((Number(form.arsInvested) / Number(form.usdRate)) / Number(form.btcPrice), 8)} ₿
                  </strong>
                </div>
              )}
            </div>
            <button style={s.saveBtn} onClick={saveForm}>GUARDAR TRANSACCIÓN</button>
            <button style={s.cancelBtn} onClick={() => setShowModal(false)}>CANCELAR</button>
          </div>
        </div>
      )}

      {/* MODAL COCOS */}
      {showCocosModal && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowCocosModal(false)}>
          <div style={s.modalBox}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", marginBottom: 24, letterSpacing: 1 }}>
              {cocosEditId ? "✎ EDITAR TRANSACCIÓN COCOS" : "+ REGISTRAR EN COCOS"}
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              {[
                { label: "FECHA", key: "date", type: "date" },
                { label: "ACTIVO (TICKER)", key: "ticker", type: "text", placeholder: "ej: AL30, YPFD, SPY" },
                { label: "ARS INVERTIDO", key: "arsInvested", type: "number", placeholder: "ej: 100000" },
                { label: "PRECIO DE COMPRA (ARS)", key: "priceBought", type: "number", placeholder: "ej: 35000" },
              ].map(f => (
                <div key={f.key}>
                  <label style={s.label}>{f.label}</label>
                  <input
                    style={s.input}
                    type={f.type}
                    placeholder={f.placeholder || ""}
                    value={cocosForm[f.key]}
                    onChange={e => setCocosForm(v => ({ ...v, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              {cocosForm.arsInvested && cocosForm.priceBought && (
                <div style={{ background: "#e0f2fe", border: "1px solid #bae6fd", borderRadius: 8, padding: "12px 14px", fontSize: 12, marginTop: 4 }}>
                  <span style={{ color: "#0369a1" }}>Cantidad aproximada del activo: </span>
                  <strong style={{ color: "#0284c7", fontSize: 14 }}>
                    {fmt(Number(cocosForm.arsInvested) / Number(cocosForm.priceBought), 4)} unidades
                  </strong>
                </div>
              )}
            </div>
            <button style={{...s.saveBtn, background: "linear-gradient(135deg, #0ea5e9, #2563eb)", boxShadow: "0 4px 6px rgba(37,99,235,0.2)"}} onClick={saveCocosForm}>GUARDAR EN COCOS</button>
            <button style={s.cancelBtn} onClick={() => setShowCocosModal(false)}>CANCELAR</button>
          </div>
        </div>
      )}
    </div>
  );
}
