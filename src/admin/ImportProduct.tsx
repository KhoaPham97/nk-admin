import React, { useEffect, useState } from "react";
import Table from "./common/Table";
import TextField from "@mui/material/TextField";
import { getRequest, patchRequest, postRequest } from "./common/ApiMethod";
import { InputFileUpload } from "./common/UploadIcon";

import Autocomplete from "@mui/material/Autocomplete";

// const ExcelJS = require("exceljs");

const toBase64 = (file: any) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
const toDataURL = (url: any) => {
  const promise = new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
      var reader = new FileReader();
      reader.readAsDataURL(xhr.response);
      reader.onloadend = function () {
        resolve({ base64Url: reader.result });
      };
    };
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.send();
  });

  return promise;
};

const ImportProduct = () => {
  const ref = React.useRef();
  const [header, setHeader] = useState([]);

  const [dataCate, setDataCate]: any = useState([]);
  const [data, setData] = useState([
    {
      id: 1,
      key: 1,
      name: "",
      image: "",
    },
  ]);
  useEffect(() => {
    const loadData = async () => {
      try {
        getRequest({ url: "/categorys" }).then((res) => {
          setDataCate(res.categorys);
        });
        // const json = await response.json();
        // console.log(json);
      } catch (error) {
        console.log("error: " + error);
      }
      try {
        getRequest({ url: "/products" }).then((res) => {
          let header: any = [];
          let p = res.products?.map((i: any, idx: any) => {
            if (header.length === 0) {
              for (var key in Object.keys(i)) {
                if (Object.keys(i).hasOwnProperty(key)) {
                  header.push({
                    name: Object.keys(i)[key],
                    key: Object.keys(i)[key],
                  });
                }
              }
              // header.push({
              //   name: "categoryId",
              //   key: "categoryId",
              // });
            }
            return { ...i, id: i._id };
          });
          setData(p);
          setHeader(header);
        });
        // const json = await response.json();
        // console.log(json);
      } catch (error) {
        console.log("error: " + error);
      }
    };

    loadData();
  }, []);
  const renderField = (fldName: any, i: any, o: any, k: any, dataCate: any) => {
    let fld: any = "";
    switch (fldName) {
      case "stt":
        fld = o.stt?.length > 0 ? o.stt : i + 1;
        break;
      case "images":
        fld = (
          <>
            {/* {o.images.map((image, idx) => {
              return (
                <div>
                  <img
                    src={image}
                    style={{ height: 80, width: 80 }}
                    alt="Red dot"
                  />{" "}
                  <InputFileUpload
                    onChange={async (e) => {
                      let cloneData = [...data];
                      const result = await toBase64(e.target.files[0]);
                      cloneData[i].images[idx] = result;
                      setData(cloneData);
                    }}
                    accept="image/*, .heic"
                  />
                </div>
              );
            })} */}
          </>
        );
        break;
      case "thumbnail":
        fld = (
          <>
            <img
              src={o.thumbnail}
              style={{ height: 80, width: 80 }}
              alt="Red dot"
            />
            {/* <input
                type="file"
                name="myImage"
                accept="image/*, .heic"
                onChange={async (e) => {
                  let cloneData = [...data];
                  console.log(e.target.files[0]);
                  const result = await toBase64(e.target.files[0]);
                  cloneData[i].image = result;
                  setData(cloneData);
                }}
              /> */}
            <InputFileUpload
              onChange={async (e: any) => {
                let cloneData: any = [...data];
                console.log(e.target.files[0]);
                const result = await toBase64(e.target.files[0]);
                cloneData[i].thumbnail = result;
                setData(cloneData);
              }}
              accept="image/*, .heic"
            />
          </>
        );
        break;
      case "categoryId":
        fld = (
          // <Select
          //   labelId="demo-simple-select-label"
          //   name="categoryId"
          //   id="categoryId"
          //   value={o?.[k.key] ?? ""}
          //   label="Loại"
          //   onChange={(e) => {
          //     let cloneData = [...data];
          //     cloneData[i][k.key] = e.target.value;

          //     let categ = dataCate.find((i) => e.target.value === i._id);
          //     if (categ) {
          //       cloneData[i].category = categ.name;
          //     }
          //     console.log("categ", categ);
          //     setData(cloneData);
          //   }}
          // >
          //   {dataCate?.map((i) => {
          //     return (
          //       <MenuItem value={i._id} key={i._id}>
          //         {i.name}
          //       </MenuItem>
          //     );
          //   })}
          // </Select>
          <Autocomplete
            // name="categoryId"
            id="categoryId"
            value={dataCate.find((i: any) => i._id === o?.[k.key])?.name ?? ""}
            disablePortal
            options={dataCate}
            sx={{ width: 300 }}
            getOptionLabel={(option) => {
              // Value selected with enter, right from the input
              if (typeof option === "string") {
                return option;
              }
              // Add "xxx" option created dynamically
              if (option.inputValue) {
                return option.inputValue;
              }
              // Regular option
              return option.name;
            }}
            renderInput={(params) => <TextField {...params} label="" />}
            onChange={(e, newValue) => {
              console.log("newValue", newValue);
              let cloneData: any = [...data];
              cloneData[i][k.key] = newValue._id;
              cloneData[i].category = newValue.name;
              cloneData[i].type = newValue.type;

              setData(cloneData);
            }}
          />
        );
        break;
      case "code":
        // fld = <BarCode value={o?.name ?? ""} />;
        break;
      default:
        fld = (
          <TextField
            id=""
            label=""
            value={o?.[k.key] ?? ""}
            onChange={(e): any => {
              let cloneData: any = [...data];
              cloneData[i][k.key] = e.target.value;
              setData(cloneData);
            }}
          />
        );
    }
    return fld;
  };
  const renderRows = (dataCate: any) => {
    return (
      Array.isArray(data) &&
      data?.map((o, i) => {
        return header?.map((k: any) => {
          return renderField(k?.key, i, o, k, dataCate);
        });
      })
    );
  };

  return (
    <div>
      <div>
        <button
          style={{ marginLeft: "20px" }}
          className="btn btn-secondary float-end mt-2 mb-2"
          onClick={() => setData([...data])}
        >
          Thêm hàng
        </button>
        <button
          style={{ marginLeft: "20px" }}
          className="btn btn-secondary float-end mt-2 mb-2"
          onClick={() =>
            postRequest({ url: "/product", data: data }).then((res) => {
              console.log(res);
            })
          }
        >
          Thêm
        </button>
      </div>
      <Table
        header={header}
        deleteFunc={(selected: any) => {
          let clone: any = [];
          selected.map((i: any) => {
            let item = data.find((element: any) => element._id === i);
            if (item) {
              clone.push(item);
            }
          });
          patchRequest({ url: "/product", data: clone });
          // setData(clone);
        }}
        updateFunc={(selected: any) => {
          let clone: any = [];

          selected.map((i: any) => {
            let item = data.find((element: any) => element._id === i);
            if (item) {
              clone.push(item);
            }
          });
          patchRequest({ url: "/product", data: clone });
        }}
        row={renderRows(dataCate)}
        dataList={data}
      />
    </div>
  );
};

export default ImportProduct;
