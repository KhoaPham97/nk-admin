import { FC, useEffect, useState } from "react";

// import HeroSection from "../components/HeroSection";
// import Features from "../components/Features";
import BikeProducts from "../components/BikeProducts";
import { useAppDispatch } from "../redux/hooks";
import {
  updateEbikeList,
  updateBikeList,
  updateThreeWheeleList,
} from "../redux/features/productSlice";
// import { getUserInfo } from "../redux/features/authSlice";
// import { Product } from "../models/Product";
import EbikeProducts from "../components/EbikeProducts";
import ThreeWheeleProducts from "../components/ThreeWheeleProducts";

// import Banner from "../components/Banner";
import { API_ENDPOINTS } from "../api";
import toast from "react-hot-toast";

const Home: FC = () => {
  const dispatch = useAppDispatch();
  const [isMount, setMount] = useState(false);
  useEffect(() => {
    const fetchProducts = () => {
      const toastId = toast.loading("Đang tải dữ liệu...");
      const loadData = Promise.all([
        fetch(`${API_ENDPOINTS.PRODUCTS}?type=1&limit=10`).then((res) =>
          res.json(),
        ),
        fetch(`${API_ENDPOINTS.PRODUCTS}?type=2&limit=10`).then((res) =>
          res.json(),
        ),
        fetch(`${API_ENDPOINTS.PRODUCTS}?type=3&limit=10`).then((res) =>
          res.json(),
        ),
      ]);
      loadData.then((data): any => {
        toast.dismiss(toastId);
        let productListBike: any = [];
        let productListEBike: any = [];
        let product3W: any = [];

        data[0].products.forEach((product: any) => {
          productListBike.push({
            id: product._id,
            title: product.title,
            images: product.images,
            price: product.price,
            rating: product.rating,
            thumbnail: product.thumbnail,
            description: product.description,
            category: product.category,
            discountPercentage: 0.1,
            qty: product.qty ?? 0,
          });
        });
        data[1].products.forEach((product: any) => {
          productListEBike.push({
            id: product._id,
            title: product.title,
            images: product.images,
            price: product.price,
            rating: product.rating,
            thumbnail: product.thumbnail,
            description: product.description,
            category: product.category,
            discountPercentage: 0.1,
            qty: product.qty ?? 0,
          });
        });
        data[2].products.forEach((product: any) => {
          product3W.push({
            id: product._id,
            title: product.title,
            images: product.images,
            price: product.price,
            rating: product.rating,
            thumbnail: product.thumbnail,
            description: product.description,
            category: product.category,
            discountPercentage: 0.1,
            qty: product.qty ?? 0,
          });
        });

        dispatch(updateBikeList(productListBike));
        dispatch(updateEbikeList(productListEBike));
        dispatch(updateThreeWheeleList(product3W));
        setMount(true);
        toast.success("Tải thành công");
      });
    };

    fetchProducts();
  }, [dispatch]);
  // const [value, setValue] = useState(0);

  // const handleChange = (event: React.SyntheticEvent, newValue: number) => {
  //   setValue(newValue);
  // };
  // function CustomTabPanel(props: any) {
  //   const { children, value, index, ...other } = props;

  //   return (
  //     <div
  //       role="tabpanel"
  //       hidden={value !== index}
  //       tabIndex={0}
  //       id={`simple-tabpanel-${index}`}
  //       aria-labelledby={`simple-tab-${index}`}
  //       {...other}
  //     >
  //       {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  //     </div>
  //   );
  // }

  // function a11yProps(index: number) {
  //   return {
  //     id: `simple-tab-${index}`,
  //     "aria-controls": `simple-tabpanel-${index}`,
  //   };
  // }
  return (
    isMount && (
      <div className="dark:bg-slate-800">
        {/* <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          <Tab label="Phụ tùng xe đạp" {...a11yProps(0)} />
          <Tab label="Phụ tùng xe điện" {...a11yProps(1)} />
          <Tab label="Phụ tùng ba gác" {...a11yProps(2)} />
        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0}>
        <BikeProducts />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <EbikeProducts />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}> 
            </CustomTabPanel>
      */}
        <BikeProducts />
        <EbikeProducts />
        <ThreeWheeleProducts />
        {/* <HeroSection /> */}
        {/* <Features /> */}

        {/* <Banner /> */}
        <br />
      </div>
    )
  );
};

export default Home;
