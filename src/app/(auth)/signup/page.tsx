import Link from "next/link";
import SignupForm from "./SignupForm";
import { Logo } from "@/components/site/Header";

export const metadata = { title: "Open account" };

export default function Signup() {
  return (
    <div className="bg-atmosphere flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="glass-strong w-full max-w-md p-8">
        <Link href="/" className="flex items-center gap-2"><Logo /><span className="font-display font-bold tracking-[0.18em]">AIRAVAT</span></Link>
        <h1 className="font-display mt-6 text-2xl font-bold">Open a sandbox account</h1>
        <p className="mt-1 text-sm text-muted">Step 1 of 2: create your login. Step 2 is a simulated KYC application.</p>
        <SignupForm />
        <p className="mt-6 text-center text-sm text-muted">Already registered? <Link className="text-accent underline" href="/login">Log in</Link></p>
      </div>
    </div>
  );
}
