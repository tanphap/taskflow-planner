import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useState } from "react";

type Mode = "sign-in" | "sign-up";

// Email + password authentication against Supabase Auth, replacing the old
// Manus OAuth "startLogin" redirect. On success, Supabase fires an
// onAuthStateChange event that useAuth() listens to, so no manual redirect
// or trpc refetch is needed here.
export function AuthForm({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (mode === "sign-up") {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setInfo("Đã tạo tài khoản. Kiểm tra email để xác nhận (nếu được yêu cầu) rồi đăng nhập.");
        setMode("sign-in");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 text-left">
          <Label htmlFor="auth-email">Email</Label>
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="flex flex-col gap-1.5 text-left">
          <Label htmlFor="auth-password">Mật khẩu</Label>
          <Input
            id="auth-password"
            type="password"
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={submitting}
          />
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {info && (
          <Alert>
            <AlertDescription>{info}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" disabled={submitting} className="w-full">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "sign-up" ? "Tạo tài khoản" : "Đăng nhập"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setInfo(null);
            setMode(mode === "sign-up" ? "sign-in" : "sign-up");
          }}
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {mode === "sign-up" ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Tạo tài khoản"}
        </button>
      </div>
    </form>
  );
}
