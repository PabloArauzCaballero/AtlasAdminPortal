import { EndpointDetailPage } from "@/features/systems-endpoints/endpoint-detail-page";

export default async function EndpointDetailRoute({
  params,
}: Readonly<{ params: Promise<{ endpointId: string }> }>) {
  const { endpointId } = await params;
  return <EndpointDetailPage endpointId={endpointId} />;
}
