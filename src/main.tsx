import React from "react";
import ReactDOM from "react-dom/client";

import { Provider } from "react-redux";

import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";

import { store } from "./redux/store";

import { fetchSettings } from "./redux/features/settingsSlice";

import "./index.css";

/* =========================================================
   LOAD WEBSITE SETTINGS
========================================================= */

store.dispatch(fetchSettings());

/* =========================================================
   ROOT
========================================================= */

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Không tìm thấy #root");
}

/* =========================================================
   RENDER
========================================================= */

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
