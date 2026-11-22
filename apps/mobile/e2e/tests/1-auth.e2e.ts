import { describe, test } from "@e2e-dev/mobile";
import { expect } from "e2e";
import { login, logout } from "../helpers";

describe("auth", { serial: true }, () => {
  test("wrong password shows the API's message", async ({ app, screen }) => {
    await app.clearState();
    await screen.getByTestId("login-email").fill("sale1@local");
    await screen.getByTestId("login-password").fill("wrong-password");
    await screen.getByTestId("login-submit").tap();
    await expect(screen.getByText("Sai email hoặc mật khẩu")).toBeVisible();
  });

  test("forgot password answers without revealing accounts", async ({ screen }) => {
    await screen.getByText("Quên mật khẩu?").tap();
    await screen.getByTestId("reset-email").fill("nobody@example.com");
    await screen.getByTestId("reset-submit").tap();
    await expect(screen.getByText("Nếu email này có tài khoản, link đặt lại mật khẩu đã được gửi. Kiểm tra hộp thư (cả mục Spam).")).toBeVisible();
    await screen.getByText("Quay lại đăng nhập").tap();
  });

  test("a sale lands on Tổng quan, the session survives a restart, and logout clears it", async ({ app, screen }) => {
    await login(screen, "sale1@local");
    await expect(screen.getByTestId("sale-dashboard")).toBeVisible();
    await app.restart();
    await expect(screen.getByTestId("sale-dashboard")).toBeVisible();
    await logout(screen);
  });
});
