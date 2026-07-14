"use client";

import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";

type ReportQueryLike = {
  isLoading: boolean;
  error: unknown;
  data: unknown;
  refetch: () => unknown;
};

export function ReportView({
  query,
  title,
}: Readonly<{ query: ReportQueryLike; title: string }>) {
  if (query.isLoading) return <LoadingSkeleton rows={5} />;
  if (query.error) {
    return (
      <ErrorState
        description={
          isAtlasApiError(query.error)
            ? query.error.message
            : `No se pudo cargar "${title}".`
        }
        requestId={
          isAtlasApiError(query.error) ? query.error.requestId : undefined
        }
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (!query.data) return null;
  return <JsonViewer title={title} value={query.data} />;
}
