import { ThreadDetailClient } from "./thread-detail-client";

export default async function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ThreadDetailClient threadId={id} />;
}
