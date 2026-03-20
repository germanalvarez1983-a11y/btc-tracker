import { useState, useMemo, useEffect, useRef } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const initialData = [];
const initialCocos = [];

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
      background: "rgba(255,255,255,0.95)", border: "1px solid #ece9ea",
      borderRadius: 8, padding: "10px 14px", fontSize: 12,
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
    }}>
      <div style={{ color: "#3b3235", fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "#3b3235" }}>
          {p.name}: <strong>{typeof p.value === "number" ? fmt(p.value) : p.value}</strong>
        </div>
      ))}
    
      {/* MODAL COLD WALLET */}
      {editColdTicker && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setEditColdTicker(null)}>
          <div style={s.modalBox} className="modal-box">
            <div style={{ fontSize: 16, fontWeight: 800, color: "#4a4144", marginBottom: 24, letterSpacing: 1 }}>
              ✎ ACTUALIZAR SALDO DE {editColdTicker}
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <label style={s.label}>INGRESA TU BALANCE MANUAL EXACTO (CANTIDAD DE MONEDAS)</label>
                <input
                  style={s.input}
                  type="number"
                  placeholder={`Ej: ${editColdTicker === "BTC" ? "0.15" : "120"}`}
                  value={editColdAmount}
                  onChange={e => setEditColdAmount(e.target.value)}
                />
              </div>
            </div>
            <button style={{...s.saveBtn, background: "linear-gradient(135deg, #c0aab5, #968f92)", boxShadow: "0 4px 6px rgba(192, 170, 181, 0.2)"}} onClick={() => {
              setColdWallet(prev => ({ ...prev, [editColdTicker]: Number(editColdAmount) }));
              setEditColdTicker(null);
            }}>
              GUARDAR BALANCE
            </button>
            <button style={s.cancelBtn} onClick={() => setEditColdTicker(null)}>CANCELAR</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default function BTCTracker() {
  const [purchases, setPurchases] = useState(() => {
    const saved = localStorage.getItem("btc-tracker-purchases");
    return saved ? JSON.parse(saved) : initialData;
  });
  const [coldWallet, setColdWallet] = useState(() => {
    const saved = localStorage.getItem("btc-tracker-coldwallet");
    return saved ? JSON.parse(saved) : { BTC: 0, ETH: 0, XRP: 0, AVAX: 0, BNB: 0 };
  });
  useEffect(() => {
    localStorage.setItem("btc-tracker-coldwallet", JSON.stringify(coldWallet));
  }, [coldWallet]);
  const [cryptoData, setCryptoData] = useState({
    BTC: { price: 0, change: 0 },
    ETH: { price: 0, change: 0 },
    XRP: { price: 0, change: 0 },
    AVAX: { price: 0, change: 0 },
    BNB: { price: 0, change: 0 }
  });
  const [editColdTicker, setEditColdTicker] = useState(null);
  const [editColdAmount, setEditColdAmount] = useState("");

  const [cocosInvestments, setCocosInvestments] = useState(() => {
    const saved = localStorage.getItem("btc-tracker-cocos");
    return saved ? JSON.parse(saved) : initialCocos;
  });

  useEffect(() => {
    localStorage.setItem("btc-tracker-purchases", JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem("btc-tracker-cocos", JSON.stringify(cocosInvestments));
  }, [cocosInvestments]);
  const [tab, setTab] = useState("dashboard");
  const [showModal, setShowModal] = useState(false);
  const [showCocosModal, setShowCocosModal] = useState(false);
  const [btcPrice, setBtcPrice] = useState(BTC_CURRENT_PRICE);
  const [usdtArs, setUsdtArs] = useState(0);
  const [btcChange24h, setBtcChange24h] = useState(0);
  const [dolarOficial, setDolarOficial] = useState(0);
  const [dolarBlue, setDolarBlue] = useState(0);
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
      
      const symbols = ["BTCUSDT", "ETHUSDT", "XRPUSDT", "AVAXUSDT", "BNBUSDT", "USDTARS"];
      const reqs = symbols.map(s => fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${s}`).then(r => r.json()).catch(()=>null));
      const [btcData, ethData, xrpData, avaxData, bnbData, usdtData, dolarRes] = await Promise.all([
        ...reqs,
        fetch("https://dolarapi.com/v1/dolares").catch(() => null),
      ]);
      if(btcData) {
        setBtcPrice(parseFloat(btcData.lastPrice));
        setBtcChange24h(parseFloat(btcData.priceChangePercent));
      }
      if(usdtData) setUsdtArs(parseFloat(usdtData.lastPrice));
      
      setCryptoData({
        BTC: { price: btcData ? parseFloat(btcData.lastPrice) : 0, change: btcData ? parseFloat(btcData.priceChangePercent) : 0 },
        ETH: { price: ethData ? parseFloat(ethData.lastPrice) : 0, change: ethData ? parseFloat(ethData.priceChangePercent) : 0 },
        XRP: { price: xrpData ? parseFloat(xrpData.lastPrice) : 0, change: xrpData ? parseFloat(xrpData.priceChangePercent) : 0 },
        AVAX: { price: avaxData ? parseFloat(avaxData.lastPrice) : 0, change: avaxData ? parseFloat(avaxData.priceChangePercent) : 0 },
        BNB: { price: bnbData ? parseFloat(bnbData.lastPrice) : 0, change: bnbData ? parseFloat(bnbData.priceChangePercent) : 0 },
      });

      if (dolarRes && dolarRes.ok) {
        const dData = await dolarRes.json();
        const oficial = dData.find((d) => d.casa === "oficial");
        const blue = dData.find((d) => d.casa === "blue");
        if (oficial) setDolarOficial(oficial.venta);
        if (blue) setDolarBlue(blue.venta);
      }
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
  const totalColdWalletUSD = Object.keys(coldWallet).reduce((sum, ticker) => sum + (coldWallet[ticker] * cryptoData[ticker].price), 0);

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

  // UPDATED DESIGN WITH MOBILE RESPONSIVENESS
  const s = {
    app: {
      minHeight: "100vh", background: "#fcfbfb",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: "#3b3235",
    },
    header: {
      borderBottom: "1px solid #ece9ea",
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
      background: "linear-gradient(135deg, #dfb2c4, #c98298)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 18, fontWeight: 900, color: "#fff"
    },
    logoText: { fontSize: 16, fontWeight: 800, letterSpacing: 1.5, color: "#4a4144" },
    nav: { display: "flex", gap: 8 },
    navBtn: (active) => ({
      padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
      fontSize: 12, fontWeight: 700, letterSpacing: 1,
      fontFamily: "inherit",
      background: active ? "#fff" : "transparent",
      color: active ? "#c98298" : "#968f92",
      boxShadow: active ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
      transition: "all 0.2s",
    }),
    priceBar: {
      display: "flex", alignItems: "center", gap: 6, paddingRight: 4,
    },
    priceChip: (color) => ({
      display: "flex", flexDirection: "column", alignItems: "flex-end",
      background: "#fff", border: `1px solid #ece9ea`,
      borderRadius: 6, padding: "4px 8px", minWidth: 70,
    }),
    priceLabel: { fontSize: 9, color: "#968f92", letterSpacing: 0.5, fontWeight: 700 },
    priceValue: (color) => ({ fontSize: 13, fontWeight: 800, color, lineHeight: 1.2 }),
    priceSub: (pos) => ({ fontSize: 10, color: pos ? "#9fb5a6" : "#d99494", fontWeight: 600 }),
    statusDot: (status) => ({
      width: 7, height: 7, borderRadius: "50%",
      background: status === "live" ? "#9fb5a6" : status === "loading" ? "#dfb2c4" : "#d99494",
      boxShadow: status === "live" ? "0 0 6px #9fb5a6" : "none",
      animation: status === "loading" ? "pulse 1s infinite" : "none",
      display: "inline-block",
    }),
    content: { padding: "32px", maxWidth: 1400, margin: "0 auto" },
    grid4: {
      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24,
    },
    grid2: {
      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24,
    },
    card: {
      background: "#fff", border: "1px solid #ece9ea",
      borderRadius: 16, padding: "24px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
    },
    statCard: (accent = "#dfb2c4") => ({
      background: "#fff",
      border: `1px solid #ece9ea`,
      borderLeft: `4px solid ${accent}`,
      borderRadius: 12, padding: "20px 24px",
      position: "relative", overflow: "hidden",
      boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
    }),
    statLabel: { fontSize: 11, color: "#968f92", letterSpacing: 1, marginBottom: 6, fontWeight: 700 },
    statValue: (accent = "#dfb2c4") => ({
      fontSize: 24, fontWeight: 800, color: "#3b3235", lineHeight: 1,
    }),
    statSub: { fontSize: 12, color: "#968f92", marginTop: 6, fontWeight: 500 },
    sectionTitle: {
      fontSize: 14, fontWeight: 800, letterSpacing: 1, color: "#4a4144",
      marginBottom: 20, display: "flex", alignItems: "center", gap: 8,
    },
    addBtn: {
      background: "linear-gradient(135deg, #dfb2c4, #c98298)",
      border: "none", color: "#fff", padding: "10px 20px",
      borderRadius: 8, cursor: "pointer", fontWeight: 700,
      fontSize: 12, letterSpacing: 1, fontFamily: "inherit",
      boxShadow: "0 4px 6px rgba(201, 130, 152, 0.2)",
      whiteSpace: "nowrap"
    },
    addCocosBtn: {
      background: "linear-gradient(135deg, #a8b6c4, #89858f)",
      border: "none", color: "#fff", padding: "10px 20px",
      borderRadius: 8, cursor: "pointer", fontWeight: 700,
      fontSize: 12, letterSpacing: 1, fontFamily: "inherit",
      boxShadow: "0 4px 6px rgba(137, 133, 143, 0.2)",
      whiteSpace: "nowrap"
    },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 600 },
    th: {
      textAlign: "left", padding: "12px 14px",
      fontSize: 11, color: "#968f92", letterSpacing: 1, fontWeight: 700,
      borderBottom: "2px solid #ece9ea",
      textTransform: "uppercase"
    },
    td: {
      padding: "14px", fontSize: 13, fontWeight: 500, color: "#595053",
      borderBottom: "1px solid #faf8f9",
    },
    badge: (pos) => ({
      display: "inline-block", padding: "4px 10px", borderRadius: 6,
      fontSize: 11, fontWeight: 800,
      background: pos ? "#eef5f0" : "#fae1e1",
      color: pos ? "#9fb5a6" : "#d99494",
    }),
    modal: {
      position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, backdropFilter: "blur(4px)",
      padding: 16,
    },
    modalBox: {
      background: "#fff", border: "1px solid #ece9ea",
      borderRadius: 16, padding: "32px", width: "100%", maxWidth: 450,
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
      maxHeight: "90vh", overflowY: "auto",
    },
    input: {
      width: "100%", background: "#fcfbfb", border: "1px solid #dbd6d8",
      color: "#3b3235", padding: "12px 14px", borderRadius: 8,
      fontFamily: "inherit", fontSize: 14, boxSizing: "border-box", fontWeight: 500,
      transition: "border 0.2s",
      outline: "none",
    },
    label: { fontSize: 11, color: "#787073", letterSpacing: 1, marginBottom: 6, display: "block", fontWeight: 700 },
    saveBtn: {
      background: "linear-gradient(135deg, #9fb5a6, #889e8f)",
      border: "none", color: "#fff", padding: "14px 0",
      borderRadius: 8, cursor: "pointer", fontWeight: 800,
      fontSize: 13, letterSpacing: 1, fontFamily: "inherit",
      width: "100%", marginTop: 12,
      boxShadow: "0 4px 6px rgba(159, 181, 166, 0.2)",
    },
    cancelBtn: {
      background: "transparent", border: "1px solid #dbd6d8",
      color: "#968f92", padding: "14px 0", borderRadius: 8,
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
        input:focus { border-color: #a29ea8 !important; box-shadow: 0 0 0 3px rgba(223, 178, 196, 0.2); }
        
        /* RESPONSIVE QUERIES */
        @media (max-width: 768px) {
          .app-header { flex-direction: column !important; padding: 16px !important; gap: 16px !important; }
          .app-nav { width: 100% !important; justify-content: center !important; flex-wrap: wrap !important; }
          .price-bar { width: 100% !important; justify-content: center !important; flex-wrap: wrap !important; padding-bottom: 8px; gap: 6px !important; }
          .app-content { padding: 16px !important; }
          .grid-4, .grid-2 { grid-template-columns: 1fr !important; }
          .title-bar { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .title-bar button { width: 100% !important; }
          .table-wrapper { overflow-x: auto !important; width: 100% !important; -webkit-overflow-scrolling: touch; }
          .modal-box { padding: 20px !important; }
          .stat-card { padding: 16px !important; }
        }
      `}</style>
      
      {/* HEADER */}
      <header style={s.header} className="app-header">
        <div style={s.logo}>
          <div style={s.logoIcon}>₿</div>
          <span style={s.logoText}>PORTFOLIO GERMAN</span>
        </div>
        <nav style={s.nav} className="app-nav">
          {["dashboard","compras BTC","cocos", "wallet fria", "graficos"].map(t => (
            <button key={t} style={s.navBtn(tab === t)} onClick={() => setTab(t)}>
              {t.toUpperCase()}
            </button>
          ))}
        </nav>
        <div style={s.priceBar} className="price-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: "max-content" }}>
            <span style={s.statusDot(priceStatus)} title={lastUpdated ? "Última act: " + lastUpdated.toLocaleTimeString("es-AR") : ""} />
            {priceStatus !== "live" && (
              <span style={{ fontSize: 9, color: "#968f92", letterSpacing: 0.5, fontWeight: 600 }}>
                {priceStatus === "loading" ? "ACT." : "ERROR"}
              </span>
            )}
          </div>
          <div style={{...s.priceChip("#dfb2c4"), minWidth: "max-content"}}>
            <span style={s.priceLabel}>BTC</span>
            <span style={s.priceValue("#c98298")}>
              {btcPrice > 0 ? "$" + btcPrice.toLocaleString("es-AR", { maximumFractionDigits: 0 }) : "—"}
            </span>
          </div>
          <div style={{...s.priceChip("#a8b6c4"), minWidth: "max-content"}}>
            <span style={s.priceLabel}>USDT (Crypto)</span>
            <span style={s.priceValue("#8f9fb0")}>
              {usdtArs > 0 ? "$" + usdtArs.toLocaleString("es-AR", { maximumFractionDigits: 0 }) : "—"}
            </span>
          </div>
          <div style={{...s.priceChip("#9fb5a6"), minWidth: "max-content"}}>
            <span style={s.priceLabel}>USD Blue</span>
            <span style={s.priceValue("#889e8f")}>
              {dolarBlue > 0 ? "$" + dolarBlue.toLocaleString("es-AR", { maximumFractionDigits: 0 }) : "—"}
            </span>
          </div>
          <div style={{...s.priceChip("#968f92"), minWidth: "max-content"}}>
            <span style={s.priceLabel}>USD Oficial</span>
            <span style={s.priceValue("#787073")}>
              {dolarOficial > 0 ? "$" + dolarOficial.toLocaleString("es-AR", { maximumFractionDigits: 0 }) : "—"}
            </span>
          </div>
          
        </div>
      </header>

      <div style={s.content} className="app-content">

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <>
            <div style={s.sectionTitle}><span style={{ color: "#a29ea8" }}>◈</span> RESUMEN GLOBAL</div>
            <div style={s.grid4} className="grid-4">
              {[
                { label: "PATRIMONIO ESTIMADO", value: fmtARS((currentValueUSD + totalColdWalletUSD) * usdtArs + totalCocosARS), sub: fmtUSD(currentValueUSD + totalColdWalletUSD + (totalCocosARS / (usdtArs || 1200))), accent: "#a29ea8" },
                { label: "WALLET FRIA GLOBAL", value: fmtUSD(totalColdWalletUSD), sub: "BTCB, ETH, XRP, AVAX, BNB", accent: "#c0aab5" },
                { label: "BTC VALOR ACTUAL (COMPRAS)", value: fmtUSD(currentValueUSD), sub: fmt(totalBTC, 6) + " ₿", accent: "#dfb2c4" },
                { label: "COCOS INVERTIDO", value: fmtARS(totalCocosARS), sub: cocosInvestments.length + " activos", accent: "#a8b6c4" },
                 {
                  label: "P&L HISTÓRICO BTC",
                  value: (isPnlPos ? "+" : "") + fmtUSD(pnlUSD),
                  sub: (isPnlPos ? "▲" : "▼") + " " + fmt(Math.abs(pnlPct), 1) + "%",
                  accent: isPnlPos ? "#9fb5a6" : "#d99494"
                },
              ].map((c, i) => (
                <div key={i} style={s.statCard(c.accent)} className="stat-card">
                  <div style={s.statLabel}>{c.label}</div>
                  <div style={s.statValue()}>{c.value}</div>
                  <div style={{...s.statSub, color: c.accent}}>{c.sub}</div>
                </div>
              ))}
            </div>

            <div style={s.sectionTitle}><span style={{ color: "#dfb2c4" }}>◈</span> MÉTRICAS BITCOIN</div>
            <div style={s.grid4} className="grid-4">
              {[
                { label: "PRECIO PROMEDIO COMPRA", value: fmtUSD(avgBuyPrice), sub: "weighted avg", accent: "#c0aab5" },
                { label: "VALOR INVERTIDO BTC", value: fmtUSD(totalUSDInvested), sub: fmtARS(totalARS) + " (histórico)", accent: "#dfb2c4" },
                { label: "MÚLTIPLO DE RETORNO", value: currentValueUSD > 0 ? fmt(currentValueUSD / totalUSDInvested, 2) + "x" : "—", sub: "retorno sobre invertido", accent: "#a0bfa9" },
                { label: "USDT / ARS (HOY)", value: usdtArs > 0 ? "$ " + usdtArs.toLocaleString("es-AR", { maximumFractionDigits: 0 }) : "—", sub: "dólar cripto Binance", accent: "#a8b6c4" },
              ].map((c, i) => (
                <div key={i} style={s.statCard(c.accent)} className="stat-card">
                  <div style={s.statLabel}>{c.label}</div>
                  <div style={s.statValue()}>{c.value}</div>
                  <div style={s.statSub}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Mini chart */}
            <div style={{...s.card, padding: "20px 10px 10px 10px"}}>
              <div style={{...s.sectionTitle, paddingLeft: 10}}>
                <span style={{ color: "#dfb2c4" }}>◈</span> EVOLUCIÓN DEL PORTAFOLIO BTC (USD)
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={enriched}>
                  <defs>
                    <linearGradient id="gVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dfb2c4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#dfb2c4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ece9ea" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#968f92", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} minTickGap={20} />
                  <YAxis tick={{ fill: "#968f92", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={v => "$" + (v/1000).toFixed(0) + "k"} dx={-10} width={45} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="currentValueUSD" name="Valor USD" stroke="#c98298" fill="url(#gVal)" strokeWidth={3} activeDot={{ r: 6, fill: "#c98298", stroke: "#fff", strokeWidth: 2 }} />
                  <ReferenceLine y={totalUSDInvested} stroke="#a29ea8" strokeDasharray="4 4" label={{ position: "insideTopLeft", value: "Costo Invertido", fill: "#a29ea8", fontSize: 11, fontWeight: 700 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* COMPRAS BTC */}
        {tab === "compras BTC" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }} className="title-bar">
              <div style={{...s.sectionTitle, marginBottom: 0}}><span style={{ color: "#dfb2c4" }}>◈</span> REGISTRO DE COMPRAS BITCOIN</div>
              <button style={s.addBtn} onClick={() => { setEditId(null); setForm({ date: "", arsInvested: 150000, btcPrice: "", usdRate: "" }); setShowModal(true); }}>
                + NUEVA COMPRA BTC
              </button>
            </div>
            <div style={{...s.card, padding: 0, overflow: "hidden"}}>
              <div className="table-wrapper">
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
                        <tr key={p.id} style={{ background: i % 2 === 0 ? "#fcfbfb" : "#ffffff" }}>
                          <td style={{ ...s.td, color: "#4a4144", fontWeight: 700 }}>{p.label}</td>
                          <td style={s.td}>{fmtARS(p.arsInvested)}</td>
                          <td style={s.td}>{fmt(p.usdRate, 0)}</td>
                          <td style={{ ...s.td, fontWeight: 700 }}>{fmtUSD(p.usdInvested)}</td>
                          <td style={s.td}>{fmtUSD(p.btcPrice)}</td>
                          <td style={{ ...s.td, color: "#a29ea8", fontWeight: 700 }}>{fmt(p.btcBought, 6)} ₿</td>
                          <td style={{ ...s.td, color: "#c0aab5", fontWeight: 700 }}>{fmt(p.cumBTC, 6)} ₿</td>
                          <td style={s.td}>{fmtUSD(p.btcBought * btcPrice)}</td>
                          <td style={s.td}><span style={s.badge(pos)}>{pos ? "+" : ""}{fmtUSD(pnl)}</span></td>
                          <td style={s.td}>
                            <button style={{ ...s.iconBtn, color: "#a29ea8" }} onClick={() => startEdit(p)}>✎</button>
                            <button style={{ ...s.iconBtn, color: "#d99494" }} onClick={() => deletePurchase(p.id)}>✕</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* COCOS CAPITAL */}
        {tab === "cocos" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }} className="title-bar">
              <div style={{...s.sectionTitle, marginBottom: 0}}><span style={{ color: "#a8b6c4" }}>◈</span> PORTAFOLIO COCOS CAPITAL</div>
              <button style={s.addCocosBtn} onClick={() => { setCocosEditId(null); setCocosForm({ date: "", ticker: "", arsInvested: "", priceBought: "" }); setShowCocosModal(true); }}>
                + NUEVA TRANSACCIÓN COCOS
              </button>
            </div>
            
            <div style={s.grid4} className="grid-4">
              <div style={s.statCard("#a8b6c4")} className="stat-card">
                <div style={s.statLabel}>TOTAL INVERTIDO EN COCOS</div>
                <div style={s.statValue()}>{fmtARS(totalCocosARS)}</div>
                <div style={{...s.statSub, color: "#a8b6c4"}}>{cocosInvestments.length} compras en cartera</div>
              </div>
            </div>

            <div style={{...s.card, padding: 0, overflow: "hidden"}}>
              <div className="table-wrapper">
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["FECHA","TICKER (ACTIVO)","ARS INVERTIDO","PRECIO COMPRA","CANTIDAD APROX.",""].map((h,i) => (
                        <th key={i} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cocosEnriched.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: "center", padding: 30, color: "#b8b1b3" }}>No hay inversiones en Cocos todavía.</td></tr>
                    )}
                    {cocosEnriched.map((p, i) => (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? "#fcfbfb" : "#ffffff" }}>
                        <td style={{ ...s.td, color: "#4a4144", fontWeight: 700 }}>{p.date}</td>
                        <td style={{ ...s.td, color: "#a8b6c4", fontWeight: 800 }}>{p.ticker}</td>
                        <td style={{...s.td, fontWeight: 700}}>{fmtARS(p.arsInvested)}</td>
                        <td style={s.td}>{fmtARS(p.priceBought)}</td>
                        <td style={s.td}>{fmt(p.quantity, 4)} unidades</td>
                        <td style={s.td}>
                          <button style={{ ...s.iconBtn, color: "#a29ea8" }} onClick={() => startCocosEdit(p)}>✎</button>
                          <button style={{ ...s.iconBtn, color: "#d99494" }} onClick={() => deleteCocosPurchase(p.id)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        
        {/* WALLET FRIA */}
        {tab === "wallet fria" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }} className="title-bar">
              <div style={{...s.sectionTitle, marginBottom: 0}}><span style={{ color: "#c0aab5" }}>◈</span> WALLET FRÍA (HOLD SÓLIDO)</div>
            </div>
            
            <div style={s.grid4} className="grid-4">
              <div style={s.statCard("#c0aab5")} className="stat-card">
                <div style={s.statLabel}>PATRIMONIO TOTAL WALLET</div>
                <div style={s.statValue()}>{fmtUSD(totalColdWalletUSD)}</div>
                <div style={{...s.statSub, color: "#c0aab5"}}>Monitoreo en tiempo real</div>
              </div>
            </div>

            <div style={s.grid2} className="grid-2">
              {["BTC", "ETH", "BNB", "AVAX", "XRP"].map(ticker => {
                const bal = coldWallet[ticker];
                const price = cryptoData[ticker].price;
                const change = cryptoData[ticker].change;
                const isPos = change >= 0;
                
                return (
                  <div key={ticker} style={{...s.card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px"}}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#4a4144", display: "flex", alignItems: "center", gap: 8 }}>
                        {ticker} 
                        <span style={s.badge(isPos)}>{isPos ? "+" : ""}{fmt(change, 2)}%</span>
                      </div>
                      <div style={{ fontSize: 14, color: "#787073", marginTop: 4, fontWeight: 600 }}>1 {ticker} = {fmtUSD(price)}</div>
                      <div style={{ fontSize: 12, color: "#a29ea8", marginTop: 10, fontWeight: 700 }}>BALANCE ACTUAL</div>
                      <div style={{ fontSize: 20, color: "#3b3235", fontWeight: 800, marginTop: 2 }}>{fmt(bal, ticker === "XRP" ? 2 : 6)} {ticker}</div>
                      <div style={{ fontSize: 15, color: "#9fb5a6", fontWeight: 800, marginTop: 2 }}>={fmtUSD(bal * price)}</div>
                    </div>
                    <div>
                      <button 
                        style={{...s.addCocosBtn, background: "linear-gradient(135deg, #a29ea8, #787073)", boxShadow: "0 4px 6px rgba(150, 143, 146, 0.2)"}}
                        onClick={() => { setEditColdTicker(ticker); setEditColdAmount(bal); }}
                      >
                        ACTUALIZAR SALDO
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* GRAFICOS */}
        {tab === "graficos" && (
          <>
            <div style={s.grid2} className="grid-2">
              <div style={{...s.card, padding: "20px 10px 10px 10px"}}>
                <div style={{...s.sectionTitle, paddingLeft: 10}}><span style={{ color: "#dfb2c4" }}>◈</span> BTC ACUMULADO</div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={enriched}>
                    <defs>
                      <linearGradient id="gBTC" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dfb2c4" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#dfb2c4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece9ea" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#968f92", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} minTickGap={20} />
                    <YAxis tick={{ fill: "#968f92", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="cumBTC" name="BTC Acum." stroke="#c98298" fill="url(#gBTC)" strokeWidth={3} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{...s.card, padding: "20px 10px 10px 10px"}}>
                <div style={{...s.sectionTitle, paddingLeft: 10}}><span style={{ color: "#c0aab5" }}>◈</span> PRECIO PROMEDIO DE COMPRA</div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={enriched}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece9ea" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#968f92", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} minTickGap={20} />
                    <YAxis tick={{ fill: "#968f92", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={v => "$" + (v/1000).toFixed(0) + "k"} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="avgPrice" name="Avg Price" stroke="#c0aab5" strokeWidth={3} dot={{ fill: "#c0aab5", r: 4, stroke: "#fff", strokeWidth: 2 }} />
                    <ReferenceLine y={btcPrice} stroke="#dfb2c4" strokeDasharray="4 4" label={{ position: "insideBottomLeft", value: "Actual", fill: "#dfb2c4", fontSize: 11, fontWeight: 700 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={s.grid2} className="grid-2">
              <div style={{...s.card, padding: "20px 10px 10px 10px"}}>
                <div style={{...s.sectionTitle, paddingLeft: 10}}><span style={{ color: "#a0bfa9" }}>◈</span> P&L POR COMPRA (USD)</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={enriched.map(p => ({ ...p, pnlBuy: p.btcBought * btcPrice - p.usdInvested }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece9ea" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#968f92", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} minTickGap={20} />
                    <YAxis tick={{ fill: "#968f92", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#dbd6d8" />
                    <Bar dataKey="pnlBuy" name="P&L USD" fill="#a0bfa9" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{...s.card, padding: "20px 10px 10px 10px"}}>
                <div style={{...s.sectionTitle, paddingLeft: 10}}><span style={{ color: "#a29ea8" }}>◈</span> BTC COMPRADO POR MES</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={enriched}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ece9ea" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#968f92", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} minTickGap={20} />
                    <YAxis tick={{ fill: "#968f92", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="btcBought" name="BTC Comprado" fill="#a29ea8" radius={[4,4,0,0]} />
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
          <div style={s.modalBox} className="modal-box">
            <div style={{ fontSize: 16, fontWeight: 800, color: "#4a4144", marginBottom: 24, letterSpacing: 1 }}>
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
                <div style={{ background: "#f7ebee", border: "1px solid #f2d5df", borderRadius: 8, padding: "12px 14px", fontSize: 12, marginTop: 4 }}>
                  <span style={{ color: "#5e4d52" }}>BTC que comprarías: </span>
                  <strong style={{ color: "#b07084", fontSize: 14 }}>
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
          <div style={s.modalBox} className="modal-box">
            <div style={{ fontSize: 16, fontWeight: 800, color: "#4a4144", marginBottom: 24, letterSpacing: 1 }}>
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
                <div style={{ background: "#f2f0f2", border: "1px solid #e1dfe3", borderRadius: 8, padding: "12px 14px", fontSize: 12, marginTop: 4 }}>
                  <span style={{ color: "#68646b" }}>Cantidad aproximada del activo: </span>
                  <strong style={{ color: "#8f9fb0", fontSize: 14 }}>
                    {fmt(Number(cocosForm.arsInvested) / Number(cocosForm.priceBought), 4)} unidades
                  </strong>
                </div>
              )}
            </div>
            <button style={{...s.saveBtn, background: "linear-gradient(135deg, #a8b6c4, #89858f)", boxShadow: "0 4px 6px rgba(137, 133, 143, 0.2)"}} onClick={saveCocosForm}>GUARDAR EN COCOS</button>
            <button style={s.cancelBtn} onClick={() => setShowCocosModal(false)}>CANCELAR</button>
          </div>
        </div>
      )}
    </div>
  );
}
