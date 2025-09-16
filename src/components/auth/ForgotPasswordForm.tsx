import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const APP_URL = window.location.origin;

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return toast.error("Enter your email");

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${APP_URL}/auth/reset`,
      });
      if (error) throw error;
      toast.success("Password reset email sent. Check your inbox.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Sending..." : "Send reset link"}
      </Button>
    </form>
  );
}