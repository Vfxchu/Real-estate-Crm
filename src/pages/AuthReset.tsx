import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AuthReset() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<"loading" | "ready" | "success" | "error">("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string>("");

  // Force light theme on the reset page
  useEffect(() => {
    const root = document.documentElement;
    const previous = new Set(root.classList);
    root.classList.remove('dark', 'dark-blue');
    root.classList.add('light');
    return () => {
      root.classList.remove('light');
      // Restore previous theme classes
      root.classList.remove('dark', 'dark-blue');
      previous.forEach((c) => root.classList.add(c));
    };
  }, []);

  // 1) Exchange OTP (code) in URL for a session
  useEffect(() => {
    (async () => {
      try {
        const href = window.location.href;
        const url = new URL(href);

        // A) Newer PKCE / OTP: ?code=...
        const code = url.searchParams.get("code");

        // B) Older magic-link style: #access_token=...&refresh_token=...
        const hash = window.location.hash || "";
        const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(href);
          if (error) throw error;
        } else if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
        } else {
          throw new Error("No reset token found in URL");
        }

        const { data: s } = await supabase.auth.getSession();
        if (!s?.session) throw new Error("Session not established after verification");

        setStage("ready");
      } catch (err: any) {
        console.error("RESET ERROR:", err);
        setError(err?.message || "Reset link invalid or expired");
        setStage("error");
      }
    })();
  }, [navigate]);


  // Password validation
  const isPasswordValid = password.length >= 8;
  const isPasswordStrong = password.length >= 12 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);
  const doPasswordsMatch = password === confirm && confirm.length > 0;

  // 2) Update password
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isPasswordValid) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!doPasswordsMatch) {
      toast.error("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStage("success");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update password");
    } finally {
      setSaving(false);
    }
  }

  const handleResendReset = async () => {
    navigate("/auth");
  };

  if (stage === "loading") {
    return (
      <div className="min-h-screen w-full bg-[#161D2D] flex flex-col items-center justify-center p-4 light">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <img
              src="/lovable-uploads/92146f7d-7396-400a-8bf4-92d1603d8ea5.png"
              alt="DKV International Logo"
              className="w-40 md:w-52 h-auto"
            />
            <div className="mt-3 font-heading text-white font-semibold tracking-wide text-xl md:text-2xl">
              DKV INTERNATIONAL REAL ESTATE CRM
            </div>
          </div>
          
          <Card className="bg-black/90 border-muted/20">
            <CardHeader className="text-center">
              <CardTitle className="text-white">Verifying reset link...</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="min-h-screen w-full bg-[#161D2D] flex flex-col items-center justify-center p-4 light">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <img
              src="/lovable-uploads/92146f7d-7396-400a-8bf4-92d1603d8ea5.png"
              alt="DKV International Logo"
              className="w-40 md:w-52 h-auto"
            />
            <div className="mt-3 font-heading text-white font-semibold tracking-wide text-xl md:text-2xl">
              DKV INTERNATIONAL REAL ESTATE CRM
            </div>
          </div>
          
          <Card className="bg-black/90 border-muted/20">
            <CardHeader className="text-center">
              <CardTitle className="text-white flex items-center justify-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Invalid Reset Link
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-destructive/20 bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  {error}
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground text-center">
                This reset link may have expired or already been used. Please request a new one.
              </p>
              <Button onClick={handleResendReset} className="w-full">
                Go to Login & Request New Reset
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (stage === "success") {
    return (
      <div className="min-h-screen w-full bg-[#161D2D] flex flex-col items-center justify-center p-4 light">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <img
              src="/lovable-uploads/92146f7d-7396-400a-8bf4-92d1603d8ea5.png"
              alt="DKV International Logo"
              className="w-40 md:w-52 h-auto"
            />
            <div className="mt-3 font-heading text-white font-semibold tracking-wide text-xl md:text-2xl">
              DKV INTERNATIONAL REAL ESTATE CRM
            </div>
          </div>
          
          <Card className="bg-black/90 border-muted/20">
            <CardHeader className="text-center">
              <CardTitle className="text-white flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Password Updated
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Your password has been successfully updated. You can now sign in with your new password.
              </p>
              <Button onClick={() => navigate("/auth")} className="w-full">
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#161D2D] flex flex-col items-center justify-center p-4 light">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src="/lovable-uploads/92146f7d-7396-400a-8bf4-92d1603d8ea5.png"
            alt="DKV International Logo"
            className="w-40 md:w-52 h-auto"
          />
          <div className="mt-3 font-heading text-white font-semibold tracking-wide text-xl md:text-2xl">
            DKV INTERNATIONAL REAL ESTATE CRM
          </div>
        </div>
        
        <Card className="bg-black/90 border-muted/20">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Set New Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-muted-foreground">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 bg-background/5 border-muted/30 text-white placeholder:text-muted-foreground focus:border-primary"
                    placeholder="Enter new password"
                    required
                    aria-describedby="password-hint"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div id="password-hint" className="text-xs text-muted-foreground">
                  {password.length > 0 && (
                    <div className="space-y-1">
                      <div className={isPasswordValid ? "text-success" : "text-destructive"}>
                        • At least 8 characters {isPasswordValid ? "✓" : "✗"}
                      </div>
                      <div className={isPasswordStrong ? "text-success" : "text-muted-foreground"}>
                        • Recommended: 12+ chars with uppercase, lowercase & numbers
                        {isPasswordStrong ? " ✓" : ""}
                      </div>
                    </div>
                  )}
                  {password.length === 0 && "Password must be at least 8 characters"}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-muted-foreground">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="pr-10 bg-background/5 border-muted/30 text-white placeholder:text-muted-foreground focus:border-primary"
                    placeholder="Confirm new password"
                    required
                    aria-describedby="confirm-hint"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-white"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {confirm.length > 0 && (
                  <div id="confirm-hint" className={`text-xs ${doPasswordsMatch ? "text-success" : "text-destructive"}`}>
                    Passwords {doPasswordsMatch ? "match ✓" : "do not match ✗"}
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={saving || !isPasswordValid || !doPasswordsMatch}
              >
                {saving ? "Updating Password..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}