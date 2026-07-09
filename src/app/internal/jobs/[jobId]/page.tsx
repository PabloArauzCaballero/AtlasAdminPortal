import { JobDetailPage } from "@/features/operational-jobs/job-detail-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ jobId: string }> }>) {
  const { jobId } = await params;
  return <JobDetailPage jobRunId={jobId} />;
}
