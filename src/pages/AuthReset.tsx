import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function AuthReset() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<"loading" | "ready">("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  // 1) Exchange OTP (code) in URL for a session
 useEffect(() => {
  (async () => {
    try {
      const href = window.location.href;
      const url = new URL(href);

      // Parse both query (?code=) and hash (#access_token=...) styles
      const code = url.searchParams.get("code");
      const hash = window.location.hash || "";
      const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");

      // 1) Newer OTP / PKCE style (?code=...)
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(href);
        if (error) throw error;
      }
      // 2) Older magic-link style (#access_token=...&refresh_token=...)
      else if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) throw error;
      }
      // 3) If no code or tokens found, the link is invalid
      else {
        throw new Error("No valid authentication data found in URL");
      }

      // Double-check we actually have a session before showing the form
      const { data: s } = await supabase.auth.getSession();
      if (!s?.session) throw new Error("Session not established after verification");

      setStage("ready"); // show the password form
    } catch (err: any) {
      console.error("RESET ERROR:", err);
      toast.error(err?.message || "Reset link invalid or expired");
      setTimeout(() => navigate("/auth"), 1500);
    }
  })();
}, [navigate]);


  // 2) Update password
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You can now log in.");
      navigate("/auth");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update password");
    } finally {
      setSaving(false);
    }
  }

  if (stage === "loading") {
    return (
      <div className="min-h-screen grid place-items-center">
        <Card className="w-full max-w-md">
          <CardHeader><CardTitle>Verifying link…</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Please wait.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Set a new password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">New password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Confirm password</label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Saving…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}