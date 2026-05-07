"use client";

import React, { forwardRef, useRef } from "react";
import { cn } from "~/lib/utils";
import { AnimatedBeam } from "~/components/ui/animated-beam";
import { env } from "~/env/client";
import Image from "next/image";

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex size-12 items-center justify-center rounded-full border-2 border-border bg-card p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]",
        className,
      )}
    >
      {children}
    </div>
  );
});
Circle.displayName = "Circle";

export function AnimatedBeamLogos({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const div1Ref = useRef<HTMLDivElement>(null); // Claude
  const div2Ref = useRef<HTMLDivElement>(null); // Pi
  const div4Ref = useRef<HTMLDivElement>(null); // Codex
  const div5Ref = useRef<HTMLDivElement>(null); // Droid (Factory AI)
  
  const div6Ref = useRef<HTMLDivElement>(null); // Coco (Center)

  const logoToken = env.NEXT_PUBLIC_LOGO_DEV_TOKEN;
  const logoUrl = (domain: string) => `https://img.logo.dev/${domain}?token=${logoToken}&background=transparent`;

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-10",
        className,
      )}
      ref={containerRef}
    >
      <div className="flex size-full flex-col max-w-lg max-h-[300px] items-stretch justify-between gap-10">
        <div className="flex flex-row items-center justify-between">
          <Circle ref={div1Ref}>
            <Image src={logoUrl('claudeai.com')} alt="Claude" width={24} height={24} className="rounded-sm" />
          </Circle>
          <Circle ref={div5Ref}>
            <Image src={logoUrl('factory.ai')} alt="Factory AI" width={24} height={24} className="rounded-sm" />
          </Circle>
        </div>
        <div className="flex flex-row items-center justify-between">
          <Circle ref={div2Ref}>
            <Image src={logoUrl('pi.ai')} alt="Pi" width={24} height={24} className="rounded-sm" />
          </Circle>
          <Circle ref={div6Ref} className="size-16 p-3">
            <Image src="/icons8-coco-90.png" alt="coco icon" width={40} height={40} className="rounded" />
          </Circle>
          <Circle ref={div4Ref}>
            <Image src={logoUrl('openai.com')} alt="OpenAI Codex" width={24} height={24} className="rounded-sm" />
          </Circle>
        </div>
        <div className="flex flex-row items-center justify-center">
        </div>
      </div>

      {/* Beams */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div1Ref}
        toRef={div6Ref}
        curvature={-75}
        endYOffset={-10}
        duration={3}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div2Ref}
        toRef={div6Ref}
        curvature={0}
        duration={4}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div4Ref}
        toRef={div6Ref}
        curvature={0}
        duration={3.5}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div5Ref}
        toRef={div6Ref}
        curvature={75}
        endYOffset={-10}
        reverse
        duration={4.5}
      />
    </div>
  );
}
