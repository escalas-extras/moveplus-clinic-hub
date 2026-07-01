import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginRedirect,
});

function LoginRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/auth", replace: true });
  }, [navigate]);

  return null;
}
