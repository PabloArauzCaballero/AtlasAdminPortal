export const dynamic = "force-dynamic";

import { BusinessTermDetailPage } from "@/features/business-glossary/business-term-detail-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ termId: string }> }>) {
  const { termId } = await params;
  return <BusinessTermDetailPage termId={termId} />;
}
