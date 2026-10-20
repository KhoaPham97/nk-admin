import React from "react";
import { Button } from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { exportProductQuoteExcel } from "../utils/exportProductQuoteExcel";

const ExportProductQuoteButton = ({ selectedProducts = [] }) => {
  return (
    <Button
      variant="contained"
      color="success"
      startIcon={<FileDownloadIcon />}
      disabled={selectedProducts.length === 0}
      onClick={() => exportProductQuoteExcel(selectedProducts)}
    >
      Xuất báo giá Excel
      {selectedProducts.length > 0 ? ` (${selectedProducts.length})` : ""}
    </Button>
  );
};

export default ExportProductQuoteButton;
