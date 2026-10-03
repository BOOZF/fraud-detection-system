"use client";

import { useSyncExternalStore } from "react";
import { isAuthenticated } from "@/lib/auth";

const subscribe = () => () => {};

/** `null` while unknown (server render and hydration), then the sessionStorage login state. */
export function useAuthenticated(): boolean | null {
  return useSyncExternalStore<boolean | null>(subscribe, isAuthenticated, () => null);
}
