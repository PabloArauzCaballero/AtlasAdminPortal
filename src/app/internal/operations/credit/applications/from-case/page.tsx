import { ApplicationFromCasePage } from "@/features/credit/application-from-case-page";

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function Page({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const query = await searchParams;
  return (
    <ApplicationFromCasePage
      customerId={first(query.customerId)}
      caseCode={first(query.caseCode)}
    />
  );
}
