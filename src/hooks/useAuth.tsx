import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "employee";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export function useAuth() {
  const { session, loading } = useSession();
  const userId = session?.user.id;

  const roleQuery = useQuery({
    queryKey: ["role", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<AppRole> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw error;
      const roles = (data ?? []).map((r) => r.role as AppRole);
      if (roles.includes("admin")) return "admin";
      if (roles.includes("manager")) return "manager";
      return "employee";
    },
  });

  return {
    session,
    user: session?.user ?? null,
    role: roleQuery.data ?? null,
    loading: loading || (Boolean(userId) && roleQuery.isLoading),
    signOut: () => supabase.auth.signOut(),
  };
}

/** Redirects to the sign-in page when signed out, or home when the role is wrong. */
export function useRequireRole(allowed: AppRole[]) {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.session) {
      navigate({ to: "/auth" });
      return;
    }
    if (auth.role && !allowed.includes(auth.role)) {
      navigate({ to: "/" });
    }
  }, [auth.loading, auth.session, auth.role, allowed, navigate]);

  return auth;
}
