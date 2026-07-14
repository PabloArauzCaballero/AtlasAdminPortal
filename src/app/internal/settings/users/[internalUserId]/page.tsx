import { UserDetailPage } from "@/features/internal-users/user-detail-page";

export default async function UserDetailRoute({
  params,
}: Readonly<{ params: Promise<{ internalUserId: string }> }>) {
  const { internalUserId } = await params;
  return <UserDetailPage internalUserId={internalUserId} />;
}
