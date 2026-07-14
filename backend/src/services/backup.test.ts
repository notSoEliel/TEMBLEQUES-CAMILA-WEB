import { describe, expect, it } from "vitest";
import { buildIsolatedMongoUri, decryptBackup, encryptBackup } from "./backup.js";

const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("backup cifrado", () => {
  it("cifra y recupera documentos BSON sin exponerlos en texto plano", () => {
    const data = { collections: { users: [{ _id: "user-1", name: "Camila" }] } };
    const backup = encryptBackup(data, key);
    expect(backup.payload).not.toContain("Camila");
    expect(decryptBackup(backup, key)).toEqual(data);
  });

  it("rechaza claves con tamaño incorrecto", () => {
    expect(() => encryptBackup({}, "short")).toThrow("BACKUP_ENCRYPTION_KEY debe ser");
  });

  it("construye una URI de restauración sin modificar credenciales ni parámetros", () => {
    expect(buildIsolatedMongoUri(
      "mongodb://user:password@mongodb.railway.internal:27017?authSource=admin",
      "tembleques_restore",
    )).toBe("mongodb://user:password@mongodb.railway.internal:27017/tembleques_restore?authSource=admin");
  });
});
