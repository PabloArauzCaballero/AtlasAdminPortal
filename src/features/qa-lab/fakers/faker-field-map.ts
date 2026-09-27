/**
 * Qué dato del generador corresponde a cada campo del contrato, por NOMBRE.
 *
 * Todo dato de persona (nombre, correo, teléfono, carnet, fecha de nacimiento, dirección, GPS,
 * huella del dispositivo, ingresos, cuenta) sale del `caso` del mock; el generador local sólo pone
 * lo que no es de nadie (booleanos, identificadores, códigos, enums). La clave es el nombre en
 * minúsculas y sin separadores: `birth_date`, `birthDate` y `BirthDate` son el mismo campo.
 *
 * El valor es una ruta de marcador sin el prefijo `faker.`: `caso.persona.email`.
 */
const EXACT: Record<string, string> = {
  email: "caso.persona.email",
  correo: "caso.persona.email",
  identifier: "caso.persona.email",
  phone: "caso.persona.phone",
  phonenumber: "caso.persona.phone",
  mobile: "caso.persona.phone",
  msisdn: "caso.persona.phone",
  telefono: "caso.persona.phone",
  documentnumber: "caso.persona.documentNumber",
  nationalid: "caso.persona.documentNumber",
  ci: "caso.persona.documentNumber",
  documenttype: "caso.persona.documentType",
  documentcomplement: "caso.persona.documentComplement",
  documentextension: "caso.persona.documentExtension",
  firstname: "caso.persona.firstName",
  secondname: "caso.persona.secondName",
  middlename: "caso.persona.secondName",
  lastname: "caso.persona.lastName",
  secondlastname: "caso.persona.secondLastName",
  fullname: "caso.persona.fullName",
  name: "caso.persona.fullName",
  gender: "caso.persona.gender",
  birthdate: "caso.persona.birthDate",
  dateofbirth: "caso.persona.birthDate",
  age: "caso.persona.age",
  address: "caso.persona.address",
  addressline: "caso.persona.address",
  street: "caso.direccion.street",
  streetnumber: "caso.direccion.streetNumber",
  zone: "caso.direccion.zone",
  city: "caso.direccion.city",
  department: "caso.direccion.department",
  departmentcode: "caso.direccion.departmentCode",
  country: "caso.direccion.country",
  lat: "caso.direccion.latitude",
  latitude: "caso.direccion.latitude",
  lng: "caso.direccion.longitude",
  lon: "caso.direccion.longitude",
  longitude: "caso.direccion.longitude",
  device: "caso.dispositivo",
  devicefingerprinthash: "caso.dispositivo.deviceFingerprintHash",
  fingerprint: "caso.dispositivo.deviceFingerprintHash",
  fingerprintversion: "caso.dispositivo.fingerprintVersion",
  useragent: "caso.dispositivo.userAgent",
  snapshot: "caso.dispositivo.snapshot",
  employmenttype: "caso.perfilFinanciero.employmentType",
  employername: "caso.perfilFinanciero.employerName",
  yearsemployed: "caso.perfilFinanciero.yearsEmployed",
  income: "caso.perfilFinanciero.monthlyIncome",
  monthlyincome: "caso.perfilFinanciero.monthlyIncome",
  salary: "caso.perfilFinanciero.monthlyIncome",
  expenses: "caso.perfilFinanciero.monthlyExpenses",
  monthlyexpenses: "caso.perfilFinanciero.monthlyExpenses",
  bankcode: "caso.cuentaBancaria.bankCode",
  bankname: "caso.cuentaBancaria.bankName",
  accountnumber: "caso.cuentaBancaria.accountNumber",
  accounttype: "caso.cuentaBancaria.accountType",
  holdername: "caso.cuentaBancaria.holderName",
  amount: "monto.amount",
  monto: "monto.amount",
  currency: "monto.currency",
};

/** Objetos enteros: un campo `customer` de tipo objeto recibe la persona completa. */
const OBJECTS: Record<string, string> = {
  customer: "caso.persona",
  persona: "caso.persona",
  person: "caso.persona",
  address: "caso.direccion",
  direccion: "caso.direccion",
  device: "caso.dispositivo",
  financialprofile: "caso.perfilFinanciero",
  bankaccount: "caso.cuentaBancaria",
};

function keyOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function fakerPathForField(name: string, type: string): string | null {
  const key = keyOf(name);
  if (type === "object") return OBJECTS[key] ?? null;
  return EXACT[key] ?? null;
}

/** Ruta del contrato que corresponde a un campo marcado como roto por el mock (`persona.email`). */
export function contractFieldsForFakerField(fakerField: string): string[] {
  const target = `caso.${fakerField}`;
  return Object.entries(EXACT)
    .filter(([, path]) => path === target)
    .map(([key]) => key);
}

export function contractKey(name: string): string {
  return keyOf(name);
}
