import { price } from "@/lib/format";

// Five-level simulated market depth derived deterministically from the quote (the sandbox exchange has no order book).
export default function DepthLadder({ ltp, bid, ask, tick, volume, symbol }: { ltp: number; bid: number; ask: number; tick: number; volume: number; symbol: string }) {
  const seq = (() => { let seed = Math.floor(ltp * 100) + symbol.length; const out: number[] = []; for (let i = 0; i < 20; i++) { seed = (seed * 9301 + 49297) % 233280; out.push(seed / 233280); } return out; })();
  const base = Math.max(50, Math.round(volume / 400));
  const bids = Array.from({ length: 5 }, (_, i) => ({ p: bid - i * tick, q: Math.round(base * (0.6 + seq[i]) * (1 + i * 0.3)), o: 1 + Math.round(seq[10 + i] * 6) }));
  const asks = Array.from({ length: 5 }, (_, i) => ({ p: ask + i * tick, q: Math.round(base * (0.6 + seq[5 + i]) * (1 + i * 0.3)), o: 1 + Math.round(seq[15 + i] * 6) }));
  const tb = bids.reduce((s, b) => s + b.q, 0), ta = asks.reduce((s, a) => s + a.q, 0); const maxQ = Math.max(...bids.map((b) => b.q), ...asks.map((a) => a.q));
  return (
    <div className="glass p-3 text-xs">
      <div className="mb-1 flex items-center justify-between"><span className="text-[11px] uppercase tracking-wider text-faint">Market depth</span><span className="badge badge-sim">simulated</span></div>
      <div className="grid grid-cols-2 gap-2">
        <table className="w-full"><thead><tr className="text-faint"><th className="text-left">Bid</th><th className="text-right">Qty</th><th className="text-right">Ord</th></tr></thead><tbody>{bids.map((b) => <tr key={b.p} className="relative"><td className="relative"><span className="absolute inset-y-0 left-0 bg-profit/15" style={{ width: `${(b.q / maxQ) * 100}%` }} /><span className="relative text-profit">{price(b.p)}</span></td><td className="num">{b.q}</td><td className="num text-muted">{b.o}</td></tr>)}</tbody></table>
        <table className="w-full"><thead><tr className="text-faint"><th className="text-left">Ask</th><th className="text-right">Qty</th><th className="text-right">Ord</th></tr></thead><tbody>{asks.map((a) => <tr key={a.p}><td className="relative"><span className="absolute inset-y-0 left-0 bg-loss/15" style={{ width: `${(a.q / maxQ) * 100}%` }} /><span className="relative text-loss">{price(a.p)}</span></td><td className="num">{a.q}</td><td className="num text-muted">{a.o}</td></tr>)}</tbody></table>
      </div>
      <div className="mt-1 flex justify-between text-faint"><span>Total bid {tb}</span><span>LTP {price(ltp)}</span><span>Total ask {ta}</span></div>
    </div>
  );
}
