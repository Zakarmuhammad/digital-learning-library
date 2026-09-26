import { describe, it, expect } from "vitest";
import { registerSchema } from "@/lib/validation";

describe("registration validation", () => {
  const validInput = {
    fullName: "Zainab Bello",
    email: "zainab@example.com",
    password: "correct-horse-battery",
    confirmPassword: "correct-horse-battery",
  };

  it("accepts valid input", () => {
    expect(registerSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects a missing full name", () => {
    const result = registerSchema.safeParse({ ...validInput, fullName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({ ...validInput, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a password under 8 characters", () => {
    const result = registerSchema.safeParse({ ...validInput, password: "short1", confirmPassword: "short1" });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched password confirmation", () => {
    const result = registerSchema.safeParse({ ...validInput, confirmPassword: "something-else-entirely" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path).toContain("confirmPassword");
    }
  });

  it("treats phone as optional", () => {
    const result = registerSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });
});
