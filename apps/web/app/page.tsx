import { ArrowRight, FolderTree, HardDrive, MessagesSquare } from "@/components/icons";
import Link from "next/link";

import { PageHeader } from "~/components/app-shell/page-header";

const QUICK_LINKS = [
  {
    href: "/devices",
    title: "Pair a device",
    description: "Run coco-agent on your machine and link it here.",
    icon: HardDrive,
  },
  {
    href: "/workspaces",
    title: "Add a workspace",
    description: "Pick a folder where agents will run.",
    icon: FolderTree,
  },
  {
    href: "/threads",
    title: "Start a thread",
    description: "Send a prompt and stream the response back.",
    icon: MessagesSquare,
  },
];

export default function Home() {
  return (
    <>
      <PageHeader
        title="Welcome"
        description="Run local CLI agents from the web. Pair a machine, pick a workspace, send a prompt."
      />
      <div className="grid grid-cols-1 gap-3 p-8 md:grid-cols-3">
        {QUICK_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col gap-3 rounded-xl border bg-card p-5 transition-colors hover:border-foreground"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-foreground group-hover:text-background">
              <item.icon size={16} strokeWidth={1.2} />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-label-md font-medium">
                {item.title}
                <ArrowRight
                  size={14}
                  strokeWidth={1.2}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
              <p className="text-paragraph-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
