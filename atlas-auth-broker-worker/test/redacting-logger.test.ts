import { RedactingLogger, redactContext } from '../src/observability/redacting-logger';

describe('redacción del contexto de log', () => {
  it('oculta campos con nombre sensible', () => {
    const redacted = redactContext({
      providerCode: 'SEGIP',
      clientSecret: 'no-debe-verse',
      api_key: 'tampoco',
      authorization: 'Bearer abc',
    });

    expect(redacted.providerCode).toBe('SEGIP');
    expect(redacted.clientSecret).toBe('[redactado]');
    expect(redacted.api_key).toBe('[redactado]');
    expect(redacted.authorization).toBe('[redactado]');
  });

  it('oculta un JWT aunque el campo se llame de forma inocente', () => {
    const jwt = `${'a'.repeat(20)}.${'b'.repeat(30)}.${'c'.repeat(40)}`;
    expect(redactContext({ detalle: jwt }).detalle).toBe('[redactado]');
  });

  it('oculta blobs opacos largos', () => {
    expect(redactContext({ nota: 'A'.repeat(64) }).nota).toBe('[redactado]');
  });

  it('conserva los campos publicables aunque su nombre parezca sensible', () => {
    const redacted = redactContext({
      tokenStatus: 'VALID',
      tokenExpiresAt: '2026-01-01T00:00:00.000Z',
      credentialFingerprint: 'ab12cd34ef567890',
    });

    expect(redacted.tokenStatus).toBe('VALID');
    expect(redacted.tokenExpiresAt).toBe('2026-01-01T00:00:00.000Z');
    expect(redacted.credentialFingerprint).toBe('ab12cd34ef567890');
  });

  it('redacta en profundidad y corta la recursión', () => {
    const redacted = redactContext({ nivel1: { nivel2: { clientSecret: 'x' } } });
    const nivel1 = redacted.nivel1 as Record<string, unknown>;
    const nivel2 = nivel1.nivel2 as Record<string, unknown>;
    expect(nivel2.clientSecret).toBe('[redactado]');
  });

  it('reduce un Error a nombre y mensaje, sin arrastrar propiedades adjuntas', () => {
    const error = Object.assign(new Error('fallo'), { clientSecret: 'filtrado' });
    expect(redactContext({ error }).error).toEqual({ name: 'Error', message: 'fallo' });
  });
});

describe('RedactingLogger', () => {
  it('emite JSON de una línea con nivel, evento y contexto redactado', () => {
    const lines: string[] = [];
    const logger = new RedactingLogger('test-service', (line) => lines.push(line));

    logger.error('provider_token_refresh_failed', { providerCode: 'SEGIP', clientSecret: 'x' });

    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;
    expect(parsed.level).toBe('error');
    expect(parsed.service).toBe('test-service');
    expect(parsed.event).toBe('provider_token_refresh_failed');
    expect(parsed.providerCode).toBe('SEGIP');
    expect(parsed.clientSecret).toBe('[redactado]');
  });
});
