import React, { useMemo, useState, useEffect } from "react";

import {
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Grid,
  TextField,
  Typography,
} from "@mui/material";

import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import SearchIcon from "@mui/icons-material/Search";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import TuneIcon from "@mui/icons-material/Tune";

import { getRequest } from "../../src/admin/common/ApiMethod";

/* =========================================================
   TYPES
========================================================= */

interface VehicleFinderPreviewProps {
  onSearch?: (vehicle: string) => void;
}

interface Vehicle {
  _id: string;
  name: string;
  type?: string;
  brand?: string;
  model?: string;
  category?: string;
  categoryId?: string;
  isVisible?: boolean;
}

interface ProductCategory {
  _id?: string;
  name?: string;
  title?: string;
}

interface Product {
  _id: string;
  name?: string;
  title?: string;
  code?: string;

  type?: string;

  category?: string | ProductCategory;
  categoryId?: string | ProductCategory;

  compatibleVehicles?: string[];

  isVisible?: boolean;
}

/* =========================================================
   CATEGORY MAP
========================================================= */

const vehicleTypeMap: Record<
  string,
  {
    label: string;
    color: "primary" | "success" | "warning";
  }
> = {
  "1": {
    label: "Xe đạp",
    color: "success",
  },

  "2": {
    label: "Xe điện",
    color: "primary",
  },

  "3": {
    label: "Xe ba gác",
    color: "warning",
  },
};

const getVehicleTypeInfo = (type?: string) => {
  if (!type) return null;

  return (
    vehicleTypeMap[String(type)] || {
      label: "Khác",
      color: "default" as const,
    }
  );
};

/* =========================================================
   PRODUCT CATEGORY
========================================================= */

const productTypeMap: Record<
  string,
  {
    label: string;
    color: "primary" | "success" | "warning";
  }
> = {
  "1": {
    label: "Phụ tùng xe đạp",
    color: "success",
  },

  "2": {
    label: "Phụ tùng xe điện",
    color: "primary",
  },

  "3": {
    label: "Phụ tùng xe ba gác",
    color: "warning",
  },
};

const getProductCategory = (product: Product): string => {
  /*
   * Ưu tiên category object
   */
  if (product.category && typeof product.category === "object") {
    return product.category.name || product.category.title || "";
  }

  /*
   * category string
   */
  if (product.category && typeof product.category === "string") {
    return product.category;
  }

  /*
   * categoryId object
   */
  if (product.categoryId && typeof product.categoryId === "object") {
    return product.categoryId.name || product.categoryId.title || "";
  }

  /*
   * categoryId string
   */
  if (product.categoryId && typeof product.categoryId === "string") {
    return product.categoryId;
  }

  /*
   * Fallback theo type
   */
  if (product.type) {
    return productTypeMap[String(product.type)]?.label || "";
  }

  return "";
};

/* =========================================================
   COMPONENT
========================================================= */

