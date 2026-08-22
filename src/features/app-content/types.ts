export type ContentSurface =
  | "onboarding"
  | "home"
  | "faq"
  | "help"
  | "legal"
  | "profile"
  | "credit";

export type ContentActionKind = "whatsapp" | "link" | "screen" | "tour";

export type ContentBullet = {
  text: string;
  icon?: string | null;
  emphasis?: boolean;
};

export type AppContentEntry = {
  contentId: string;
  surface: ContentSurface;
  contentKey: string;
  locale: string;
  title: string | null;
  subtitle: string | null;
  bodyMd: string | null;
  bullets: ContentBullet[];
  metadata: Record<string, unknown>;
  actionKind: ContentActionKind | null;
  actionLabel: string | null;
  actionValue: string | null;
  /** Lo que la app recibe de verdad: el enlace de WhatsApp ya con prefijo de país. */
  resolvedAction: { kind: string; label: string; url: string } | null;
  displayOrder: number;
  isActive: boolean;
  publishedAt: string | null;
  updatedAt: string | null;
};

export type AppContentList = { items: AppContentEntry[] };

export type AppContentUpsert = {
  surface: ContentSurface;
  contentKey: string;
  locale?: string;
  title?: string | null;
  subtitle?: string | null;
  bodyMd?: string | null;
  bullets?: ContentBullet[] | null;
  metadata?: Record<string, unknown> | null;
  actionKind?: ContentActionKind | null;
  actionLabel?: string | null;
  actionValue?: string | null;
  displayOrder?: number;
  isActive?: boolean;
};
