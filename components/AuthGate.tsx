"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticated } from "@/hooks/use-authenticated";

/** Client-side stand-in for real auth: bounces to the landing page when the demo login is missing. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const authed = useAuthenticated();

  useEffect(() => {
    if (authed === false) router.replace("/");
  }, [authed, router]);

  if (!authed) return <Skeleton aria-hidden className="m-6 h-40" />;
  return <>{children}</>;
}
