import Image from "next/image";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "~/components/ui/button";
import { Sparkles, HardDrive, FolderTree, MessagesSquare } from "~/components/icons";
import { GLSLHills } from "~/components/ui/glsl-hills";
import { AnimatedBeamLogos } from "~/components/ui/animated-beam-logos";

export function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 font-display text-lg font-medium tracking-tight">
          <Image src="/icons8-coco-90.png" alt="coco icon" width={24} height={24} className="rounded" />
          coco
        </div>
        <div className="flex items-center gap-4">
          <SignInButton>
            <Button variant="ghost" size="sm">Log in</Button>
          </SignInButton>
          <SignUpButton>
            <Button size="sm">Get Started</Button>
          </SignUpButton>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col relative">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <GLSLHills width="100%" height="100%" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        </div>

        <section className="relative z-10 flex flex-col items-center justify-center px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-muted-foreground mb-8">
            <Sparkles size={14} className="text-primary" />
            <span>Meet your new local AI CLI agent</span>
          </div>
          <h1 className="max-w-3xl text-5xl font-display font-medium tracking-tight sm:text-6xl mb-6">
            Run local CLI agents <br className="hidden sm:inline" /> from the web.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground mb-10">
            Pair your machine securely, pick a workspace, and send prompts. Coco brings the power of AI right into your local development environment.
          </p>
          <div className="flex items-center justify-center gap-4">
            <SignUpButton>
              <Button size="lg" className="h-11 px-8 text-base">Start Chatting</Button>
            </SignUpButton>
            <SignInButton>
              <Button variant="outline" size="lg" className="h-11 px-8 text-base">Sign In</Button>
            </SignInButton>
          </div>
        </section>

        {/* Features Grid */}
        <section className="relative z-10 mx-auto max-w-5xl px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HardDrive size={24} />
            </div>
            <h3 className="text-lg font-medium">Pair your device</h3>
            <p className="text-muted-foreground">Run coco-agent on your local machine and link it securely to your web dashboard.</p>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FolderTree size={24} />
            </div>
            <h3 className="text-lg font-medium">Add a workspace</h3>
            <p className="text-muted-foreground">Select a specific folder where your agents will have context and run operations.</p>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessagesSquare size={24} />
            </div>
            <h3 className="text-lg font-medium">Start a thread</h3>
            <p className="text-muted-foreground">Send prompts and watch the streaming response right from your browser interface.</p>
          </div>
        </section>

        {/* Animated Beam AI Integrations Showcase */}
        <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24 w-full flex flex-col items-center gap-6 text-center">
          <div className="max-w-xl mb-4">
            <h2 className="text-3xl font-display font-medium tracking-tight mb-3">Connect all your tools</h2>
            <p className="text-muted-foreground">Integrate seamlessly with Claude, Pi, Codex, Factory AI, and more to power your local workflows directly from the browser.</p>
          </div>
          <div className="w-full aspect-[16/9] md:aspect-[21/9]">
            <AnimatedBeamLogos />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} coco. All rights reserved.</p>
      </footer>
    </div>
  );
}
