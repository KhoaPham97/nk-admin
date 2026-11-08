import React, { useEffect, useState } from "react";
import { RefreshCw, Store, Plus, Trash2, ExternalLink } from "lucide-react";
import { shopeeApi } from "../../services/shopeeApi";
import "./style/shopee-components.css";

export default function ShopeeShops({ onRefresh }) {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await shopeeApi.getShops();
      const list = res?.shops || res?.data?.shops || res?.data || [];
      setShops(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const connect = async () => {
    setConnecting(true);
    setError("");
    try {
      const res = await shopeeApi.connectShop();
      const url =
        res?.authUrl ||
        res?.authorizationUrl ||
        res?.data?.authUrl ||
        res?.data?.authorizationUrl;

      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        setMessage(res?.message || "Đã gửi yêu cầu kết nối.");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  };

  const refreshToken = async (shop) => {
    setError("");
    setMessage("");
    try {
      await shopeeApi.refreshToken({
        shopId: shop.shopId || shop.shop_id || shop._id,
      });
      setMessage("Đã yêu cầu làm mới token.");
      await load();
      onRefresh?.();
    } catch (e) {
      setError(e.message);
    }
  };

  const disconnect = async (shop) => {
    const id = shop.shopId || shop.shop_id || shop._id;
    if (
      !id ||
      !window.confirm("Bạn chắc chắn muốn ngắt kết nối gian hàng này?")
    )
      return;

    try {
      await shopeeApi.disconnectShop(id);
      setMessage("Đã ngắt kết nối gian hàng.");
      await load();
      onRefresh?.();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section className="sc-section">
      <div className="sc-toolbar">
        <div>
          <h3>Gian hàng Shopee</h3>
          <p>Quản lý các gian hàng đã kết nối với Nhật Khang Bike.</p>
        </div>
        <div className="sc-actions">
          <button
            className="sc-btn sc-btn-light"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={16} /> Làm mới
          </button>
          <button
            className="sc-btn sc-btn-primary"
            onClick={connect}
            disabled={connecting}
          >
            <Plus size={16} />{" "}
            {connecting ? "Đang kết nối..." : "Kết nối Shopee"}
          </button>
        </div>
      </div>

      {error && <div className="sc-alert sc-alert-error">{error}</div>}
      {message && <div className="sc-alert sc-alert-success">{message}</div>}

      {loading ? (
        <div className="sc-loading">Đang tải gian hàng...</div>
      ) : shops.length === 0 ? (
        <div className="sc-empty">
          <Store size={38} />
          <strong>Chưa có gian hàng Shopee</strong>
          <span>Nhấn “Kết nối Shopee” để bắt đầu.</span>
        </div>
      ) : (
        <div className="sc-shop-grid">
          {shops.map((shop) => {
            const id = shop.shopId || shop.shop_id || shop._id;
            const name =
              shop.shopName || shop.shop_name || shop.name || `Shop ${id}`;
            const connected =
              shop.isConnected !== false && shop.status !== "disconnected";

            return (
              <article className="sc-shop-card" key={id}>
                <div className="sc-shop-card-top">
                  <div className="sc-shop-icon">
                    <Store size={23} />
                  </div>
                  <span
                    className={`sc-status ${connected ? "is-active" : "is-off"}`}
                  >
                    {connected ? "Đã kết nối" : "Ngắt kết nối"}
                  </span>
                </div>
                <h4>{name}</h4>
                <p>Mã shop: {id || "--"}</p>
                <p>
                  Token: {shop.accessToken ? "Đã lưu" : "Chưa có thông tin"}
                </p>
                <div className="sc-shop-actions">
                  <button
                    className="sc-btn sc-btn-light"
                    onClick={() => refreshToken(shop)}
                  >
                    <RefreshCw size={15} /> Làm mới token
                  </button>
                  <button
                    className="sc-icon-btn danger"
                    title="Ngắt kết nối"
                    onClick={() => disconnect(shop)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