const VehicleFinderPreview: React.FC<VehicleFinderPreviewProps> = ({
  onSearch,
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [vehiclesLoading, setVehiclesLoading] = useState(false);

  /* =======================================================
     LOAD VEHICLES
  ======================================================= */

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setVehiclesLoading(true);

      const res = await getRequest({
        url: "/vehicles",
      });

      const list = Array.isArray(res?.vehicles)
        ? res.vehicles
        : Array.isArray(res)
          ? res
          : [];

      const visibleVehicles = list
        .filter((item: Vehicle) => item?.name && item.isVisible !== false)
        .sort((a: Vehicle, b: Vehicle) => a.name.localeCompare(b.name, "vi"));

      setVehicles(visibleVehicles);
    } catch (error) {
      console.error("Load vehicles error:", error);

      setVehicles([]);
    } finally {
      setVehiclesLoading(false);
    }
  };

  /* =======================================================
     VEHICLE OPTIONS
  ======================================================= */

  const vehicleOptions = useMemo(() => {
    return vehicles.filter((vehicle) => vehicle.name?.trim());
  }, [vehicles]);

  /* =======================================================
     POPULAR VEHICLES
  ======================================================= */

  const popularVehicles = useMemo(() => {
    return vehicleOptions.slice(0, 4);
  }, [vehicleOptions]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const handleSearch = () => {
    if (!selectedVehicle) return;

    onSearch?.(selectedVehicle.name);
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <Box
      sx={{
        py: {
          xs: 5,
          md: 7,
        },
      }}
    >
      <Container maxWidth="lg">
        <Card
          elevation={0}
          sx={{
            position: "relative",
            overflow: "hidden",

            borderRadius: {
              xs: 3,
              md: 4,
            },

            border: "1px solid",
            borderColor: "divider",

            background:
              "linear-gradient(135deg, #f8fbff 0%, #ffffff 55%, #f3f7ff 100%)",
          }}
        >
          {/* =================================================
              DECORATIVE BACKGROUND
          ================================================= */}

          <Box
            sx={{
              position: "absolute",

              width: 260,
              height: 260,

              borderRadius: "50%",

              right: -100,
              top: -120,

              bgcolor: "primary.main",

              opacity: 0.05,
            }}
          />

          <Box
            sx={{
              position: "absolute",

              width: 180,
              height: 180,

              borderRadius: "50%",

              left: -100,
              bottom: -100,

              bgcolor: "primary.main",

              opacity: 0.04,
            }}
          />

          <Box
            sx={{
              position: "relative",

              p: {
                xs: 2.5,
                sm: 4,
                md: 5,
              },
            }}
          >
            <Grid
              container
              spacing={{
                xs: 3,
                md: 5,
              }}
              alignItems="center"
            >
              {/* =================================================
                  LEFT
              ================================================= */}

              <Grid
                size={{
                  xs: 12,
                  md: 5,
                }}
              >
                <Box>
                  {/* BADGE */}

                  <Chip
                    icon={
                      <DirectionsCarOutlinedIcon
                        sx={{
                          fontSize: 17,
                        }}
                      />
                    }
                    label="TÌM ĐÚNG PHỤ TÙNG"
                    size="small"
                    sx={{
                      mb: 2,

                      fontWeight: 800,

                      fontSize: 11,

                      letterSpacing: 0.5,

                      bgcolor: "rgba(25,118,210,.08)",

                      color: "primary.main",

                      border: "1px solid",

                      borderColor: "rgba(25,118,210,.15)",
                    }}
                  />

                  {/* TITLE */}

                  <Typography
                    component="h2"
                    sx={{
                      fontSize: {
                        xs: 25,
                        sm: 30,
                        md: 34,
                      },

                      lineHeight: 1.15,

                      fontWeight: 900,

                      color: "text.primary",
                    }}
                  >
                    Tìm phụ tùng
                    <Box
                      component="span"
                      sx={{
                        display: "block",

                        color: "primary.main",
                      }}
                    >
                      theo dòng xe
                    </Box>
                  </Typography>

                  {/* DESCRIPTION */}

                  <Typography
                    sx={{
                      mt: 1.5,

                      color: "text.secondary",

                      lineHeight: 1.7,

                      fontSize: {
                        xs: 14,
                        sm: 15,
                      },

                      maxWidth: 460,
                    }}
                  >
                    Chọn dòng xe của bạn để tìm nhanh những phụ tùng phù hợp và
                    tương thích.
                  </Typography>

                  {/* =================================================
                      STEPS
                  ================================================= */}

                  <Box
                    sx={{
                      mt: 3,

                      display: "flex",

                      flexDirection: "column",

                      gap: 1.5,
                    }}
                  >
                    {[
                      {
                        number: "01",
                        title: "Chọn dòng xe",

                        text: "Tìm tên xe của bạn",
                      },

                      {
                        number: "02",
                        title: "Tìm phụ tùng",

                        text: "Xem các sản phẩm tương thích",
                      },
                    ].map((item) => (
                      <Box
                        key={item.number}
                        sx={{
                          display: "flex",

                          alignItems: "center",

                          gap: 1.5,
                        }}
                      >
                        <Box
                          sx={{
                            width: 34,
                            height: 34,

                            flexShrink: 0,

                            borderRadius: "10px",

                            bgcolor: "rgba(25,118,210,.08)",

                            color: "primary.main",

                            display: "flex",

                            alignItems: "center",

                            justifyContent: "center",

                            fontSize: 11,

                            fontWeight: 900,
                          }}
                        >
                          {item.number}
                        </Box>

                        <Box>
                          <Typography
                            sx={{
                              fontSize: 14,
                              fontWeight: 700,
                            }}
                          >
                            {item.title}
                          </Typography>

                          <Typography
                            sx={{
                              fontSize: 12,

                              color: "text.secondary",
                            }}
                          >
                            {item.text}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Grid>

              {/* =================================================
                  RIGHT
              ================================================= */}

              <Grid
                size={{
                  xs: 12,
                  md: 7,
                }}
              >
                <Box
                  sx={{
                    p: {
                      xs: 2,
                      sm: 3,
                    },

                    borderRadius: 3,

                    bgcolor: "rgba(255,255,255,.85)",

                    border: "1px solid",

                    borderColor: "rgba(0,0,0,.07)",

                    boxShadow: "0 12px 35px rgba(20,40,80,.07)",
                  }}
                >
                  {/* =================================================
                      HEADER
                  ================================================= */}

                  <Box
                    sx={{
                      display: "flex",

                      alignItems: "center",

                      gap: 1,

                      mb: 2,
                    }}
                  >
                    <TuneIcon
                      sx={{
                        color: "primary.main",

                        fontSize: 21,
                      }}
                    />

                    <Typography
                      sx={{
                        fontWeight: 800,

                        fontSize: 16,
                      }}
                    >
                      Bạn đang sử dụng xe nào?
                    </Typography>
                  </Box>

                  {/* =================================================
                      VEHICLE AUTOCOMPLETE
                  ================================================= */}

                  <Autocomplete
                    fullWidth
                    options={vehicleOptions}
                    value={selectedVehicle}
                    loading={vehiclesLoading}
                    onChange={(_, value) => {
                      setSelectedVehicle(value);
                    }}
                    getOptionLabel={(option) => option.name || ""}
                    isOptionEqualToValue={(option, value) =>
                      option._id === value._id
                    }
                    groupBy={(option) =>
                      getVehicleTypeInfo(option.type)?.label || "Khác"
                    }
                    noOptionsText={
                      vehiclesLoading
                        ? "Đang tải danh sách xe..."
                        : "Không tìm thấy dòng xe"
                    }
                    loadingText="Đang tải danh sách xe..."
                    renderOption={(props, option) => {
                      const typeInfo = getVehicleTypeInfo(option.type);

                      return (
                        <Box
                          component="li"
                          {...props}
                          sx={{
                            display: "flex !important",

                            alignItems: "center",

                            justifyContent: "space-between",

                            gap: 1,

                            width: "100%",
                          }}
                        >
                          <Box
                            sx={{
                              minWidth: 0,
                            }}
                          >
                            <Typography
                              sx={{
                                fontWeight: 700,

                                fontSize: 14,
                              }}
                            >
                              {option.name}
                            </Typography>

                            {(option.brand || option.model) && (
                              <Typography
                                sx={{
                                  fontSize: 12,

                                  color: "text.secondary",

                                  mt: 0.2,
                                }}
                              >
                                {[option.brand, option.model]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </Typography>
                            )}
                          </Box>

                          {typeInfo && (
                            <Chip
                              label={typeInfo.label}
                              size="small"
                              color={typeInfo.color}
                              variant="outlined"
                              sx={{
                                flexShrink: 0,

                                fontWeight: 700,

                                fontSize: 10,
                              }}
                            />
                          )}
                        </Box>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Nhập tên xe..."
                        InputProps={{
                          ...params.InputProps,

                          startAdornment: (
                            <>
                              <SearchIcon
                                sx={{
                                  ml: 1,
                                  mr: 1,
                                  color: "text.secondary",
                                }}
                              />

                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />

                  {/* =================================================
                      SELECTED VEHICLE
                  ================================================= */}

                  {selectedVehicle && (
                    <Box
                      sx={{
                        mt: 1.5,

                        display: "flex",

                        alignItems: "center",

                        flexWrap: "wrap",

                        gap: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 12,

                          color: "text.secondary",
                        }}
                      >
                        Đã chọn:
                      </Typography>

                      <Chip
                        label={selectedVehicle.name}
                        size="small"
                        color="primary"
                        sx={{
                          fontWeight: 700,
                        }}
                      />

                      {getVehicleTypeInfo(selectedVehicle.type) && (
                        <Chip
                          label={
                            getVehicleTypeInfo(selectedVehicle.type)?.label
                          }
                          size="small"
                          variant="outlined"
                          color={
                            getVehicleTypeInfo(selectedVehicle.type)?.color
                          }
                          sx={{
                            fontWeight: 700,
                          }}
                        />
                      )}
                    </Box>
                  )}

                  {/* =================================================
                      SEARCH BUTTON
                  ================================================= */}

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={!selectedVehicle}
                    onClick={handleSearch}
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      mt: 2,

                      height: 50,

                      borderRadius: 2,

                      fontWeight: 800,

                      textTransform: "none",

                      fontSize: 15,
                    }}
                  >
                    Xem phụ tùng tương thích
                  </Button>

                  {/* =================================================
                      POPULAR
                  ================================================= */}

                  <Box
                    sx={{
                      mt: 2.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 12,

                        fontWeight: 700,

                        color: "text.secondary",

                        mb: 1,
                      }}
                    >
                      Dòng xe phổ biến
                    </Typography>

                    <Box
                      sx={{
                        display: "flex",

                        flexWrap: "wrap",

                        gap: 0.8,
                      }}
                    >
                      {popularVehicles.map((vehicle) => {
                        const typeInfo = getVehicleTypeInfo(vehicle.type);

                        return (
                          <Chip
                            key={vehicle._id}
                            label={
                              <Box
                                sx={{
                                  display: "flex",

                                  alignItems: "center",

                                  gap: 0.5,
                                }}
                              >
                                <span>{vehicle.name}</span>

                                {typeInfo && (
                                  <Typography
                                    component="span"
                                    sx={{
                                      fontSize: 10,

                                      opacity: 0.7,

                                      fontWeight: 700,
                                    }}
                                  >
                                    • {typeInfo.label}
                                  </Typography>
                                )}
                              </Box>
                            }
                            size="small"
                            clickable
                            onClick={() => setSelectedVehicle(vehicle)}
                            variant={
                              selectedVehicle?._id === vehicle._id
                                ? "filled"
                                : "outlined"
                            }
                            color={
                              selectedVehicle?._id === vehicle._id
                                ? "primary"
                                : "default"
                            }
                            sx={{
                              fontWeight: 600,
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Card>
      </Container>
    </Box>
  );
};

export default VehicleFinderPreview;
