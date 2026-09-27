import type { FakerContext } from "@/features/qa-lab/fakers/faker-types";

/**
 * Casos con la MISMA forma que devuelve `POST /mock/fakers/caso` (+ `monto`). Son datos de prueba
 * de la prueba: el código del Lab nunca los escribe a mano, los pide al mock.
 */
export function fakeCase(
  index = 0,
  extra: Partial<FakerContext> = {},
): FakerContext {
  return {
    caso: {
      persona: {
        firstName: `Nombre${index}`,
        secondName: "",
        lastName: `Apellido${index}`,
        secondLastName: "",
        fullName: `Nombre${index} Apellido${index}`,
        gender: "F",
        birthDate: "1990-05-1" + String(index % 10),
        age: 35,
        documentType: "CI",
        documentNumber: String(1000000 + index),
        documentComplement: "",
        documentExtension: "LP",
        phone: `+5917000000${index % 10}`,
        phoneOperator: "Entel",
        email: `persona${index}@qa.atlas.test`,
        city: "La Paz",
        department: "La Paz",
        address: "Av. Siempre Viva 742",
      },
      direccion: {
        street: "Av. Siempre Viva",
        streetNumber: "742",
        zone: "Sopocachi",
        city: "La Paz",
        department: "La Paz",
        departmentCode: "LP",
        country: "BO",
        latitude: -16.5 - index / 100,
        longitude: -68.1,
      },
      dispositivo: {
        deviceFingerprintHash: "a".repeat(63) + String(index % 10),
        fingerprintVersion: "v1",
        channel: "mobile_app",
        userAgent: "AtlasApp/1.0 (Android 14)",
        snapshot: { brand: "Samsung", isRooted: false },
      },
      perfilFinanciero: {
        employmentType: "dependiente",
        employerName: "Empresa QA",
        yearsEmployed: 3,
        monthlyIncome: 4000 + index,
        monthlyExpenses: 2000,
        currency: "BOB",
      },
      cuentaBancaria: {
        bankCode: "BNB",
        bankName: "Banco QA",
        accountType: "caja_ahorro",
        accountNumber: "1234567890",
        currency: "BOB",
        holderName: `Nombre${index} Apellido${index}`,
      },
    },
    monto: { amount: 150.5 + index, currency: "BOB" },
    ...extra,
  };
}

export function fakeCases(count: number): FakerContext[] {
  return Array.from({ length: count }, (_, index) => fakeCase(index));
}
