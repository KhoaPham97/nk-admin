import React, { useCallback, useEffect, useState } from "react";
import { Search, Plus, RefreshCw, Trash2, Link2, Wand2 } from "lucide-react";
import { shopeeApi } from "../../services/shopeeApi";
import "./shopee-components.css";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3001/api"
).replace(/\/+$/, "");

function getToken() {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

/**
 * Lấy mảng dữ liệu từ nhiều kiểu response API:
 * - [...]
 * - { shops: [...] }
 * - { data: [...] }
 * - { data: { shops: [...] } }
 * - { success: true, data: { shops: [...] } }
 */
function extractArray(response, keys = []) {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== "object") return [];

  for (const key of keys) {
    if (Array.isArray(response[key])) {
      return response[key];
    }
  }

  if (response.data) {
    const result = extractArray(response.data, keys);
    if (result.length > 0) return result;
  }

  if (response.result) {
    const result = extractArray(response.result, keys);
    if (result.length > 0) return result;
  }

  return [];
}

/**
 * Chỉ lấy ID gian hàng thực tế của Shopee.
 * Không sử dụng _id MongoDB làm shopId.
 */
function getShopeeShopId(shop) {
  const id =
    shop?.shopId ??
    shop?.shop_id ??
    shop?.shop?.shopId ??
    shop?.shop?.shop_id ??
    shop?.shopInfo?.shop_id;

  return id !== undefined && id !== null ? String(id) : "";
}

function getShopeeShopName(shop) {
  return (
    shop?.shopName ||
    shop?.shop_name ||
    shop?.shop?.shop_name ||
    shop?.shopInfo?.shop_name ||
    `Gian hàng ${getShopeeShopId(shop)}`
  );
}

