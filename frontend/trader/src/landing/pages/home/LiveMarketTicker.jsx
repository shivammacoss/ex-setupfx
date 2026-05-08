const markets = [
  { symbol: 'EUR/USD', price: '1.0847', change: '+0.12%', up: true },
  { symbol: 'GBP/USD', price: '1.2634', change: '+0.08%', up: true },
  { symbol: 'USD/JPY', price: '149.32', change: '-0.21%', up: false },
  { symbol: 'AUD/USD', price: '0.6612', change: '+0.34%', up: true },
  { symbol: 'USD/CAD', price: '1.3584', change: '-0.09%', up: false },
  { symbol: 'USD/CHF', price: '0.8824', change: '+0.18%', up: true },
  { symbol: 'NZD/USD', price: '0.6094', change: '-0.11%', up: false },
  { symbol: 'XAU/USD', price: '2,031.45', change: '+0.78%', up: true },
  { symbol: 'XAG/USD', price: '23.18', change: '+1.24%', up: true },
  { symbol: 'BTC/USD', price: '67,432', change: '+2.14%', up: true },
  { symbol: 'ETH/USD', price: '3,521', change: '+1.82%', up: true },
  { symbol: 'SOL/USD', price: '172.40', change: '+3.05%', up: true },
  { symbol: 'US30', price: '38,421', change: '+0.42%', up: true },
  { symbol: 'SPX500', price: '5,127', change: '+0.28%', up: true },
  { symbol: 'NAS100', price: '17,854', change: '-0.15%', up: false },
  { symbol: 'UK100', price: '7,684', change: '+0.19%', up: true },
  { symbol: 'GER40', price: '17,125', change: '+0.33%', up: true },
  { symbol: 'WTI', price: '78.64', change: '-0.47%', up: false },
]

function TickerItem({ symbol, price, change, up }) {
  return (
    <div className="flex items-center gap-3 px-6 py-3 whitespace-nowrap shrink-0">
      <span className="text-white/90 text-sm font-semibold tracking-wide">{symbol}</span>
      <span className="text-white/70 text-sm font-mono">{price}</span>
      <span
        className={`text-sm font-semibold font-mono ${up ? 'text-[#00d048]' : 'text-red-400'}`}
      >
        {up ? '▲' : '▼'} {change}
      </span>
    </div>
  )
}

export default function LiveMarketTicker() {
  const items = [...markets, ...markets]

  return (
    <section className="relative py-2 border-y border-white/[0.06] overflow-hidden bg-white/[0.02] backdrop-blur-xl">
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,208,72,0.35), transparent)' }}
      />

      <div className="ticker-marquee flex items-center">
        {items.map((m, i) => (
          <TickerItem key={`${m.symbol}-${i}`} {...m} />
        ))}
      </div>

      {/* Edge fade masks for a clean entry/exit */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#0A0E1A] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#0A0E1A] to-transparent z-10" />

      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,208,72,0.35), transparent)' }}
      />
    </section>
  )
}
