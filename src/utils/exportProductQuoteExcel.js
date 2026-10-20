import * as XLSX from "xlsx";

const toPrice = (value) => {
  if (typeof value === "number") return value;

  // Hỗ trợ giá dạng chuỗi "45.000" hoặc "45000"
  const normalized = String(value ?? "")
    .replace(/[^\d,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const price = Number(normalized);

  return Number.isFinite(price) ? price : 0;
};

export const exportProductQuoteExcel = (selectedProducts) => {
  if (!Array.isArray(selectedProducts) || selectedProducts.length === 0) {
    alert("Vui lòng chọn ít nhất một sản phẩm để xuất báo giá");
    return;
  }

  const rows = selectedProducts.map((product, index) => ({
    STT: index + 1,
    "Mã sản phẩm":
      product.code ?? product.productCode ?? product.product_code ?? "",
    "Tên sản phẩm": product.title ?? product.name ?? "",
    "Đơn vị": product.unit ?? "",
    "Đơn giá (VNĐ)": toPrice(product.price),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Độ rộng các cột
  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 42 },
    { wch: 12 },
    { wch: 20 },
  ];

  // Định dạng giá tiền
  for (let row = 2; row <= rows.length + 1; row++) {
    const cell = worksheet[`E${row}`];

    if (cell) {
      cell.t = "n";
      cell.z = '#,##0 "VNĐ"';
    }
  }

  // Tạo workbook
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Báo giá");

  // Tên file theo ngày xuất
  const date = new Date().toISOString().slice(0, 10);

  XLSX.writeFile(workbook, `Nhat-Khang-Bike-Bao-Gia-${date}.xlsx`);
};
