import React from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./Layout";
import ImportCategory from "./ImportCategory";
import ImportProduct from "./ImportProduct";

import { Toaster } from "react-hot-toast";

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
      <Layout>
        <Toaster />
        <Routes>
          <Route path="/import-category" element={<ImportCategory />} />
          <Route path="/import-product" element={<ImportProduct />} />

          {/* <Route index element={<Home />} />
          <Route path="blogs" element={<Blogs />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NoPage />} /> */}
        </Routes>
      </Layout>
    </React.Fragment>
  );
}

// You can think of these components as "pages"
// in your app.
