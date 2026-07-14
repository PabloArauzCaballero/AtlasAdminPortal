"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/query-keys";
import type { QueryParams } from "@/shared/api/types";
import {
  getMyUnreadNotificationsCount,
  listMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from "./services";

export function useMyNotifications(
  query: QueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.myNotifications(query),
    queryFn: () => listMyNotifications(query),
    enabled: options?.enabled ?? true,
  });
}

export function useMyUnreadNotificationsCount() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.myNotificationsUnreadCount,
    queryFn: () => getMyUnreadNotificationsCount(),
    // Refresco periódico: es la única señal en el portal de que llegó una alerta nueva
    // (servicio caído, broadcast de admin) sin que el usuario tenga que recargar la página.
    // 30s para ir al mismo ritmo que el polling de salud de herramientas.
    refetchInterval: 30_000,
  });

  // Si llegó una notificación nueva (posible alerta de servicio caído/recuperado),
  // refresca la salud de herramientas para que la campana y la vista de estado
  // nunca cuenten historias distintas.
  const previousUnread = useRef<number | null>(null);
  const unread = query.data?.unread;
  useEffect(() => {
    if (typeof unread !== "number") return;
    if (previousUnread.current !== null && unread > previousUnread.current) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.toolsHealth });
      void queryClient.invalidateQueries({
        queryKey: ["my-notifications"],
        exact: false,
      });
    }
    previousUnread.current = unread;
  }, [unread, queryClient]);

  return query;
}

function useInvalidateMyNotifications() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["my-notifications"] }),
    ]);
}

export function useMarkMyNotificationReadMutation() {
  const invalidate = useInvalidateMyNotifications();
  return useMutation({
    mutationFn: (notificationId: string) =>
      markMyNotificationRead(notificationId),
    onSuccess: () => invalidate(),
  });
}

export function useMarkAllMyNotificationsReadMutation() {
  const invalidate = useInvalidateMyNotifications();
  return useMutation({
    mutationFn: () => markAllMyNotificationsRead(),
    onSuccess: () => invalidate(),
  });
}
