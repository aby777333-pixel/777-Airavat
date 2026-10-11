import type { HeroVariant } from "@/lib/seo";

// Unique, purely decorative hero effects per page. Server-rendered SVG + CSS keyframes (no JS), hidden from assistive tech,
// and disabled under prefers-reduced-motion / the reduced-motion preference.
export default function HeroFx({ variant }: { variant: HeroVariant }) {
  const common = "pointer-events-none absolute inset-0 h-full w-full";
  switch (variant) {
    case "platforms": // orbiting product panels around a core
      return (<svg className={common} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><radialGradient id="pf-core" cx="50%" cy="50%"><stop offset="0" stopColor="rgba(var(--glow),0.35)" /><stop offset="1" stopColor="transparent" /></radialGradient></defs>
        <circle cx="900" cy="200" r="160" fill="url(#pf-core)" />
        <g className="fx-orbit" style={{ transformOrigin: "900px 200px" }}>{[0, 60, 120, 180, 240, 300].map((a) => <rect key={a} x={900 + 150 * Math.cos((a * Math.PI) / 180) - 22} y={200 + 70 * Math.sin((a * Math.PI) / 180) - 14} width="44" height="28" rx="6" fill="rgba(var(--glow),0.18)" stroke="rgba(var(--glow),0.6)" />)}</g>
        <g className="fx-orbit-rev" style={{ transformOrigin: "900px 200px" }}><ellipse cx="900" cy="200" rx="230" ry="100" fill="none" stroke="rgba(var(--glow),0.25)" strokeDasharray="6 10" /></g>
      </svg>);
    case "markets": // candlesticks rising from the baseline
      return (<svg className={common} viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => { const x = 640 + i * 20; const h = 40 + ((i * 37) % 120); const up = i % 3 !== 0; return (<g key={i} className="fx-candle" style={{ animationDelay: `${i * 0.08}s`, transformOrigin: `${x}px 340px` }}><line x1={x + 4} y1={340 - h - 18} x2={x + 4} y2={340} stroke={up ? "var(--profit)" : "var(--loss)"} strokeWidth="1" opacity="0.6" /><rect x={x} y={340 - h} width="8" height={h * 0.6} fill={up ? "var(--profit)" : "var(--loss)"} opacity="0.55" /></g>); })}
        <polyline className="fx-draw" points="640,300 700,280 760,290 820,250 880,260 940,220 1000,235 1060,190 1120,200 1180,150" fill="none" stroke="var(--accent)" strokeWidth="2" />
      </svg>);
    case "research": // radar sweep over a target grid
      return (<svg className={common} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {[60, 120, 180].map((r) => <circle key={r} cx="950" cy="200" r={r} fill="none" stroke="rgba(var(--glow),0.25)" />)}
        <line x1="770" y1="200" x2="1130" y2="200" stroke="rgba(var(--glow),0.2)" /><line x1="950" y1="20" x2="950" y2="380" stroke="rgba(var(--glow),0.2)" />
        <g className="fx-sweep" style={{ transformOrigin: "950px 200px" }}><path d="M950 200 L1130 200 A180 180 0 0 0 1077 73 Z" fill="rgba(var(--glow),0.22)" /></g>
        {[[1010, 150], [900, 260], [1060, 240], [880, 160]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="var(--accent)" className="fx-blip" style={{ animationDelay: `${i * 0.7}s` }} />)}
      </svg>);
    case "daily": // newsprint columns revealing line by line
      return (<svg className={common} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {Array.from({ length: 3 }, (_, c) => Array.from({ length: 10 }, (_, r) => <rect key={`${c}-${r}`} className="fx-line" style={{ animationDelay: `${(c * 10 + r) * 0.06}s` }} x={720 + c * 150} y={70 + r * 30} width={r === 0 ? 120 : 90 + ((r * 23) % 40)} height={r === 0 ? 12 : 6} rx="3" fill={r === 0 ? "rgba(var(--glow),0.6)" : "rgba(var(--glow),0.22)"} />))}
      </svg>);
    case "pricing": // ledger lines balancing: debits and credits meeting at zero
      return (<svg className={common} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <line x1="950" y1="40" x2="950" y2="360" stroke="rgba(var(--glow),0.35)" strokeDasharray="4 6" />
        {Array.from({ length: 9 }, (_, i) => { const w = 40 + ((i * 53) % 150); return (<g key={i}><rect className="fx-bar-l" style={{ animationDelay: `${i * 0.12}s`, transformOrigin: "950px 0" }} x={950 - w} y={60 + i * 34} width={w} height="14" rx="3" fill="rgba(var(--glow),0.35)" /><rect className="fx-bar-r" style={{ animationDelay: `${i * 0.12 + 0.3}s`, transformOrigin: "950px 0" }} x="950" y={60 + i * 34} width={w} height="14" rx="3" fill="rgba(var(--glow),0.18)" /></g>); })}
        <text x="950" y="390" textAnchor="middle" fontSize="12" fill="rgba(var(--glow),0.7)" className="fx-fade">Σ debit = Σ credit</text>
      </svg>);
    case "showroom": // camera aperture blades opening
      return (<svg className={common} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g className="fx-aperture" style={{ transformOrigin: "960px 200px" }}>{Array.from({ length: 8 }, (_, i) => <path key={i} d="M960 200 L1130 200 L1090 290 Z" fill="rgba(var(--glow),0.16)" stroke="rgba(var(--glow),0.5)" transform={`rotate(${i * 45} 960 200)`} />)}</g>
        <circle cx="960" cy="200" r="38" fill="rgba(var(--glow),0.25)" className="fx-pulse" />
      </svg>);
    case "academy": // constellation of lessons connecting
      return (<svg className={common} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {[[700, 120], [800, 60], [920, 140], [1010, 80], [1120, 160], [860, 240], [980, 300], [1090, 260], [740, 300]].map(([x, y], i, arr) => (<g key={i}>{i > 0 && <line className="fx-draw" style={{ animationDelay: `${i * 0.25}s` }} x1={arr[i - 1][0]} y1={arr[i - 1][1]} x2={x} y2={y} stroke="rgba(var(--glow),0.5)" strokeWidth="1" />}<circle cx={x} cy={y} r="4" fill="var(--accent)" className="fx-blip" style={{ animationDelay: `${i * 0.25}s` }} /></g>))}
      </svg>);
    case "trust": // shield with a pulsing ring
      return (<svg className={common} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M960 70 L1060 110 V200 C1060 270 1010 320 960 340 C910 320 860 270 860 200 V110 Z" fill="rgba(var(--glow),0.12)" stroke="rgba(var(--glow),0.6)" strokeWidth="2" className="fx-draw" />
        <path d="M925 200 L950 225 L1000 170" fill="none" stroke="var(--profit)" strokeWidth="4" strokeLinecap="round" className="fx-draw" style={{ animationDelay: "0.8s" }} />
        {[0, 1, 2].map((i) => <circle key={i} cx="960" cy="205" r="120" fill="none" stroke="rgba(var(--glow),0.4)" className="fx-ring" style={{ animationDelay: `${i * 1.2}s` }} />)}
      </svg>);
    case "partners": // network graph growing from a hub
      return (<svg className={common} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {[[780, 120], [1130, 90], [800, 300], [1120, 310], [960, 40], [960, 360], [1160, 200], [760, 200]].map(([x, y], i) => (<g key={i}><line className="fx-draw" style={{ animationDelay: `${i * 0.2}s` }} x1="960" y1="200" x2={x} y2={y} stroke="rgba(var(--glow),0.45)" /><circle cx={x} cy={y} r="6" fill="rgba(var(--glow),0.5)" className="fx-blip" style={{ animationDelay: `${i * 0.2 + 0.4}s` }} /></g>))}
        <circle cx="960" cy="200" r="14" fill="var(--accent)" className="fx-pulse" />
      </svg>);
    case "universe": // rotating atlas of market nodes
      return (<svg className={common} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g className="fx-orbit-slow" style={{ transformOrigin: "960px 200px" }}>{["NSE", "BSE", "MCX", "NCDEX", "GIFT", "CDS", "DEBT", "INTL"].map((l, i) => { const a = (i / 8) * Math.PI * 2; const x = 960 + 170 * Math.cos(a); const y = 200 + 110 * Math.sin(a); return (<g key={l}><circle cx={x} cy={y} r="18" fill="rgba(var(--glow),0.18)" stroke="rgba(var(--glow),0.6)" /><text x={x} y={y + 4} textAnchor="middle" fontSize="9" fill="var(--text)">{l}</text></g>); })}</g>
        <ellipse cx="960" cy="200" rx="170" ry="110" fill="none" stroke="rgba(var(--glow),0.3)" strokeDasharray="3 8" />
      </svg>);
    case "briefing": // sunrise over a horizon
      return (<svg className={common} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" /><stop offset="1" stopColor="rgba(var(--glow),0.1)" /></linearGradient></defs>
        <circle cx="960" cy="260" r="70" fill="url(#sun)" className="fx-rise" />
        <rect x="600" y="260" width="600" height="140" fill="var(--bg)" opacity="0.85" />
        {[0, 1, 2, 3].map((i) => <line key={i} x1="620" y1={275 + i * 25} x2="1180" y2={275 + i * 25} stroke="rgba(var(--glow),0.25)" className="fx-fade" style={{ animationDelay: `${i * 0.2}s` }} />)}
      </svg>);
    case "calculators": // abacus beads sliding
      return (<svg className={common} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {Array.from({ length: 6 }, (_, r) => (<g key={r}><line x1="740" y1={90 + r * 44} x2="1180" y2={90 + r * 44} stroke="rgba(var(--glow),0.3)" />{Array.from({ length: 5 }, (_, b) => <circle key={b} className="fx-bead" style={{ animationDelay: `${r * 0.15 + b * 0.05}s` }} cx={770 + b * 30} cy={90 + r * 44} r="11" fill="rgba(var(--glow),0.45)" stroke="rgba(var(--glow),0.8)" />)}</g>))}
      </svg>);
    case "about": // timeline milestones lighting up
      return (<svg className={common} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <line x1="700" y1="200" x2="1180" y2="200" stroke="rgba(var(--glow),0.35)" />{[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={720 + i * 110} cy="200" r="8" fill="var(--accent)" className="fx-blip" style={{ animationDelay: `${i * 0.4}s` }} />)}
      </svg>);
    case "contact": // signal waves
      return (<svg className={common} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => <circle key={i} cx="980" cy="200" r="30" fill="none" stroke="rgba(var(--glow),0.5)" className="fx-ring" style={{ animationDelay: `${i * 0.8}s` }} />)}<circle cx="980" cy="200" r="10" fill="var(--accent)" />
      </svg>);
    case "instrument": // single price path tracing
      return (<svg className={common} viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true"><polyline className="fx-draw" points="0,300 100,280 200,310 300,250 400,270 500,210 600,230 700,180 800,200 900,150 1000,170 1100,120 1200,140" fill="none" stroke="rgba(var(--glow),0.6)" strokeWidth="2" /></svg>);
    case "legal":
    default: // aurora ribbons
      return (<svg className={common} viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true">{[0, 1, 2].map((i) => <path key={i} className="fx-ribbon" style={{ animationDelay: `${i * 1.3}s` }} d={`M0 ${220 + i * 30} C 300 ${120 + i * 40}, 600 ${320 - i * 30}, 1200 ${200 + i * 20}`} fill="none" stroke="rgba(var(--glow),0.35)" strokeWidth="2" />)}</svg>);
  }
}
