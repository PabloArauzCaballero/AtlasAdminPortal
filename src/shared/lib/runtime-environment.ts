export function getRuntimeEnvironmentLabel() {
  const configured = process.env.NEXT_PUBLIC_ATLAS_ENVIRONMENT?.trim();
  return configured && configured.length > 0 ? configured : "local";
}

export function getServiceOriginLabel() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!baseUrl) return "servicio local";
  try {
    return new URL(baseUrl).host;
  } catch {
    return "servicio configurado";
  }
}
