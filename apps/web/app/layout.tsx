import type { Metadata } from "next";

import { AuthLayout } from "~/components/auth-layout";
import { ConvexClientProvider } from "~/components/convex-client-provider";
import { ThemeProvider } from "~/components/theme-provider";
import { TRPCReactProvider } from "~/trpc/client";
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
                <AuthLayout>{children}</AuthLayout>
              </TooltipProvider>
            </TRPCReactProvider>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
