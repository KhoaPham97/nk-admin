import React from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./Layout";
import ImportCategory from "./ImportCategory";
import Products from "./pages/Products";
import AdminLayout from "./layouts/AdminLayout";
import Categories from "./pages/Categories";
import Dashboard from "./pages/Dashboard";

// This site has 3 pages, all of which are rendered
// dynamically in the browser (not server rendered).
//
// Although the page does not ever refresh, notice how
// React Router keeps the URL up to date as you navigate
// through the site. This preserves the browser history,
// making sure things like the back button and bookmarks
// work properly.

export default function BasicExample() {
  return (
    <React.Fragment>
      {/* <Layout> */}

      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />

          <Route path="products" element={<Products />} />

          <Route path="products/bicycle" element={<Products />} />

          <Route path="products/electric" element={<Products />} />

          <Route path="products/tricycle" element={<Products />} />
          <Route path="categories" element={<Categories />} />
        </Route>
      </Routes>
      {/* </Layout> */}
    </React.Fragment>
  );
}

// You can think of these components as "pages"
// in your app.
