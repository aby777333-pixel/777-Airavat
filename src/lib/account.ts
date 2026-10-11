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
    NOT_PENDING: "This request has already been decided.",
    STATUTORY_CHANGE_REQUIRES_COMPLIANCE: "Statutory and exchange charges can only be changed by compliance.",
    ONLY_BROKER_FEES_CAN_BE_WAIVED: "Only AIRAVAT's own fees can be waived; statutory levies cannot.",
    OFFER_MUST_TARGET_BROKER_FEE: "Offers can only discount AIRAVAT's own fees.",
    OFFER_NOT_AVAILABLE: "That promo code is not active.",
    PLAN_NOT_APPROVED: "That plan is not approved for assignment.",
    ONLY_BROKER_FEES_ADJUSTABLE: "Only brokerage can be reversed here; levies need a separate legal process.",
    AMOUNT_EXCEEDS_CHARGED_FEE: "Amount exceeds the brokerage charged on this trade.",
    PLAN_NOT_AVAILABLE: "That subscription plan is not available.",
    ALREADY_SUBSCRIBED: "You already have an active subscription to this plan.",
    AUTHORIZED_PERSON_NEEDS_EXCHANGE_APPROVAL_REF: "An Authorized Person needs an exchange approval reference before activation.",
    PLAN_CATEGORY_MISMATCH: "This commission plan is for a different partner category.",
    PARTNER_NOT_ELIGIBLE: "Partner is not eligible for payout.",
    NOTHING_TO_PAY: "No accrued commissions to pay.",
    PARTNER_CANNOT_APPROVE_OWN_PAYOUT: "A partner cannot approve their own payout.",
    TRADING_ENABLE_GATE: "Only sandbox markets can be enabled; production markets need the regulatory workflow.",
    CONDITIONS_1_TO_8: "A scan needs between 1 and 8 conditions.",
    SCANNER_LIMIT: "You can save up to 20 scans.",
    UNKNOWN_STRATEGY_TYPE: "Unknown strategy type.",
    CASH_OUT_OF_RANGE: "Shadow portfolio cash must be between ₹1 and ₹10 crore.",
    PORTFOLIO_LIMIT: "You can have up to 10 shadow portfolios.",
    INSUFFICIENT_SHADOW_CASH: "Not enough shadow cash for this simulated order.",
    INSUFFICIENT_SHADOW_HOLDINGS: "You do not hold enough quantity in this shadow portfolio.",
    NO_OPEN_POSITION: "There is no open position in this instrument today.",
    COMPLIANCE_APPROVAL_REQUIRED: "Market commentary, research and news summaries need compliance approval.",
    MUST_BE_APPROVED: "Only approved articles can be published.",
    MUST_BE_APPROVED_WITH_SCHEDULE: "Approve the article and choose a publish time first.",
    INVALID_TRANSITION: "That workflow step is not allowed from the current state.",
    INVALID_EMAIL: "Enter a valid email address.",
  };
  return map[code] ?? e.message;
}
