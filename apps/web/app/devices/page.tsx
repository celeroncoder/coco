import { PageHeader } from "~/components/app-shell/page-header";
import { DevicesClient } from "./devices-client";

export default function DevicesPage() {
  return (
    <>
      <PageHeader
        title="Devices"
        description="Each device is a machine running coco-agent."
      />
      <div className="p-8">
        <DevicesClient />
      </div>
    </>
  );
}
