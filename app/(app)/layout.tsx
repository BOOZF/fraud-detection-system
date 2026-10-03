import { AuthGate } from "@/components/AuthGate";
import { Footer } from "@/components/Footer";
import { AppSidebar } from "@/components/app-sidebar";
import { TdBadge } from "@/components/TdBadge";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger aria-label="Toggle sidebar" />
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm font-medium">Malaysia XX Bank | Fraud Copilot</span>
            <TdBadge className="ml-auto hidden md:inline-flex" />
          </header>
          <main className="flex-1">{children}</main>
          <Footer />
        </SidebarInset>
      </SidebarProvider>
    </AuthGate>
  );
}
