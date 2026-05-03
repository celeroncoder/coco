import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import type { Metadata } from "next";

import { AppSidebar } from "~/components/app-shell/sidebar";
import { ConvexClientProvider } from "~/components/convex-client-provider";
import { ThemeProvider } from "~/components/theme-provider";
import { TRPCReactProvider } from "~/trpc/client";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
import { TooltipProvider } from "~/components/ui/tooltip";

import "./globals.css";
import { Figtree, Inter } from "next/font/google";
import { cn } from "~/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "coco",
  description: "Run local CLI agents from the web.",
  icons: {
    icon: [
      { url: "/icons8-coco-30.png", sizes: "30x30", type: "image/png" },
      { url: "/icons8-coco-60.png", sizes: "60x60", type: "image/png" },
    ],
    apple: { url: "/icons8-coco-90.png", sizes: "90x90", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", inter.variable)}>
      <body className="min-h-svh antialiased">
        <ThemeProvider>
          <ConvexClientProvider>
            <TRPCReactProvider>
              <TooltipProvider>
                <SignedOut>
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
                </SignedOut>
                <SignedIn>
                  <SidebarProvider className="">
                    <AppSidebar />
                    <SidebarInset>
                      <div className="flex h-10 items-center gap-2 px-3">
                        <SidebarTrigger />
                      </div>
                      {children}
                    </SidebarInset>
                  </SidebarProvider>
                </SignedIn>
              </TooltipProvider>
            </TRPCReactProvider>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
