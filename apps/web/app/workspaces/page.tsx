import { PageHeader } from "~/components/app-shell/page-header";
import { WorkspacesClient } from "./workspaces-client";

export default function WorkspacesPage() {
  return (
    <>
      <PageHeader
        title="Workspaces"
        description="A workspace is a fixed local path that agents run inside."
      />
      <div className="p-8">
        <WorkspacesClient />
      </div>
    </>
  );
}
