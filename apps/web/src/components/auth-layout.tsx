"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AppSidebar } from "~/components/app-shell/sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";

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
          <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8">
            <div className="flex flex-col items-center gap-1.5">
              <h1 className="font-display text-2xl font-medium tracking-tight">
                coco
              </h1>
              <p className="text-sm text-muted-foreground">
                Run local CLI agents from the web.
              </p>
            </div>
            <div className="flex gap-2">
              <SignInButton />
              <SignUpButton />
            </div>
          </div>
        )}
      </SignedOut>
      <SignedIn>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <div className="flex h-10 items-center gap-2 px-3">
              <SidebarTrigger />
            </div>
            {children}
          </SidebarInset>
        </SidebarProvider>
      </SignedIn>
    </>
  );
}
