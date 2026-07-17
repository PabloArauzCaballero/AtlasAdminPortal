import { SessionInvestigationPage } from "@/features/operations-sessions/session-investigation-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ sessionId: string }> }>) {
  const { sessionId } = await params;
  return <SessionInvestigationPage sessionId={sessionId} />;
}
