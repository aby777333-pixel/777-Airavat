import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import Ticker from "@/components/market/Ticker";
import LiveOrb from "@/components/live/LiveOrb";

export const dynamic = "force-dynamic";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-atmosphere min-h-dvh">
      <Header />
      <Ticker />
      <main>{children}</main>
      <Footer />
      <LiveOrb context={{ surface: "public-website" }} />
    </div>
  );
}
