"use client";
// Utility-bar entry that opens the AIRAVAT LIVE assistant (Anthropic gateway + BHASHA translation).
export default function LiveLink() {
  return <button type="button" className="text-accent hover:underline" onClick={() => window.dispatchEvent(new CustomEvent("airavat:live", { detail: {} }))}>AIRAVAT LIVE assistant</button>;
}
