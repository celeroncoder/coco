"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import { AppSidebar } from "~/components/app-shell/sidebar";
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
        <SidebarProvider style={{ "--sidebar-width": "19.5rem" } as CSSProperties}>
          <AppSidebar />
          <SidebarInset>
            <div className="flex h-12 items-center gap-2 border-b border-border px-3">
              <SidebarTrigger className="md:size-8" />
            </div>
            {children}
          </SidebarInset>
        </SidebarProvider>
      </SignedIn>
    </>
  );
}
