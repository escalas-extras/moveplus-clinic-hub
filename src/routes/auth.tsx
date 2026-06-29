import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolvePostLoginRedirect } from "@/lib/post-login-routing";
import {
  AuthEntryPortal,
  friendlyAuthError,
  type AuthView,
} from "@/components/auth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

const TRANSITION_STEP_MS = 380;
const TRANSITION_FINISH_MS = 320;

function AuthPage() {
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  const [view, setView] = useState<AuthView>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [transitionStep, setTransitionStep] = useState(-1);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      if (mountedRef.current) {
        setError(friendlyAuthError(signInError.message));
        setLoading(false);
      }
      return;
    }

    if (!mountedRef.current) return;
    setLoading(false);
    setView("transition");
    setTransitionStep(-1);

    const userId = data.user?.id;
    let step = -1;
    const stepTimer = window.setInterval(() => {
      if (step < 2) {
        step += 1;
        if (mountedRef.current) setTransitionStep(step);
      }
    }, TRANSITION_STEP_MS);

    try {
      const target = userId ? await resolvePostLoginRedirect(userId) : "/app";
      if (mountedRef.current) setTransitionStep(3);
      await new Promise((resolve) => window.setTimeout(resolve, TRANSITION_FINISH_MS));
      if (mountedRef.current) {
        navigate({ to: target, replace: true });
      }
    } catch (err) {
      window.clearInterval(stepTimer);
      if (mountedRef.current) {
        setView("signin");
        setError("Não conseguimos preparar seu acesso. Tente entrar novamente.");
      }
    } finally {
      window.clearInterval(stepTimer);
    }
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResetSuccess(false);
    if (!email) {
      setError("Informe seu e-mail para receber o link de redefinição.");
      return;
    }
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/set-password`,
      });
      if (resetError) {
        if (mountedRef.current) setError(friendlyAuthError(resetError.message));
        return;
      }
      if (mountedRef.current) {
        setResetSuccess(true);
        setView("signin");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  return (
    <AuthEntryPortal
      view={view}
      onViewChange={(next) => {
        setView(next);
        if (next !== "signin") setResetSuccess(false);
      }}
      email={email}
      onEmailChange={setEmail}
      password={password}
      onPasswordChange={setPassword}
      loading={loading}
      error={error}
      resetSuccess={resetSuccess}
      onClearError={() => {
        setError(null);
        setResetSuccess(false);
      }}
      onSignIn={signIn}
      onSendReset={sendReset}
      transitionStep={transitionStep}
    />
  );
}
