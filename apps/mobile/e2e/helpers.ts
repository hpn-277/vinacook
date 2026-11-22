import { readFileSync } from "node:fs";
import { expect } from "e2e";
import type { Screen } from "e2e";

export const seed = JSON.parse(readFileSync(new URL(".seed.json", import.meta.url), "utf8")) as { date: string; codes: string[] };

export async function login(screen: Screen, email: string) {
  await screen.getByTestId("login-email").fill(email);
  await screen.getByTestId("login-password").fill("password123");
  await screen.getByTestId("login-submit").tap();
}

/** Answers ConfirmButton's native dialog. */
export async function confirm(screen: Screen) {
  await screen.getByRole("button", /^xác nhận$/i).tap();
}

export async function logout(screen: Screen) {
  await screen.getByRole("button", "Đăng xuất").tap();
  await expect(screen.getByTestId("login-submit")).toBeVisible();
}
