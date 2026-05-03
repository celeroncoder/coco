import { PageHeader } from "~/components/app-shell/page-header";
import { ThreadsClient } from "./threads-client";

export default function ThreadsPage() {
  return (
    <>
      <PageHeader
        title="Threads"
        description="Each thread runs prompts inside a workspace with one agent."
      />
      <div className="p-8">
        <ThreadsClient />
      </div>
    </>
  );
}
