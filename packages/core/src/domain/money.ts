const vnd = new Intl.NumberFormat("vi-VN");

export function formatVnd(amount: number): string {
  return `${vnd.format(amount)}đ`;
}

export function formatKg(kg: number): string {
  return `${vnd.format(kg)} kg`;
}
