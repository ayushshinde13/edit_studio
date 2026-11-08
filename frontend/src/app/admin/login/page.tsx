"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Input } from "@/design-system/primitives/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/primitives/card";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";

  // Completely blank by default - no pre-fed credentials
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError("Please enter your admin email and password.");
      setLoading(false);
      return;
    }

    try {
      // Authenticate against the backend
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.user?.isAdmin) {
        document.cookie = `edito_admin_auth=${data.token}; path=/; max-age=86400; SameSite=Strict`;
        router.push(from);
      } else {
        setError(data.error?.message || "Invalid administrative email or password.");
      }
    } catch {
      setError("Could not reach the authentication service. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm border-[#27272a] bg-[#121215] p-6 space-y-4">
      <div className="text-center space-y-1">
        <div className="h-8 w-8 rounded-[4px] bg-[#fb6b6a]/10 border border-[#fb6b6a]/30 text-[#fb6b6a] mx-auto flex items-center justify-center mb-2">
          <Lock className="h-4 w-4" />
        </div>
        <CardTitle className="text-base font-bold text-white">Staff Admin Login</CardTitle>
        <CardDescription className="text-xs text-[#a1a1aa]">
          Protected internal area. Public sign-up is disabled.
        </CardDescription>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="p-2.5 rounded-[4px] bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs text-[#a1a1aa]">Staff Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            autoComplete="username"
            required
            autoFocus
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-[#a1a1aa]">Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-8 text-xs font-semibold mt-1 bg-[#fb6b6a] text-white hover:bg-[#ea5857]"
        >
          {loading ? "Authenticating..." : "Enter Console"}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </form>

      <div className="pt-3 border-t border-[#27272a] text-center">
        <span className="text-[10px] text-[#a1a1aa] font-mono flex items-center justify-center gap-1">
          <ShieldCheck className="h-3 w-3 text-[#10b981]" />
          Secured with Row Level Security & token cookies
        </span>
      </div>
    </Card>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <React.Suspense fallback={<div className="text-[#a1a1aa] text-xs">Loading admin gate...</div>}>
        <LoginForm />
      </React.Suspense>
    </div>
  );
}
