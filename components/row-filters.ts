/** Every row filter on the orders table is a <select data-row-filter="<row data key>">; a row shows only if it matches all of them. */
export function applyRowFilters() {
  const filters = [...document.querySelectorAll<HTMLSelectElement>("select[data-row-filter]")].filter((s) => s.value !== "");
  for (const row of document.querySelectorAll<HTMLTableRowElement>("tr[data-order-code]")) {
    row.hidden = filters.some((s) => row.dataset[s.dataset.rowFilter!] !== s.value);
  }
}

export const NO_DRIVER = "none";
