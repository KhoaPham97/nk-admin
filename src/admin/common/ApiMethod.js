import axios from "./axios.js";
import toast from "react-hot-toast";

export const getRequest = async ({ url, params = {} }) => {
  try {
    toast.loading("Loading...");
    const res = await axios.get(url, { params });
    toast.success(res.statusText);
    return res.data;
  } catch (err) {
    toast.error("Error!");
    return err;
  }
};

//  OR =====> In case of Redux Thunk  <======
//  export const getRequest = async ({ url, params = {}, thunkApi }) => {
//    try {
toast.loading("Loading...");

//      const res = await axios.get(url, { params });
//      return res.data;
//    } catch (err) {
//      return thunkApi.rejectWithValue(err);
//      return err;
//    };
//  };

export const postRequest = async ({ url, data = {}, params = {} }) => {
  try {
    toast.loading("Loading...");

    const res = await axios.post(url, data, { params });
    toast.success(res.statusText);
    return res.data;
  } catch (err) {
    toast.error("Error!");
    return err;
  }
};

export const postFormDataRequest = async ({ url, data = {}, params = {} }) => {
  try {
    toast.loading("Loading...");

    const res = await axios.post(url, data, {
      params,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    toast.success(res.statusText);
    return res.data;
  } catch (err) {
    toast.error("Error!");
    return err;
  }
};

export const patchRequest = async ({ url, data = {}, params = {} }) => {
  try {
    toast.loading("Loading...");

    const res = await axios.patch(url, data, { params });
    toast.success(res.statusText);
    return res.data;
  } catch (err) {
    toast.error("Error!");
    return err;
  }
};

export const patchFormDataRequest = async ({ url, data = {}, params = {} }) => {
  try {
    toast.loading("Loading...");

    const res = await axios.patch(url, data, {
      params,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    toast.success(res.statusText);
    return res.data;
  } catch (err) {
    toast.error("Error!");
    return err;
  }
};

export const putRequest = async ({ url, data = {}, params = {} }) => {
  try {
    toast.loading("Loading...");

    const res = await axios.put(url, data, { params });
    toast.success(res.statusText);
    return res.data;
  } catch (err) {
    toast.error("Error!");
    return err;
  }
};

export const deleteRequest = async ({ url, params = {} }) => {
  try {
    toast.loading("Loading...");

    const res = await axios.delete(url, { params });
    toast.success(res.statusText);
    return res.data;
  } catch (err) {
    toast.error("Error!");
    return err;
  }
};
