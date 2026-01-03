import React, { useEffect, useState } from "react";
import Table from "./common/Table";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { getRequest, patchRequest } from "./common/ApiMethod";

import { InputFileUpload } from "./common/UploadIcon";

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

const ImportCategory = () => {
  const ref = React.useRef();
  const header = [
    { name: "STT", key: "stt" },
    { name: "Hình ảnh", key: "image" },
    { name: "Tên", key: "name" },
  ];

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
          setData(res.categorys);
        });
        // const json = await response.json();
        // console.log(json);
      } catch (error) {
        console.log("error: " + error);
      }
    };

    loadData();
  }, []);
  const renderField = (fldName: any, i: any, o: any, k: any) => {
    let fld: any = "";
    console.log(o.stt);
    switch (fldName) {
      case "stt":
        fld = o.stt?.length > 0 ? o.stt : i + 1;
        break;
      case "thumbnail":
        fld = (
          <>
            <img
              src={o.image}
              style={{ height: 80, width: 80, marginRight: 20 }}
              alt="Red dot"
            />
            <input
              type="file"
              name="myImage"
              accept="image/*, .heic"
              onChange={async (e: any) => {
                let cloneData: any = [...data];
                console.log(e.target.files[0]);
                const result = await toBase64(e.target.files[0]);
                cloneData[i].image = result;
                setData(cloneData);
              }}
            />
            <InputFileUpload
              onChange={async (e: any) => {
                let cloneData: any = [...data];
                console.log(e.target.files[0]);
                const result = await toBase64(e.target.files[0]);
                cloneData[i].image = result;
                setData(cloneData);
              }}
              accept="image/*, .heic"
            />
          </>
        );
        break;
      case "dvt":
        fld = (
          <Select
            labelId="demo-simple-select-label"
            name="dvt"
            id="dvt"
            value={o?.[k.key] ?? ""}
            label="Đơn vị tính"
            onChange={(e) => {
              let cloneData: any = [...data];
              cloneData[i][k.key] = e.target.value;
              setData(cloneData);
            }}
          >
            <MenuItem value="Cái">Cái</MenuItem>
            <MenuItem value="Đôi">Đôi</MenuItem>
            <MenuItem value="Vòng">Vòng</MenuItem>
            <MenuItem value="Sợi">Sợi</MenuItem>
          </Select>
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
            onChange={(e) => {
              let cloneData: any = [...data];
              cloneData[i][k.key] = e.target.value;
              setData(cloneData);
            }}
          />
        );
    }
    return fld;
  };
  const renderRows = () => {
    return (
      Array.isArray(data) &&
      data?.map((o, i) => {
        return header?.map((k) => {
          return renderField(k?.key, i, o, k);
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
          onClick={() =>
            setData([
              ...data,
              {
                id: data.length + 1,
                key: data.length + 1,
                name: "",
                image: "",
              },
            ])
          }
        >
          Thêm hàng
        </button>
        <button
          style={{ marginLeft: "20px" }}
          className="btn btn-secondary float-end mt-2 mb-2"
          onClick={() => console.log(data)}
        >
          Thêm
        </button>
      </div>
      <Table
        header={header}
        deleteFunc={(selected: any) => {
          let clone = [...data];
          selected.map((i: any) => {
            clone.splice(i, 1);
          });

          setData(clone);
        }}
        updateFunc={(selected: any) => {
          let clone: any = [];
          selected.map((i: any) => {
            let item = data[i - 1];
            if (item) {
              clone.push(item);
            }
          });
          patchRequest({ url: "/category", data: clone });
          console.log(clone, selected);
        }}
        row={renderRows()}
        dataList={data}
      />
    </div>
  );
};

export default ImportCategory;
