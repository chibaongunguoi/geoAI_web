import { PasswordHasher } from "./password-hasher";

describe("PasswordHasher", () => {
  it("when comparing the original password with its hash, returns true", async () => {
    const hasher = new PasswordHasher();

    const hash = await hasher.hash("StrongPass123!");

    await expect(hasher.verify("StrongPass123!", hash)).resolves.toBe(true);
  });

  it("when comparing a different password with the hash, returns false", async () => {
    const hasher = new PasswordHasher();

    const hash = await hasher.hash("StrongPass123!");

    await expect(hasher.verify("WrongPass123!", hash)).resolves.toBe(false);
  });
});
