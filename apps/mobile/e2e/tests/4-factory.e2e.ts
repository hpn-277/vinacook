import { describe, test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { login, logout, seed } from "../helpers";

describe("factory", { serial: true }, () => {
  test("Hôm nay shows the closed day's job for its product", async ({ app, screen }) => {
    await app.clearState();
    await login(screen, "factory1@local");
    await expect(screen.getByTestId("factory-today")).toBeVisible();
    await expect(screen.getByTestId(`factory-day-${seed.date}`)).toBeVisible();
    // The sale test placed tomorrow's order for the same product, so it also shows as tomorrow's draft.
    await expect(screen.getByText("Hủ tiếu dai vắt Chu Hải").first()).toBeVisible();
    await expect(screen.getByTestId(`day-total-${seed.date}`)).toHaveText("30 kg");
  });

  test("Tổng quan tháng steps between months", async ({ screen }) => {
    await screen.getByTestId("tab-overview").tap();
    await expect(screen.getByTestId("factory-overview")).toBeVisible();
    const label = await screen.getByTestId("month-label").textContent();
    await screen.getByTestId("month-prev").tap();
    await expect(screen.getByTestId("month-label")).not.toHaveText(label ?? "");
    await screen.getByTestId("month-next").tap();
    await expect(screen.getByTestId("month-label")).toHaveText(label ?? "");
  });

  test("Sản phẩm: propose a product for review", async ({ screen }) => {
    await screen.getByTestId("tab-products").tap();
    await expect(screen.getByTestId("factory-products")).toBeVisible();
    await screen.getByTestId("add-product").tap();
    await expect(screen.getByTestId("product-form-new")).toBeVisible();
    await screen.getByTestId("product-name").fill("Banh canh thu");
    await screen.getByTestId("product-price").fill("20000");
    await screen.getByTestId("product-submit").tap();
    await expect(screen.getByText("Đã gửi sản phẩm, chờ quản lý duyệt")).toBeVisible();
    await screen.scrollUntilVisible(screen.getByText("Banh canh thu"));
    await logout(screen);
  });
});