async function searchProducts(keyword) {
  const query = new URLSearchParams({
    search: keyword,
    page: "1",
    limit: "50",
  });

  const response = await fetch(`${API_BASE}/products?${query}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Không tìm được sản phẩm");
  }

  return extractArray(data, ["products", "results"]);
}

const initialForm = {
  shopId: "",
  itemId: "",
  variationSku: "",
  productId: "",
  variantCode: "",
  variantName: "",
  quantityMultiplier: 1,
  allowStockDeduction: true,
};

export default function ShopeeSkuMappings({ onRefresh }) {
  const [mappings, setMappings] = useState([]);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);

  const [keyword, setKeyword] = useState("");
  const [shopId, setShopId] = useState("");

  const [loading, setLoading] = useState(false);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [productKeyword, setProductKeyword] = useState("");
  const [searchingProducts, setSearchingProducts] = useState(false);

  // =====================================================
  // 1. TẢI DANH SÁCH GIAN HÀNG
  // =====================================================

  const loadShops = useCallback(async () => {
    setShopsLoading(true);
    setError("");

    try {
      const response = await shopeeApi.getShops();

      console.log("[Shopee] Shops API response:", response);

      const shopList = extractArray(response, ["shops", "shopList", "results"]);

      // Chỉ giữ các gian hàng có shopId Shopee hợp lệ.
      const validShops = shopList.filter((shop) => getShopeeShopId(shop));

      setShops(validShops);

      // Nếu chỉ có một gian hàng thì tự chọn.
      if (validShops.length === 1) {
        const onlyShopId = getShopeeShopId(validShops[0]);
        setShopId(onlyShopId);
      }

      // Nếu shop hiện tại không còn trong danh sách thì bỏ chọn.
      if (validShops.length === 0) {
        setShopId("");
      } else {
        setShopId((current) => {
          if (
            current &&
            validShops.some((shop) => getShopeeShopId(shop) === String(current))
          ) {
            return current;
          }

          return validShops.length === 1 ? getShopeeShopId(validShops[0]) : "";
        });
      }
    } catch (e) {
      console.error("[Shopee] Load shops error:", e);
      setError(e.message || "Không tải được danh sách gian hàng");
      setShops([]);
    } finally {
      setShopsLoading(false);
    }
  }, []);

  // =====================================================
  // 2. TẢI DANH SÁCH ÁNH XẠ SKU
  // =====================================================

  const loadMappings = useCallback(async () => {
    // Chưa chọn shop thì không gọi API.
    if (!shopId) {
      setMappings([]);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await shopeeApi.getSkuMappings({
        page: 1,
        limit: 100,
        search: keyword.trim(),
        shopId: String(shopId),
      });

      const list = extractArray(response, ["mappings", "results"]);

      setMappings(list);
    } catch (e) {
      console.error("[Shopee] Load mappings error:", e);
      setError(e.message || "Không tải được danh sách ánh xạ");
      setMappings([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, shopId]);

  // Tải gian hàng khi mở trang.
  useEffect(() => {
    loadShops();
  }, [loadShops]);

  // Khi chọn shop hoặc thay đổi bộ lọc thì tải lại ánh xạ.
  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  // =====================================================
  // 3. FORM
  // =====================================================

  const update = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const findProducts = async () => {
    if (!productKeyword.trim()) {
      setError("Vui lòng nhập tên hoặc mã sản phẩm.");
      return;
    }

    setSearchingProducts(true);
    setError("");

    try {
      const list = await searchProducts(productKeyword);
      setProducts(list);
    } catch (e) {
      setError(e.message || "Không tìm được sản phẩm");
    } finally {
      setSearchingProducts(false);
    }
  };

  const selectProduct = (product) => {
    update("productId", product._id);
    update("productTitle", product.title || product.name || "");

    setProducts([]);
    setProductKeyword(product.title || product.name || "");
  };

  const openCreate = () => {
    setEditing(null);

    setForm({
      ...initialForm,
      shopId: shopId || "",
    });

    setProductKeyword("");
    setProducts([]);
    setShowForm(true);
  };

  const openEdit = (mapping) => {
    setEditing(mapping);

    const mappingProduct =
      mapping.productId && typeof mapping.productId === "object"
        ? mapping.productId
        : null;

    setForm({
      shopId: String(mapping.shopId || ""),
      itemId: String(mapping.itemId || ""),
      variationSku: mapping.variationSku || "",
      productId: mappingProduct?._id || mapping.productId || "",
      variantCode: mapping.variantCode || "",
      variantName: mapping.variantName || "",
      quantityMultiplier: mapping.quantityMultiplier || 1,
      allowStockDeduction: mapping.allowStockDeduction !== false,
      productTitle: mappingProduct?.title || mapping.productTitle || "",
    });

    setProductKeyword(mappingProduct?.title || mapping.productTitle || "");

    setProducts([]);
    setShowForm(true);
  };

  // =====================================================
  // 4. LƯU ÁNH XẠ
  // =====================================================

  const save = async (e) => {
    e.preventDefault();

    setError("");
    setNotice("");

    if (!form.shopId) {
      setError("Vui lòng chọn shop Shopee.");
      return;
    }

    if (!form.productId) {
      setError("Vui lòng chọn sản phẩm trong kho.");
      return;
    }

    if (!form.itemId.trim()) {
      setError("Vui lòng nhập Item ID.");
      return;
    }

    if (!form.variantCode.trim() && !form.variantName.trim()) {
      setError("Vui lòng nhập Variant Code hoặc Variant Name.");
      return;
    }

    const payload = {
      ...form,
      shopId: String(form.shopId),
      itemId: String(form.itemId).trim(),
      variationSku: String(form.variationSku || "").trim(),
      variantCode: String(form.variantCode || "").trim(),
      variantName: String(form.variantName || "").trim(),
      quantityMultiplier: Number(form.quantityMultiplier),
    };

    delete payload.productTitle;

    if (
      !Number.isFinite(payload.quantityMultiplier) ||
      payload.quantityMultiplier < 1
    ) {
      setError("Hệ số số lượng phải lớn hơn hoặc bằng 1.");
      return;
    }

    try {
      if (editing) {
        await shopeeApi.updateSkuMapping(editing._id, payload);
        setNotice("Đã cập nhật ánh xạ SKU.");
      } else {
        await shopeeApi.createSkuMapping(payload);
        setNotice("Đã tạo ánh xạ SKU.");
      }

      setShowForm(false);
      await loadMappings();
      onRefresh?.();
    } catch (e) {
      setError(e.message || "Không lưu được ánh xạ SKU");
    }
  };

  // =====================================================
  // 5. XÓA ÁNH XẠ
  // =====================================================

  const remove = async (mapping) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa ánh xạ này?")) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await shopeeApi.deleteSkuMapping(mapping._id);

      setNotice("Đã xóa ánh xạ.");
      await loadMappings();
    } catch (e) {
      setError(e.message || "Không xóa được ánh xạ");
    }
  };

  // =====================================================
  // 6. TỰ ĐỘNG GỢI Ý ÁNH XẠ
  // =====================================================

  const autoMatch = async () => {
    if (!shops.length) {
      setError("Chưa có gian hàng Shopee.");
      return;
    }

    if (!shopId) {
      setError("Vui lòng chọn shop Shopee trước khi chạy tự động.");
      return;
    }

    if (!window.confirm("Chạy tự động gợi ý ánh xạ SKU?")) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const response = await shopeeApi.autoMatchSkuMappings({
        shopId,
      });

      setNotice(response?.message || "Đã chạy gợi ý ánh xạ.");

      await loadMappings();
    } catch (e) {
      setError(e.message || "Không chạy được gợi ý ánh xạ");
    }
  };

  // =====================================================
  // 7. RENDER
  // =====================================================

  return (
    <section className="sc-section">
      <div className="sc-toolbar">
        <div>
          <h3>Ánh xạ SKU Shopee</h3>
          <p>
            Liên kết SKU/Model SKU trên Shopee với sản phẩm và biến thể trong
            kho.
          </p>
        </div>

        <div className="sc-actions">
          <button
            type="button"
            className="sc-btn sc-btn-light"
            onClick={loadShops}
            disabled={shopsLoading}
          >
            <RefreshCw size={16} />
            {shopsLoading ? "Đang tải..." : "Tải gian hàng"}
          </button>

          <button
            type="button"
            className="sc-btn sc-btn-light"
            onClick={autoMatch}
            disabled={!shopId}
          >
            <Wand2 size={16} />
            Gợi ý tự động
          </button>

          <button
            type="button"
            className="sc-btn sc-btn-primary"
            onClick={openCreate}
            disabled={!shops.length}
          >
            <Plus size={16} />
            Thêm ánh xạ
          </button>
        </div>
      </div>

      {error && <div className="sc-alert sc-alert-error">{error}</div>}

      {notice && <div className="sc-alert sc-alert-success">{notice}</div>}

      <div className="sc-filter-grid sc-mapping-filters">
        <label>
          Gian hàng
          <select
            value={shopId}
            disabled={shopsLoading}
            onChange={(e) => setShopId(e.target.value)}
          >
            <option value="">
              {shopsLoading
                ? "Đang tải gian hàng..."
                : shops.length
                  ? "Tất cả gian hàng"
                  : "Chưa tìm thấy gian hàng"}
            </option>

            {shops.map((shop) => {
              const id = getShopeeShopId(shop);

              return (
                <option key={id} value={id}>
                  {getShopeeShopName(shop)}
                </option>
              );
            })}
          </select>
          {!shopsLoading && shops.length === 0 && (
            <small>
              API chưa trả về shopId hợp lệ. Kiểm tra response trong Console.
            </small>
          )}
        </label>

        <label className="sc-search-field">
          Tìm SKU / Model SKU / mã sản phẩm
          <div className="sc-input-icon">
            <Search size={16} />

            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadMappings();
              }}
              placeholder="Nhập từ khóa..."
            />
          </div>
        </label>

        <button
          type="button"
          className="sc-btn sc-btn-dark sc-filter-button"
          onClick={loadMappings}
        >
          <Search size={16} />
          Tìm kiếm
        </button>
      </div>

      <div className="sc-table-wrap">
        <table className="sc-table">
          <thead>
            <tr>
              <th>SKU / Item ID</th>
              <th>Sản phẩm kho</th>
              <th>Biến thể</th>
              <th>Hệ số</th>
              <th>Trừ kho</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="sc-table-empty">
                  Đang tải...
                </td>
              </tr>
            ) : mappings.length === 0 ? (
              <tr>
                <td colSpan="7" className="sc-table-empty">
                  Chưa có ánh xạ SKU.
                </td>
              </tr>
            ) : (
              mappings.map((item) => {
                const product =
                  item.productId && typeof item.productId === "object"
                    ? item.productId
                    : null;

                return (
                  <tr key={item._id}>
                    <td>
                      <strong>
                        {item.variationSku || item.itemId || "--"}
                      </strong>
                      <small>{item.itemId}</small>
                    </td>

                    <td>
                      {product?.title ||
                        item.productTitle ||
                        item.productId ||
                        "--"}
                    </td>

                    <td>{item.variantName || item.variantCode || "--"}</td>

                    <td>×{item.quantityMultiplier || 1}</td>

                    <td>
                      <span
                        className={`sc-status ${
                          item.allowStockDeduction ? "is-active" : "is-off"
                        }`}
                      >
                        {item.allowStockDeduction ? "Cho phép" : "Không"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`sc-status ${
                          item.isActive ? "is-active" : "is-off"
                        }`}
                      >
                        {item.isActive ? "Hoạt động" : "Đã tắt"}
                      </span>
                    </td>

                    <td>
                      <div className="sc-actions">
                        <button
                          type="button"
                          className="sc-icon-btn"
                          onClick={() => openEdit(item)}
                          title="Sửa"
                        >
                          <Link2 size={16} />
                        </button>

                        <button
                          type="button"
                          className="sc-icon-btn danger"
                          onClick={() => remove(item)}
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FORM THÊM / SỬA */}
      {showForm && (
        <div className="sc-modal-backdrop" onClick={() => setShowForm(false)}>
          <form
            className="sc-modal"
            onSubmit={save}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sc-modal-header">
              <div>
                <h3>{editing ? "Sửa ánh xạ SKU" : "Thêm ánh xạ SKU"}</h3>
                <p>Thông tin liên kết sản phẩm</p>
              </div>

              <button
                type="button"
                className="sc-modal-close"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>

            <div className="sc-modal-body">
              <div className="sc-form-grid">
                <label>
                  Gian hàng
                  <select
                    required
                    value={form.shopId}
                    onChange={(e) => update("shopId", e.target.value)}
                  >
                    <option value="">Chọn gian hàng</option>

                    {shops.map((shop) => {
                      const id = getShopeeShopId(shop);

                      return (
                        <option key={id} value={id}>
                          {getShopeeShopName(shop)}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label>
                  Item ID
                  <input
                    required
                    value={form.itemId}
                    onChange={(e) => update("itemId", e.target.value)}
                  />
                </label>

                <label>
                  SKU
                  <input
                    value={form.variationSku}
                    onChange={(e) => update("variationSku", e.target.value)}
                  />
                </label>

                <label>
                  Variant Code
                  <input
                    value={form.variantCode}
                    onChange={(e) => update("variantCode", e.target.value)}
                  />
                </label>

                <label>
                  Variant Name
                  <input
                    value={form.variantName}
                    onChange={(e) => update("variantName", e.target.value)}
                  />
                </label>

                <label>
                  Hệ số số lượng
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={form.quantityMultiplier}
                    onChange={(e) =>
                      update("quantityMultiplier", e.target.value)
                    }
                  />
                </label>
              </div>

              <label className="sc-product-search">
                Tìm sản phẩm trong kho
                <div className="sc-input-icon">
                  <Search size={16} />

                  <input
                    value={productKeyword}
                    onChange={(e) => setProductKeyword(e.target.value)}
                    placeholder="Tên hoặc mã sản phẩm..."
                  />

                  <button
                    type="button"
                    onClick={findProducts}
                    disabled={searchingProducts}
                  >
                    {searchingProducts ? "..." : "Tìm"}
                  </button>
                </div>
              </label>

              {products.length > 0 && (
                <div className="sc-product-results">
                  {products.map((product) => (
                    <button
                      type="button"
                      key={product._id}
                      onClick={() => selectProduct(product)}
                    >
                      <strong>{product.title || product.name}</strong>

                      <small>
                        {product.code || product.productCode || product._id}
                      </small>
                    </button>
                  ))}
                </div>
              )}

              <div className="sc-selected-product">
                Sản phẩm đã chọn:{" "}
                <strong>
                  {form.productTitle || form.productId || "Chưa chọn"}
                </strong>
              </div>

              <label className="sc-checkbox">
                <input
                  type="checkbox"
                  checked={form.allowStockDeduction}
                  onChange={(e) =>
                    update("allowStockDeduction", e.target.checked)
                  }
                />
                Cho phép hệ thống giữ hàng và xuất kho cho SKU này
              </label>
            </div>

            <div className="sc-modal-footer">
              <button
                type="button"
                className="sc-btn sc-btn-light"
                onClick={() => setShowForm(false)}
              >
                Hủy
              </button>

              <button type="submit" className="sc-btn sc-btn-primary">
                Lưu ánh xạ
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
