import { createServer, type Server } from "node:http";

/**
 * Buzón que recoge el correo del segundo factor durante el E2E.
 *
 * El acceso de un administrador exige un PIN de seis dígitos que sale por correo. Una batería
 * automatizada no tiene buzón que leer, y la salida fácil —apagar `AUTH_LOGIN_PIN_ENABLED`
 * mientras corren las pruebas— deja la corrida en verde habiendo ejercitado un camino de acceso
 * que NO es el de producción: justo el tramo que más importa comprobar, y encima apagando un
 * control de seguridad para que el reloj no se agote.
 *
 * En su lugar se levanta aquí un servidor mínimo y se apunta el canal de correo del backend a él:
 *
 *   cd AtlasBackend
 *   docker compose -f docker-compose.yml -f docker-compose.pin-inbox.yml up -d api
 *   cd AtlasAdminPortal
 *   PW_PIN_INBOX_PORT=8791 yarn playwright test
 *   cd ../AtlasBackend && docker compose up -d api   # devuelve el correo a Gmail
 *
 * El PIN se lee por donde de verdad salió y **los dos pasos del acceso quedan ejercitados**.
 *
 * Sin `PW_PIN_INBOX_PORT` el andamiaje no inventa nada: si aparece la pantalla del PIN, el login
 * falla diciendo exactamente qué falta. Es deliberado — un E2E que se las arregla para entrar sin
 * ejercitar el segundo factor miente sobre lo que cubre.
 */

export const PUERTO_BUZON = Number(process.env.PW_PIN_INBOX_PORT ?? 0);
export const HAY_BUZON = PUERTO_BUZON > 0;

const SEIS_DIGITOS = /\b(\d{6})\b/;

interface CorreoRecibido {
  readonly to: string;
  readonly body: string;
  readonly recibidoEn: number;
}

export class BuzonPin {
  private readonly correos: CorreoRecibido[] = [];
  private servidor: Server | null = null;

  async abrir(puerto: number = PUERTO_BUZON): Promise<void> {
    this.servidor = createServer((peticion, respuesta) => {
      if (peticion.method !== "POST") {
        respuesta.writeHead(405).end();
        return;
      }
      const trozos: Buffer[] = [];
      peticion.on("data", (trozo: Buffer) => trozos.push(trozo));
      peticion.on("end", () => {
        try {
          const cuerpo = JSON.parse(Buffer.concat(trozos).toString("utf8")) as {
            to?: string;
            body?: string;
          };
          this.correos.push({
            to: cuerpo.to ?? "",
            body: cuerpo.body ?? "",
            recibidoEn: Date.now(),
          });
        } catch {
          /* Un cuerpo ilegible no es un PIN: se ignora y la espera acabará agotándose. */
        }
        respuesta.writeHead(200, { "content-type": "application/json" });
        respuesta.end(JSON.stringify({ id: "buzon-e2e" }));
      });
    });
    await new Promise<void>((resolver) =>
      this.servidor?.listen(puerto, resolver),
    );
  }

  async cerrar(): Promise<void> {
    await new Promise<void>((resolver) => {
      if (!this.servidor) return resolver();
      this.servidor.close(() => resolver());
    });
    this.servidor = null;
  }

  /** Descarta lo anterior: un PIN de un intento previo ya no sirve y confundiría al siguiente. */
  vaciar(): void {
    this.correos.length = 0;
  }

  /**
   * Espera el PIN dirigido a un correo concreto.
   *
   * Sondea en vez de bloquear en el servidor porque el correo llega mientras el navegador ya está
   * en la pantalla del código: las dos cosas ocurren en paralelo y no hay orden garantizado.
   */
  async esperarPin(
    destinatario: string,
    tiempoMaximoMs = 60_000,
  ): Promise<string> {
    const limite = Date.now() + tiempoMaximoMs;
    while (Date.now() < limite) {
      const correo = this.correos.find(
        (candidato) =>
          candidato.to.toLowerCase() === destinatario.toLowerCase() &&
          SEIS_DIGITOS.test(candidato.body),
      );
      const encontrado = correo?.body.match(SEIS_DIGITOS)?.[1];
      if (encontrado) return encontrado;
      await new Promise((resolver) => setTimeout(resolver, 250));
    }
    throw new Error(
      `No llegó ningún correo con PIN para ${destinatario} en ${tiempoMaximoMs / 1000} s. ` +
        "Comprueba que el backend corre con NOTIFICATION_EMAIL_PROVIDER=webhook y " +
        `NOTIFICATION_EMAIL_WEBHOOK_URL=http://host.docker.internal:${PUERTO_BUZON}/correo ` +
        "(docker-compose.pin-inbox.yml de AtlasBackend).",
    );
  }
}
