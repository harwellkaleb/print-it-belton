import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { createClient, Session } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { apiUrl, authHeaders } from "../utils/api";

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "customer" | "manager";
  phone: string;
  createdAt: string;
}

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (token: string) => {
    try {
      const headers = authHeaders(token);
      console.log("fetchProfile: Sending request with token:", token.substring(0, 20) + "...");
      console.log("fetchProfile: Headers:", { Authorization: headers.Authorization?.substring(0, 30) + "...", "X-User-Token": headers["X-User-Token"]?.substring(0, 20) + "..." });
      
      const res = await fetch(apiUrl("/user/profile"), {
        headers: headers,
      });
      const data = await res.json();
      if (res.ok) {
        console.log("fetchProfile: Success! Profile:", data);
        setProfile(data);
      } else {
        console.error("Failed to fetch user profile:", data?.error || res.statusText);
        throw new Error(data?.error || `Profile fetch failed: ${res.status}`);
      }
    } catch (e) {
      console.error("Failed to fetch user profile:", e);
      throw e;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    // Always get the freshest token — getSession() auto-refreshes if needed.
    const { data: { session: fresh } } = await supabase.auth.getSession();
    if (fresh?.access_token) {
      await fetchProfile(fresh.access_token);
    }
  }, [fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.access_token) {
        fetchProfile(session.access_token).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.access_token) {
          try {
            await fetchProfile(session.access_token);
          } catch (e) {
            console.error("Profile fetch failed on auth change:", e);
            // Don't clear session on fetch error, just log it
          }
        } else {
          setProfile(null);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    if (data.session?.access_token) {
      setSession(data.session);
      await fetchProfile(data.session.access_token);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, login, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { supabase };