import { shopeeApi } from "./shopeeApi";

const encode = (value) => encodeURIComponent(String(value ?? ""));

export const shopeeReturnApi = {
  // =========================================
  // ĐỒNG BỘ HÀNG HOÀN TỪ SHOPEE
  // =========================================

  syncReturns: (data = {}) =>
    shopeeApi.postReturnSync
      ? shopeeApi.postReturnSync(data)
      : shopeeApi.syncReturns(data),

  // =========================================
  // DANH SÁCH HÀNG HOÀN
  // =========================================

  getReturns: (params = {}) => shopeeApi.getReturns(params),

  // =========================================
  // CHI TIẾT HÀNG HOÀN
  // =========================================

  getReturnDetail: (returnSn, params = {}) =>
    shopeeApi.getReturnDetail(returnSn, params),

  // =========================================
  // XÁC NHẬN ĐÃ NHẬN HÀNG HOÀN
  // Không cộng tồn kho ở bước này
  // =========================================

  receiveReturn: (returnSn, data = {}) =>
    shopeeApi.receiveShopeeReturn(returnSn, data),

  // =========================================
  // KIỂM TRA HÀNG HOÀN
  // Nhập số lượng tốt và hư hỏng
  // Không cộng tồn kho ở bước này
  // =========================================

  inspectReturn: (returnSn, data = {}) =>
    shopeeApi.inspectShopeeReturn(returnSn, data),

  // =========================================
  // XỬ LÝ TỒN KHO
  //
  // resolution:
  // RESTOCK    = Lưu kho
  // NO_RESTOCK = Không lưu kho
  // =========================================

  resolveReturnStock: (returnSn, data = {}) =>
    shopeeApi.resolveShopeeReturn(returnSn, data),
};

export default shopeeReturnApi;
