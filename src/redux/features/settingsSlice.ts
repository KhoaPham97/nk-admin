import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

import { API_ENDPOINTS } from "../../api";

/* =====================================================
   SETTINGS TYPE
===================================================== */

export interface StoreSettings {
  storeName: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  logo: string;

  order: {
    allowOrder: boolean;
    autoConfirm: boolean;
    autoComplete: boolean;
    holdMinutes: number;
    allowCancel: boolean;
    syncPriceBeforeComplete: boolean;
  };

  payment: {
    cash: boolean;
    bankTransfer: boolean;
    cod: boolean;
    qrCode: boolean;

    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
  };

  shipping: {
    enabled: boolean;
    defaultFee: number;
    freeShippingFrom: number;
    note: string;
  };

  pricing: {
    currency: string;
    syncPriceForUncompletedOrders: boolean;
    setPaidWhenCompleted: boolean;
    useCurrentSellingPriceWhenComplete: boolean;
  };

  websiteSettings: {
    siteName: string;
    slogan: string;
    maintenanceMode: boolean;
    showPhone: boolean;
    showAddress: boolean;
    announcement: string;
  };
}

/* =====================================================
   DEFAULT SETTINGS
===================================================== */

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "NHẬT KHANG BIKE",

  phone: "",

  email: "",

  address: "",

  website: "",

  logo: "",

  order: {
    allowOrder: true,
    autoConfirm: false,
    autoComplete: false,
    holdMinutes: 30,
    allowCancel: true,
    syncPriceBeforeComplete: true,
  },

  payment: {
    cash: true,
    bankTransfer: true,
    cod: true,
    qrCode: true,

    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
  },

  shipping: {
    enabled: true,
    defaultFee: 0,
    freeShippingFrom: 0,
    note: "",
  },

  pricing: {
    currency: "VND",
    syncPriceForUncompletedOrders: true,
    setPaidWhenCompleted: true,
    useCurrentSellingPriceWhenComplete: true,
  },

  websiteSettings: {
    siteName: "NHẬT KHANG BIKE",
    slogan: "Đã chạy phải chất",
    maintenanceMode: false,
    showPhone: true,
    showAddress: true,
    announcement: "",
  },
};

/* =====================================================
   STATE
===================================================== */

interface SettingsState {
  settings: StoreSettings;

  loading: boolean;

  error: string | null;

  /*
   * false:
   * Chưa gọi API settings lần nào
   *
   * true:
   * Đã gọi API rồi
   */
  initialized: boolean;
}

/* =====================================================
   INITIAL STATE
===================================================== */

const initialState: SettingsState = {
  settings: DEFAULT_SETTINGS,

  loading: false,

  error: null,

  initialized: false,
};

/* =====================================================
   FETCH SETTINGS
===================================================== */

export const fetchSettings = createAsyncThunk<
  StoreSettings,
  void,
  {
    rejectValue: string;
  }
>(
  "settings/fetchSettings",

  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(API_ENDPOINTS.SETTINGS);

      /*
       * Một số backend trả:
       *
       * {
       *   data: {...}
       * }
       *
       * Một số backend trả trực tiếp:
       *
       * {
       *   storeName: ...
       * }
       *
       * Hỗ trợ cả 2.
       */

      const data = response.data?.data ?? response.data;

      return data as StoreSettings;
    } catch (error: any) {
      console.error("Fetch settings error:", error);

      return rejectWithValue(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể tải cấu hình website",
      );
    }
  },
);

/* =====================================================
   SLICE
===================================================== */

const settingsSlice = createSlice({
  name: "settings",

  initialState,

  reducers: {
    /*
     * Cập nhật settings trực tiếp trong Redux
     */
    updateSettings: (state, action: PayloadAction<Partial<StoreSettings>>) => {
      state.settings = {
        ...state.settings,
        ...action.payload,
      };
    },

    /*
     * Reset settings về mặc định
     */
    resetSettingsState: (state) => {
      state.settings = DEFAULT_SETTINGS;

      state.loading = false;

      state.error = null;

      state.initialized = false;
    },
  },

  extraReducers: (builder) => {
    /* =================================================
       PENDING
    ================================================= */

    builder.addCase(fetchSettings.pending, (state) => {
      state.loading = true;

      state.error = null;
    });

    /* =================================================
       FULFILLED
    ================================================= */

    builder.addCase(fetchSettings.fulfilled, (state, action) => {
      state.loading = false;

      state.initialized = true;

      state.error = null;

      /*
       * Merge với DEFAULT_SETTINGS
       *
       * Tránh trường hợp backend thiếu một field
       * làm frontend bị undefined.
       */

      state.settings = {
        ...DEFAULT_SETTINGS,

        ...action.payload,

        order: {
          ...DEFAULT_SETTINGS.order,
          ...(action.payload?.order || {}),
        },

        payment: {
          ...DEFAULT_SETTINGS.payment,
          ...(action.payload?.payment || {}),
        },

        shipping: {
          ...DEFAULT_SETTINGS.shipping,
          ...(action.payload?.shipping || {}),
        },

        pricing: {
          ...DEFAULT_SETTINGS.pricing,
          ...(action.payload?.pricing || {}),
        },

        websiteSettings: {
          ...DEFAULT_SETTINGS.websiteSettings,
          ...(action.payload?.websiteSettings || {}),
        },
      };
    });

    /* =================================================
       REJECTED
    ================================================= */

    builder.addCase(fetchSettings.rejected, (state, action) => {
      state.loading = false;

      /*
       * Đánh dấu đã thử gọi API.
       *
       * Nếu API lỗi thì frontend vẫn sử dụng
       * DEFAULT_SETTINGS.
       */

      state.initialized = true;

      state.error =
        action.payload ||
        action.error.message ||
        "Không thể tải cấu hình website";
    });
  },
});

/* =====================================================
   ACTIONS
===================================================== */

export const { updateSettings, resetSettingsState } = settingsSlice.actions;

/* =====================================================
   SELECTORS
===================================================== */

export const selectSettings = (state: { settings: SettingsState }) =>
  state.settings.settings;

export const selectSettingsLoading = (state: { settings: SettingsState }) =>
  state.settings.loading;

export const selectSettingsInitialized = (state: { settings: SettingsState }) =>
  state.settings.initialized;

export const selectSettingsError = (state: { settings: SettingsState }) =>
  state.settings.error;

/* =====================================================
   REDUCER
===================================================== */

export default settingsSlice.reducer;
