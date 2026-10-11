import Link from "next/link";
import LoginForm from "./LoginForm";
import { Logo } from "@/components/site/Header";

export const metadata = { title: "Log in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; confirmed?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="bg-atmosphere flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="glass-strong w-full max-w-md p-8">
        <Link href="/" className="flex items-center gap-2"><Logo size={38} /></Link>
        <h1 className="font-display mt-6 text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Log in to your sandbox account.</p>
        {sp.confirmed && <p className="mt-3 rounded-lg border border-profit/40 bg-profit/10 p-3 text-sm text-profit">Email confirmed. You can log in now.</p>}
        <LoginForm next={sp.next ?? "/app"} />
        <p className="mt-6 text-center text-sm text-muted">New here? <Link className="text-accent underline" href="/signup">Open a sandbox account</Link></p>
      </div>
    </div>
  );
}
