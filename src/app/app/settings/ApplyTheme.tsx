"use client";
import { useEffect } from "react";
import { applyTheme } from "@/components/ThemeSwitcher";

// Synchronises the saved profile theme to this device on load (cross-device preference).
export default function ApplyTheme({ theme }: { theme: string }) {
  useEffect(() => { applyTheme(theme); }, [theme]);
  return null;
}
