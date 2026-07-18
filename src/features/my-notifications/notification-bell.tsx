"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatDateTime, safeText } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";
import {
  useMarkAllMyNotificationsReadMutation,
  useMarkMyNotificationReadMutation,
  useMyNotifications,
  useMyUnreadNotificationsCount,
} from "./hooks";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousUnread = useRef<number | null>(null);

  const unreadCount = useMyUnreadNotificationsCount();
  const recent = useMyNotifications({ page: 1, limit: 6 }, { enabled: open });
  const markRead = useMarkMyNotificationReadMutation();
  const markAllRead = useMarkAllMyNotificationsReadMutation();

  const unread = unreadCount.data?.unread ?? 0;

  // Sacude la campana solo cuando el contador sube (llegó algo nuevo), no en cada refetch.
  useEffect(() => {
    const increased =
      previousUnread.current !== null && unread > previousUnread.current;
    previousUnread.current = unread;
    if (!increased) return;
    setRinging(true);
    const timer = setTimeout(() => setRinging(false), 1_000);
    return () => clearTimeout(timer);
  }, [unread]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Notificaciones"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full border border-atlas-border bg-white text-atlas-muted transition-all duration-200 hover:scale-105 hover:border-slate-300 hover:text-atlas-text active:scale-95",
          unread > 0 && "border-red-200 text-atlas-text",
        )}
      >
        <Bell className={cn("h-4 w-4", ringing && "animate-bell-ring")} />
        {unread > 0 ? (
          <span
            key={unread}
            className="absolute -right-1 -top-1 flex h-4 min-w-4 animate-pop items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-red-400/60 motion-reduce:hidden" />
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-atlas-border bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-atlas-border px-3 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-atlas-muted">
              Mis notificaciones
            </p>
            {unread > 0 ? (
              <button
                type="button"
                disabled={markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
                className="text-xs font-medium text-atlas-accent underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                Marcar todas
              </button>
            ) : null}
          </div>
          <div className="atlas-scrollbar max-h-80 overflow-auto">
            {recent.isLoading ? (
              <p className="px-3 py-4 text-xs text-atlas-muted">Cargando…</p>
            ) : recent.data && recent.data.items.length > 0 ? (
              recent.data.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!item.readAt) markRead.mutate(item.id);
                  }}
                  className={cn(
                    "flex w-full flex-col gap-0.5 border-b border-atlas-border px-3 py-2.5 text-left last:border-b-0 hover:bg-atlas-soft",
                    !item.readAt && "bg-atlas-accentSoft/40",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium text-atlas-text">
                    {!item.readAt ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-atlas-accent" />
                    ) : null}
                    <span className="line-clamp-1">{safeText(item.title)}</span>
                  </span>
                  <span className="line-clamp-2 text-xs text-atlas-muted">
                    {item.body}
                  </span>
                  <span className="text-[11px] text-atlas-muted">
                    {formatDateTime(item.createdAt)}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-xs text-atlas-muted">
                No tenés notificaciones todavía.
              </p>
            )}
          </div>
          <Link
            href="/internal/my-notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-atlas-border px-3 py-2.5 text-center text-xs font-semibold text-atlas-accent hover:bg-atlas-soft"
          >
            Ver todas
          </Link>
        </div>
      ) : null}
    </div>
  );
}
