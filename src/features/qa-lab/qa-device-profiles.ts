export type QaDeviceProfileKey =
  | "none"
  | "android_normal"
  | "iphone_normal"
  | "tablet_android"
  | "desktop_web"
  | "emulator"
  | "rooted_jailbroken"
  | "vpn_detected"
  | "proxy_datacenter_ip"
  | "no_gps"
  | "gps_outside_bolivia"
  | "new_device_never_seen"
  | "device_shared_multiple_accounts"
  | "sim_swap_recent"
  | "outdated_os"
  | "poor_connectivity"
  | "bot_like_client";

export type QaDeviceProfile = {
  key: QaDeviceProfileKey;
  label: string;
  description: string;
  headers: Record<string, string>;
};

export const QA_DEVICE_PROFILES: QaDeviceProfile[] = [
  {
    key: "none",
    label: "Sin simulación (web/admin)",
    description:
      "No agrega headers de dispositivo; request de cliente web estándar.",
    headers: {},
  },
  {
    key: "android_normal",
    label: "Android normal",
    description: "Dispositivo físico Android, señales normales.",
    headers: {
      "x-client-channel": "mobile_app",
      "x-device-platform": "android",
      "x-device-emulator": "false",
      "x-device-rooted": "false",
    },
  },
  {
    key: "iphone_normal",
    label: "iPhone normal",
    description: "Dispositivo físico iOS, señales normales.",
    headers: {
      "x-client-channel": "mobile_app",
      "x-device-platform": "ios",
      "x-device-emulator": "false",
      "x-device-rooted": "false",
    },
  },
  {
    key: "emulator",
    label: "Emulador",
    description:
      "Simula un emulador/simulador detectado — útil para reglas anti-fraude.",
    headers: {
      "x-client-channel": "mobile_app",
      "x-device-platform": "android",
      "x-device-emulator": "true",
    },
  },
  {
    key: "rooted_jailbroken",
    label: "Root / Jailbreak",
    description:
      "Simula un dispositivo comprometido (root/jailbreak detectado).",
    headers: {
      "x-client-channel": "mobile_app",
      "x-device-rooted": "true",
    },
  },
  {
    key: "vpn_detected",
    label: "VPN detectada",
    description: "Simula tráfico saliendo de una VPN/proxy conocido.",
    headers: {
      "x-client-channel": "mobile_app",
      "x-network-vpn-detected": "true",
    },
  },
  {
    key: "no_gps",
    label: "Sin GPS",
    description: "Simula ausencia de permisos/señal de geolocalización.",
    headers: {
      "x-client-channel": "mobile_app",
      "x-location-available": "false",
    },
  },
  {
    key: "gps_outside_bolivia",
    label: "GPS fuera de Bolivia",
    description:
      "Simula geolocalización fuera del país para reglas de riesgo geográfico.",
    headers: {
      "x-client-channel": "mobile_app",
      "x-location-available": "true",
      "x-location-country": "US",
    },
  },
  {
    key: "tablet_android",
    label: "Tablet Android",
    description: "Tablet Android físico, señales normales.",
    headers: {
      "x-client-channel": "mobile_app",
      "x-device-platform": "android",
      "x-device-form-factor": "tablet",
      "x-device-emulator": "false",
    },
  },
  {
    key: "desktop_web",
    label: "Escritorio web (no app)",
    description:
      "Simula un cliente de navegador de escritorio en vez de la app móvil.",
    headers: {
      "x-client-channel": "web_app",
      "x-device-platform": "web",
    },
  },
  {
    key: "proxy_datacenter_ip",
    label: "IP de datacenter / proxy",
    description:
      "Simula tráfico saliendo de una IP de datacenter/hosting (señal típica de fraude, distinta de VPN residencial).",
    headers: {
      "x-client-channel": "mobile_app",
      "x-network-datacenter-ip": "true",
    },
  },
  {
    key: "new_device_never_seen",
    label: "Dispositivo nunca visto",
    description:
      "Simula el primer contacto de este fingerprint con la plataforma (sin historial).",
    headers: {
      "x-client-channel": "mobile_app",
      "x-device-first-seen": "true",
    },
  },
  {
    key: "device_shared_multiple_accounts",
    label: "Dispositivo con múltiples cuentas",
    description:
      "Simula un dispositivo ya vinculado a otras cuentas — útil para reglas de reuso/anillo de fraude.",
    headers: {
      "x-client-channel": "mobile_app",
      "x-device-shared-accounts": "true",
    },
  },
  {
    key: "sim_swap_recent",
    label: "SIM swap reciente",
    description:
      "Simula un cambio de SIM detectado poco antes de la sesión — señal de riesgo alto en KYC/onboarding.",
    headers: {
      "x-client-channel": "mobile_app",
      "x-device-sim-swap-recent": "true",
    },
  },
  {
    key: "outdated_os",
    label: "Sistema operativo desactualizado",
    description:
      "Simula un dispositivo con OS/webview desactualizado o potencialmente vulnerable.",
    headers: {
      "x-client-channel": "mobile_app",
      "x-device-os-outdated": "true",
    },
  },
  {
    key: "poor_connectivity",
    label: "Conectividad pobre / alta latencia",
    description:
      "Simula una sesión con red inestable — útil para probar timeouts y reintentos del lado del cliente.",
    headers: {
      "x-client-channel": "mobile_app",
      "x-network-quality": "poor",
    },
  },
  {
    key: "bot_like_client",
    label: "Cliente tipo bot / automatizado",
    description:
      "Simula tráfico sin las señales típicas de un dispositivo móvil real — útil para reglas anti-bot.",
    headers: {
      "x-client-automated": "true",
    },
  },
];

export function getQaDeviceProfile(key?: string): QaDeviceProfile {
  return (
    QA_DEVICE_PROFILES.find((profile) => profile.key === key) ??
    QA_DEVICE_PROFILES[0]
  );
}
