import { describe, test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { login, logout, seed } from "../helpers";

const [A] = seed.codes;

describe("sale", { serial: true }, () => {
  test("dashboard lists the sale's orders in progress and the month report", async ({ app, screen }) => {
    await app.clearState();
    await login(screen, "sale1@local");
    await expect(screen.getByTestId("sale-dashboard")).toBeVisible();
    await expect(screen.getByTestId("ref-link")).toContainText("NVKD01");
    await screen.scrollUntilVisible(screen.getByTestId(`order-${A}`));
    await expect(screen.getByTestId("month-label")).toBeVisible();
  });

  test("an order opens read-only with its timeline", async ({ screen }) => {
    await screen.getByTestId(`order-${A}`).tap();
    await expect(screen.getByTestId(`order-detail-${A}`)).toBeVisible();
    await expect(screen.getByText("Chị Lan", { exact: false }).first()).toBeVisible();
    await screen.getByTestId("back-dashboard").tap();
    await expect(screen.getByTestId("sale-dashboard")).toBeVisible();
  });

  test("Tạo đơn: lookup an existing customer, pick a pack, place the order", async ({ screen }) => {
    await screen.getByTestId("tab-new").tap();
    await screen.getByTestId("lookup-phone").fill("0911000001");
    await screen.getByTestId("lookup-submit").tap();
    await expect(screen.getByTestId("lookup-note")).toContainText("Khách cũ");
    await expect(screen.getByDisplayValue("Chị Lan")).toBeVisible();
    await screen.scrollUntilVisible(screen.getByTestId("inc-1"));
    await screen.getByTestId("inc-1").tap();
    await screen.getByTestId("inc-1").tap();
    await expect(screen.getByLabel("Số lượng Hủ tiếu dai vắt Chu Hải - Cây 5 kg")).toHaveValue("2");
    await screen.scrollUntilVisible(screen.getByTestId("place-order"));
    await screen.getByTestId("place-order").tap();
    await screen.scrollUntilVisible(screen.getByText("Đã tạo đơn", { exact: false }));
  });

  test("Khách hàng: a customer's Tạo đơn opens the form looked up", async ({ screen }) => {
    await screen.getByTestId("tab-customers").tap();
    await screen.scrollUntilVisible(screen.getByTestId("customer-0911000002"));
    await screen.getByTestId("new-order-0911000002").tap();
    await expect(screen.getByTestId("sale-new-order")).toBeVisible();
    await expect(screen.getByDisplayValue("Anh Minh")).toBeVisible();
    await logout(screen);
  });
});
