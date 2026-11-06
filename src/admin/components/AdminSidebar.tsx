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
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PostAddIcon from "@mui/icons-material/PostAdd";
import StorefrontIcon from "@mui/icons-material/Storefront";
import CategoryIcon from "@mui/icons-material/Category";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import AddBoxIcon from "@mui/icons-material/AddBox";
import InventoryIcon from "@mui/icons-material/Inventory";
import HistoryIcon from "@mui/icons-material/History";
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

interface Props {
  drawerWidth: number;
  mobileOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

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
          icon: "",
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
                const active =
                  item.path === "/admin"
                    ? location.pathname === "/admin"
                    : location.pathname === item.path;

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
                        backgroundColor: "rgba(25, 118, 210, 0.10)",
                      },

                      "&.Mui-selected:hover": {
                        backgroundColor: "rgba(25, 118, 210, 0.16)",
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
              width: drawerWidth,
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
