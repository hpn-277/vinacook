import { describe, test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { confirm, login, logout, seed } from "../helpers";

// adb types ASCII only, so reasons are unaccented.

const [A, B, C] = seed.codes;

describe("driver", { serial: true }, () => {
  test("sees the three assigned orders and the load list", async ({ app, screen }) => {
    await app.clearState();
    await login(screen, "driver1@local");
    await expect(screen.getByTestId("driver-home")).toBeVisible();
    await expect(screen.getByTestId("load-list")).toBeVisible();
    for (const code of [A, B, C]) await screen.scrollUntilVisible(screen.getByTestId(`order-${code}`));
  });

  test("hands one order back with a reason", async ({ screen }) => {
    await screen.scrollUntilVisible(screen.getByTestId(`return-reason-${C}`));
    await screen.getByTestId(`return-reason-${C}`).fill("Xe hong");
    await screen.getByTestId(`return-${C}`).tap();
    await confirm(screen);
    await expect(screen.getByTestId(`order-${C}`)).toBeHidden();
  });

  test("confirms the rest loaded", async ({ screen }) => {
    await screen.scrollUntilVisible(screen.getByTestId("depart-all"), { direction: "up" });
    await screen.getByTestId("depart-all").tap();
    await confirm(screen);
    await expect(screen.getByText("Đã xác nhận 2 đơn lên xe")).toBeVisible();
    await screen.scrollUntilVisible(screen.getByTestId(`complete-${A}`));
  });

  test("completes one delivery and fails the other", async ({ screen }) => {
    await screen.getByTestId(`complete-${A}`).tap();
    await expect(screen.getByTestId(`complete-dialog-${A}`)).toBeVisible();
    await screen.getByTestId(`complete-confirm-${A}`).tap();
    await screen.scrollUntilVisible(screen.getByTestId(`delivered-${A}`));
    await screen.scrollUntilVisible(screen.getByTestId(`fail-reason-${B}`), { direction: "up" });
    await screen.getByTestId(`fail-reason-${B}`).fill("Khach vang nha");
    await screen.getByTestId(`fail-${B}`).tap();
    await expect(screen.getByTestId(`order-${B}`)).toBeHidden();
    await logout(screen);
  });
});
