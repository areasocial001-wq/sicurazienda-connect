import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type LeaveType = "ferie" | "permesso_rol" | "malattia" | "permesso_retribuito" | "altro";
export type LeaveStatus = "in_attesa" | "approvata" | "rifiutata";

export interface LeaveRequest {
  id: string;
  user_id: string;
  type: LeaveType;
  start_date: string;
  end_date: string;
  hours: number | null;
  reason: string | null;
  attachment_path: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  requester_name?: string | null;
  role?: string | null;
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  year: number;
  vacation_days_total: number;
  vacation_days_used: number;
  permit_hours_total: number;
  permit_hours_used: number;
}

export function useWorkerLeave() {
  const { user } = useAuth();
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [myBalance, setMyBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const year = new Date().getFullYear();

    const [{ data: mine }, { data: all }, { data: balance }] = await Promise.all([
      supabase
        .from("worker_leave_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: false }),
      supabase
        .from("worker_leave_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("worker_leave_balances")
        .select("*")
        .eq("user_id", user.id)
        .eq("year", year)
        .maybeSingle(),
    ]);

    setMyRequests((mine as LeaveRequest[]) || []);

    const list = (all as LeaveRequest[]) || [];
    if (list.length) {
      const ids = Array.from(new Set(list.map((r) => r.user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);
      const map = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
      const roleMap = new Map((roles || []).map((p: any) => [p.user_id, p.role]));
      setAllRequests(
        list.map((r) => ({
          ...r,
          requester_name: map.get(r.user_id) || null,
          role: roleMap.get(r.user_id) || null,
        })),
      );
    } else {
      setAllRequests([]);
    }

    setMyBalance((balance as LeaveBalance) || null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createRequest = async (input: Omit<LeaveRequest, "id" | "user_id" | "status" | "reviewed_by" | "reviewed_at" | "review_note" | "created_at" | "updated_at" | "requester_name">) => {
    if (!user) throw new Error("Non autenticato");
    const { error } = await supabase.from("worker_leave_requests").insert({
      ...input,
      user_id: user.id,
    });
    if (error) throw error;
    await refresh();
  };

  const reviewRequest = async (id: string, status: "approvata" | "rifiutata", note?: string) => {
    if (!user) throw new Error("Non autenticato");
    const { error } = await supabase
      .from("worker_leave_requests")
      .update({ status, review_note: note || null, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await refresh();
  };

  const cancelRequest = async (id: string) => {
    const { error } = await supabase.from("worker_leave_requests").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  };

  return { myRequests, allRequests, myBalance, loading, refresh, createRequest, reviewRequest, cancelRequest };
}
