const fs = require('fs');
let text = fs.readFileSync('src/App.jsx', 'utf-8');

// 1. Storage & State
const stateInjection = `  const [coldWallet, setColdWallet] = useState(() => {
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
`;
text = text.replace('  const [cocosInvestments', stateInjection + '\n  const [cocosInvestments');

// 2. Fetch Prices
const fetchReplacement = `
      const symbols = ["BTCUSDT", "ETHUSDT", "XRPUSDT", "AVAXUSDT", "BNBUSDT", "USDTARS"];
      const reqs = symbols.map(s => fetch(\`https://api.binance.com/api/v3/ticker/24hr?symbol=\${s}\`).then(r => r.json()).catch(()=>null));
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
`;
const fetchRegex = /const \[btcRes, usdtRes, dolarRes\][\s\S]*?setUsdtArs\(parseFloat\(usdtData.lastPrice\)\);/m;
text = text.replace(fetchRegex, fetchReplacement);

// 3. Totals computing
text = text.replace(
  'const totalCocosARS = cocosInvestments.reduce((s, c) => s + Number(c.arsInvested), 0);',
  'const totalCocosARS = cocosInvestments.reduce((s, c) => s + Number(c.arsInvested), 0);\n  const totalColdWalletUSD = Object.keys(coldWallet).reduce((sum, ticker) => sum + (coldWallet[ticker] * cryptoData[ticker].price), 0);'
);

// 4. Update Dashboard totals (Patrimonio Estimado includes totalColdWalletUSD)
text = text.replace(
  '{ label: "PATRIMONIO ESTIMADO", value: fmtARS(currentValueUSD * usdtArs + totalCocosARS), sub: fmtUSD(currentValueUSD + (totalCocosARS / (usdtArs || 1200))), accent: "#a29ea8" }',
  '{ label: "PATRIMONIO ESTIMADO", value: fmtARS((currentValueUSD + totalColdWalletUSD) * usdtArs + totalCocosARS), sub: fmtUSD(currentValueUSD + totalColdWalletUSD + (totalCocosARS / (usdtArs || 1200))), accent: "#a29ea8" }'
);
// Also dashboard should maybe show Cold Wallet value separately instead of multiple of return? User didn't ask to remove anything, I'll sneak it into "Resumen Global".
text = text.replace(
  '{ label: "BTC VALOR ACTUAL", value: fmtUSD(currentValueUSD)',
  '{ label: "WALLET FRIA GLOBAL", value: fmtUSD(totalColdWalletUSD), sub: "BTCB, ETH, XRP, AVAX, BNB", accent: "#c0aab5" },\n                { label: "BTC VALOR ACTUAL (COMPRAS)", value: fmtUSD(currentValueUSD)'
);

// 5. Nav bar
text = text.replace('["dashboard","compras BTC","cocos", "graficos"]', '["dashboard","compras BTC","cocos", "wallet fria", "graficos"]');


// 6. Injection of Tab Content and Modal
const tabContent = `
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
`;

const modalContent = `
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
                  placeholder={\`Ej: \${editColdTicker === "BTC" ? "0.15" : "120"}\`}
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
`;

text = text.replace('{/* GRAFICOS */}', tabContent + '\n        {/* GRAFICOS */}');
text = text.replace('</div>\n  );\n}', modalContent + '\n    </div>\n  );\n}');


fs.writeFileSync('src/App.jsx', text);
console.log('Cold wallet injected successfully!');
