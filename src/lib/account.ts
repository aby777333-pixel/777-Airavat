import type { SupabaseClient } from "@supabase/supabase-js";

export type TradingAccount = { id: string; user_id: string; client_code: string; environment: "sandbox" | "live"; status: string; segments: string[]; created_at: string; activated_at: string | null };
export type Funds = { ledger_balance: number; blocked_for_orders: number; pending_withdrawals: number; margin_used: number; unrealized_mtm: number; available: number; withdrawable: number; environment: string; currency: string };

export async function getAccount(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("trading_accounts").select("*").eq("user_id", userId).eq("environment", "sandbox").maybeSingle();
  return (data as TradingAccount | null) ?? null;
}

export async function getFunds(supabase: SupabaseClient, accountId: string): Promise<Funds> {
  const { data } = await supabase.rpc("account_funds", { p_account: accountId });
  return (data as Funds) ?? { ledger_balance: 0, blocked_for_orders: 0, pending_withdrawals: 0, margin_used: 0, unrealized_mtm: 0, available: 0, withdrawable: 0, environment: "sandbox", currency: "INR" };
}

export async function getKyc(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("kyc_applications").select("id,status,submitted_at,reviewed_at,rejection_reason,account_type,segments").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}

export function rpcError(e: { message?: string } | null | undefined) {
  if (!e?.message) return "Unexpected error";
  // Postgres raises e.g. "INSUFFICIENT_FUNDS" — map to readable text
  const code = e.message.split(":")[0].trim();
  const map: Record<string, string> = {
    INSUFFICIENT_FUNDS: "Insufficient available funds for this order.",
    INSUFFICIENT_HOLDINGS: "You do not hold enough quantity to sell.",
    INSUFFICIENT_MARGIN_FOR_SHORT: "Insufficient margin for an intraday short.",
    MARKET_CLOSED: "The market session is closed and sandbox extended hours are off.",
    PRICE_OUTSIDE_BAND: "Price is outside the daily price band.",
    PRICE_NOT_TICK_MULTIPLE: "Price must be a multiple of the tick size (₹0.05).",
    QTY_NOT_MULTIPLE_OF_LOT: "Quantity must be a multiple of the lot size.",
    MAX_ORDER_QTY_EXCEEDED: "Quantity exceeds the maximum order quantity.",
    MAX_ORDER_VALUE_EXCEEDED: "Order value exceeds the maximum order value.",
    RMS_KILL_SWITCH_ACTIVE: "Trading is halted by the risk desk (kill switch).",
    ACCOUNT_NOT_ACTIVE: "Your sandbox account is not active.",
    NO_TRADING_ACCOUNT: "Complete onboarding to open a sandbox trading account.",
    INVALID_PAN_FORMAT: "PAN must look like ABCDE1234F.",
    MUST_BE_ADULT: "You must be at least 18 years old.",
    DUPLICATE_PAN_APPLICATION: "An application with this PAN already exists.",
    APPLICATION_ALREADY_EXISTS: "You already have an application in review or approved.",
    INSUFFICIENT_WITHDRAWABLE_BALANCE: "Amount exceeds your withdrawable balance.",
    AMOUNT_OUT_OF_RANGE: "Amount is outside the permitted range.",
    SANDBOX_BALANCE_CAP_EXCEEDED: "Sandbox balances are capped at ₹1 crore.",
    ORDER_NOT_OPEN: "Only open orders can be cancelled.",
    FORBIDDEN: "You do not have permission to do that.",
    MAKER_CHECKER_VIOLATION: "The requester cannot approve their own withdrawal.",
    LIVE_TRADING_GATE: "Live trading cannot be toggled; it requires the regulatory approval workflow.",
  };
  return map[code] ?? e.message;
}
