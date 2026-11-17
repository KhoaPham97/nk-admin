import React from "react";

import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import ChatIcon from "@mui/icons-material/Chat";
import ImageIcon from "@mui/icons-material/Image";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PostAddIcon from "@mui/icons-material/PostAdd";
import StorefrontIcon from "@mui/icons-material/Storefront";
import CategoryIcon from "@mui/icons-material/Category";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import AddBoxIcon from "@mui/icons-material/AddBox";
import InventoryIcon from "@mui/icons-material/Inventory";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import PeopleIcon from "@mui/icons-material/People";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import SettingsIcon from "@mui/icons-material/Settings";
import MoveToInboxIcon from "@mui/icons-material/MoveToInbox";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import { useLocation, useNavigate } from "react-router-dom";
import PriceChangeIcon from "@mui/icons-material/PriceChange";
import { PackageSearch, Barcode } from "lucide-react";
interface Props {
  drawerWidth: number;
  mobileOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const MENU_HELP: Record<string, string> = {
  "Dashboard": "Tổng hợp tình hình kinh doanh, doanh thu, tồn kho và các chỉ số hoạt động của cửa hàng.",
  "Chat": "Theo dõi và trả lời tin nhắn khách hàng từ các kênh được kết nối.",
  "Quản lý hình ảnh": "Tải lên, xem và quản lý hình ảnh sản phẩm đang sử dụng trong hệ thống.",
  "Đồng bộ Cloudinary": "Đưa ảnh sản phẩm lên Cloudinary và cập nhật đường dẫn ảnh trên hệ thống.",
  "Tất cả sản phẩm": "Tra cứu, lọc và quản lý toàn bộ sản phẩm cùng thông tin, giá bán và tồn kho.",
  "Nhập sản phẩm": "Tạo sản phẩm mới và khai báo thông tin, phân loại, hình ảnh, giá và biến thể.",
  "Phụ tùng xe đạp": "Danh sách sản phẩm thuộc nhóm phụ tùng xe đạp.",
  "Phụ tùng xe điện": "Danh sách sản phẩm thuộc nhóm phụ tùng xe điện.",
  "Phụ tùng xe ba gác": "Danh sách sản phẩm thuộc nhóm phụ tùng xe ba gác.",
  "Danh mục sản phẩm": "Tạo và sắp xếp các danh mục dùng để phân loại sản phẩm.",
  "Xe tương thích": "Quản lý các dòng xe tương thích với từng sản phẩm.",
  "Sản phẩm bán chạy": "Xem các sản phẩm có lượng bán cao theo dữ liệu đơn hàng.",
  "Tính giá sản phẩm": "Tính giá bán dựa trên giá vốn, tỷ giá và mức lợi nhuận mong muốn.",
  "Báo giá sản phẩm": "Chọn sản phẩm để tạo báo giá gửi khách hàng.",
  "Quản lý SKU": "Tra cứu và quản lý mã SKU, mã biến thể để nhận diện chính xác từng phiên bản sản phẩm.",
  "Tổng quan tồn kho": "Xem số lượng tồn, hàng giữ chỗ và tình hình kho hiện tại.",
  "Quản lý giá vốn": "Theo dõi và cập nhật giá vốn sản phẩm, phục vụ tính lợi nhuận.",
  "Nhập kho": "Ghi nhận hàng nhập, số lượng, biến thể, giá vốn và thông tin lô nhập.",
  "Quản lý lô hàng": "Theo dõi từng lô nhập, số lượng còn lại, giá vốn và mã Variant; có thể chỉnh sửa thông tin lô.",
  "Sản phẩm đang giữ": "Xem số lượng hàng đang được giữ cho các đơn chưa hoàn tất.",
  "Lịch sử nhập kho": "Tra cứu các phiếu và lần nhập kho đã được ghi nhận.",
  "Lịch sử xuất kho": "Tra cứu lịch sử tăng giảm kho và các nghiệp vụ xuất/điều chỉnh tồn.",
  "Đơn hàng": "Theo dõi, lọc và xử lý đơn hàng nội bộ cùng trạng thái giao dịch.",
  "Tạo đơn hàng": "Lập đơn bán hàng mới và chọn sản phẩm, số lượng, khách hàng.",
  "Danh sách khách hàng": "Quản lý thông tin và lịch sử giao dịch của khách hàng.",
  "Thống kê mua hàng": "Phân tích tần suất và giá trị mua hàng theo từng khách hàng.",
  "Quản lý Shopee": "Quản lý kết nối Shopee, đơn hàng, sản phẩm, tồn kho và các chức năng đồng bộ.",
  "Cài đặt": "Thiết lập các tùy chọn và cấu hình hoạt động của hệ thống.",
};

const getMenuHelp = (label: string) =>
  MENU_HELP[label] || `Mở khu vực ${label} để xem và quản lý dữ liệu liên quan.`;

const AdminSidebar = ({
  drawerWidth,
  mobileOpen,
  onClose,
  isMobile,
}: Props) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuGroups = [
    {
      title: "TỔNG QUAN",
      items: [
        {
          label: "Dashboard",
          icon: <DashboardIcon />,
          path: "/admin",
        },
      ],
    },

    {
      title: "GIAO TIẾP",
      items: [
        {
          label: "Chat",
          icon: <ChatIcon />,
          path: "/admin/chat",
        },
        {
          label: "Quản lý hình ảnh",
          icon: <ImageIcon />,
          path: "/admin/images",
        },
        {
          label: "Đồng bộ Cloudinary",
          icon: <CloudUploadIcon />,
          path: "/admin/images/cloudinary-sync",
        },
      ],
    },

    {
      title: "QUẢN LÝ SẢN PHẨM",
      items: [
        {
          label: "Tất cả sản phẩm",
          icon: <Inventory2Icon />,
          path: "/admin/products",
        },
        {
          label: "Nhập sản phẩm",
          icon: <PostAddIcon />,
          path: "/admin/products/create",
        },
        {
          label: "Phụ tùng xe đạp",
          icon: <StorefrontIcon />,
          path: "/admin/products/bicycle",
        },
        {
          label: "Phụ tùng xe điện",
          icon: <StorefrontIcon />,
          path: "/admin/products/electric",
        },
        {
          label: "Phụ tùng xe ba gác",
          icon: <StorefrontIcon />,
          path: "/admin/products/tricycle",
        },
        {
          label: "Danh mục sản phẩm",
          icon: <CategoryIcon />,
          path: "/admin/categories",
        },
        {
          label: "Xe tương thích",
          icon: <DirectionsCarIcon />,
          path: "/admin/vehicles",
        },
        {
          label: "Sản phẩm bán chạy",
          icon: <TrendingUpIcon />,
          path: "/admin/best-selling-products",
        },
        {
          label: "Tính giá sản phẩm",
          icon: <PriceChangeIcon />,
          path: "/admin/products-pricing",
        },
        {
          label: "Báo giá sản phẩm",
          icon: <RequestQuoteIcon />,
          path: "/admin/product-quote",
        },
        {
          label: "Quản lý SKU",
          icon: <Barcode size={20} />,
          path: "/admin/sku",
        },
      ],
    },

    {
      title: "QUẢN LÝ KHO",
      items: [
        {
          label: "Tổng quan tồn kho",
          icon: <WarehouseIcon />,
          path: "/admin/inventory",
        },
        {
          label: "Quản lý giá vốn",
          icon: <PriceChangeIcon />,
          path: "/admin/cost-management",
        },
        {
          label: "Nhập kho",
          icon: <MoveToInboxIcon />,
          path: "/admin/inventory/import",
        },
        {
          label: "Quản lý lô hàng",
          icon: <InventoryIcon />,
          path: "/admin/inventory-batches",
        },
        {
          label: "Sản phẩm đang giữ",
          path: "/admin/inventory/reservations",
          icon: <PackageSearch />,
        },
        {
          label: "Lịch sử nhập kho",
          icon: <AddBoxIcon />,
          path: "/admin/inventory-receipts",
        },
        {
          label: "Lịch sử xuất kho",
          icon: <LocalShippingIcon />,
          path: "/admin/inventory-history",
        },
      ],
    },

    {
      title: "BÁN HÀNG",
      items: [
        {
          label: "Đơn hàng",
          icon: <ShoppingCartIcon />,
          path: "/admin/orders",
        },
        {
          label: "Tạo đơn hàng",
          icon: <AddShoppingCartIcon />,
          path: "/admin/orders/create",
        },
      ],
    },

    {
      title: "KHÁCH HÀNG",
      items: [
        {
          label: "Danh sách khách hàng",
          icon: <PeopleIcon />,
          path: "/admin/customers",
        },
        {
          label: "Thống kê mua hàng",
          icon: <PeopleAltIcon />,
          path: "/admin/customer-purchase-stats",
        },
      ],
    },
    {
      title: "eShop",
      items: [
        {
          label: "Quản lý Shopee",
          icon: <ShoppingBagIcon />,
          path: "/admin/shopee",
        },
      ],
    },

    {
      title: "HỆ THỐNG",
      items: [
        {
          label: "Cài đặt",
          icon: <SettingsIcon />,
          path: "/admin/settings",
        },
      ],
    },
  ];

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* LOGO */}

      <Box
        sx={{
          height: 70,
          display: "flex",
          alignItems: "center",
          px: 2.5,
        }}
      >
        <Box>
          <Typography fontSize={20} fontWeight={800}>
            NHẬT KHANG
          </Typography>

          <Typography fontSize={13} fontWeight={600} color="text.secondary">
            BIKE ADMIN
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* MENU */}

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          py: 1.5,
        }}
      >
        {menuGroups.map((group) => (
          <Box
            key={group.title}
            sx={{
              mb: 1.5,
            }}
          >
            <Typography
              sx={{
                px: 2.5,
                mb: 0.5,
                fontSize: 10,
                fontWeight: 700,
                color: "text.secondary",
                letterSpacing: 0.8,
              }}
            >
              {group.title}
            </Typography>

            <List disablePadding>
              {group.items.map((item) => {
                // Only the most specific matching menu route is active.
                // This prevents parent routes (e.g. /admin/orders) from
                // being highlighted together with child routes.
                const pathname = location.pathname.replace(/\/+$/, "") || "/";
                const matchedMenuItems = menuGroups
                  .flatMap((menuGroup) => menuGroup.items)
                  .filter((menuItem) => {
                    const menuPath = menuItem.path.replace(/\/+$/, "") || "/";
                    return pathname === menuPath || pathname.startsWith(`${menuPath}/`);
                  })
                  .sort((a, b) => b.path.length - a.path.length);
                const active = matchedMenuItems[0]?.path === item.path;

                return (
                  <ListItemButton
                    key={item.path}
                    selected={active}
                    onClick={() => {
                      navigate(item.path);

                      if (isMobile) {
                        onClose();
                      }
                    }}
                    sx={{
                      mx: 1,
                      mb: 0.3,
                      borderRadius: 1.5,
                      minHeight: 44,

                      "&.Mui-selected": {
                        backgroundColor: "rgba(37, 99, 235, 0.10)",
                        color: "#2563eb",
                      },

                      "&.Mui-selected:hover": {
                        backgroundColor: "rgba(37, 99, 235, 0.16)",
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 40,
                        color: active ? "primary.main" : "text.secondary",
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>

                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: 14,
                        fontWeight: active ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* FOOTER */}

      <Divider />

      <Box
        sx={{
          p: 2,
        }}
      >
        <Typography fontSize={12} color="text.secondary">
          © {new Date().getFullYear()} Nhật Khang Bike
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      {/* MOBILE */}

      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onClose}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            "& .MuiDrawer-paper": {
              width: "min(88vw, 320px)",
              maxWidth: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        /* DESKTOP */

        <Drawer
          variant="permanent"
          open
          sx={{
            width: drawerWidth,
            flexShrink: 0,

            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};

export default AdminSidebar;
