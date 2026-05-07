"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { api } from "@coco/convex/api";
import type { Id } from "@coco/convex/dataModel";
import { useMutation, useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

import { Plus } from "@/components/icons";
import { AppSidebar } from "~/components/app-shell/sidebar";
import { RightSidebarProvider, useRightSidebarRef } from "~/components/right-sidebar-context";
import { defaultModeFor } from "~/lib/agents";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";

import { LandingPage } from "~/components/landing-page";

const AUTH_ROUTES = ["/sign-in", "/sign-up"];

function isAuthRoute(pathname: string | null): boolean {
  return AUTH_ROUTES.some((route) => pathname?.startsWith(route));
}

function HeaderNewSession() {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const create = useMutation(api.threads.create);

  const threadId = pathname?.startsWith("/threads/")
    ? (pathname.replace("/threads/", "") as Id<"threads">)
    : null;

  const thread = useQuery(
    api.threads.get,
    threadId ? { threadId } : "skip",
  );

  if (!thread) return null;

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const id = await create({
        workspaceId: thread.workspaceId,
        agent: "claude",
        mode: defaultModeFor("claude"),
        title: "Claude Code session",
      });
      router.push(`/threads/${id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title="New session in this workspace"
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 md:size-8"
    >
      <Plus size={14} strokeWidth={1.5} />
    </button>
  );
}

export function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showAuthChildren = isAuthRoute(pathname);

  return (
    <>
      <SignedOut>
        {showAuthChildren ? (
          children
        ) : (
          <LandingPage />
        )}
      </SignedOut>
      <SignedIn>
        <RightSidebarProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <div className="flex h-12 items-center gap-2 border-b border-border px-3">
                <SidebarTrigger className="md:size-8" />
                <HeaderNewSession />
              </div>
              {children}
            </SidebarInset>
            <RightSidebarSlot />
          </SidebarProvider>
        </RightSidebarProvider>
      </SignedIn>
    </>
  );
}

function RightSidebarSlot() {
  const ref = useRightSidebarRef();
  return (
    <div
      ref={ref}
      className="sticky top-0 h-svh shrink-0 overflow-hidden bg-background"
    />
  );
}
