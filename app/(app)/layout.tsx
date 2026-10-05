import { AuthGate } from "@/components/AuthGate";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { SelectionAsk } from "@/components/chat/SelectionAsk";
import { Footer } from "@/components/Footer";
import { AppSidebar } from "@/components/app-sidebar";
import { TdBadge } from "@/components/TdBadge";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <ChatProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-background/70 px-4 backdrop-blur">
              <SidebarTrigger aria-label="Toggle sidebar" />
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm font-medium">Malaysia XX Bank | Fraud Copilot</span>
              <TdBadge className="ml-auto hidden md:inline-flex" />
              <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" title="Signed in as analyst">A</span>
            </header>
            <main className="flex-1">{children}</main>
            <Footer />
          </SidebarInset>
        </SidebarProvider>
        <ChatBubble />
        <SelectionAsk />
      </ChatProvider>
    </AuthGate>
  );
}
