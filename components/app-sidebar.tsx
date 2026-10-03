"use client";

import { LayoutDashboard, LogOut, Network } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TdBadge } from "./TdBadge";

// `also` lists extra path prefixes that keep an item highlighted (alert detail pages belong to the dashboard).
const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, also: ["/alerts/"] },
  { href: "/architecture", label: "Architecture", icon: Network, also: [] as string[] },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function onLogout() {
    logout();
    router.push("/");
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Malaysia XX Bank">
              <Link href="/dashboard">
                <Image
                  src="/photo/bankIcon.png"
                  alt="Malaysia XX Bank logo"
                  width={32}
                  height={32}
                  className="size-8 shrink-0 rounded-md object-contain"
                />
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Malaysia XX Bank</span>
                  <span className="truncate text-xs text-muted-foreground">Fraud Copilot</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Fraud operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.map(({ href, label, icon: Icon, also }) => {
                const active = [href, ...also].some((p) => pathname.startsWith(p));
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={label}>
                      <Link href={href} aria-current={active ? "page" : undefined}>
                        <Icon aria-hidden />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton type="button" tooltip="Logout" onClick={onLogout}>
              <LogOut aria-hidden />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <TdBadge className="group-data-[collapsible=icon]:hidden" />
        <p className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Fictional bank, synthetic data.
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
