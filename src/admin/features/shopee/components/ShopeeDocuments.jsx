import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Download, Eye, FileSpreadsheet, FileText, RefreshCw, UploadCloud, X } from "lucide-react";
import { shopeeApi } from "../services/shopeeApi";
import "../styles/ShopeeDocuments.css";
const latestCompleteMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const unwrap = (v) => v?.data?.data || v?.data || v || {};
const title = (kind) => kind === "income_statement" ? "Bảng kê thu nhập (PDF)" : "Báo cáo thu nhập đã quyết toán (Excel)";
const statusText = (s) => ({requested:"Đã gửi yêu cầu",processing:"Shopee đang tạo file",ready:"Đã lưu chứng từ",downloaded:"Đã tải file",failed:"Lỗi"}[s] || s || "—");
export default function ShopeeDocuments({ selectedShopId }) {
 const [month,setMonth]=useState(latestCompleteMonth()); const [items,setItems]=useState([]);
 const [loading,setLoading]=useState(false); const [syncing,setSyncing]=useState(false);
 const [polling,setPolling]=useState(""); const [error,setError]=useState(""); const [notice,setNotice]=useState("");
 const [preview,setPreview]=useState(null); const [previewing,setPreviewing]=useState("");
 const load=useCallback(async()=>{ if(!selectedShopId){setItems([]);return;} setLoading(true);setError("");try{const r=unwrap(await shopeeApi.getDocuments({shopId:selectedShopId}));setItems(Array.isArray(r.data)?r.data:Array.isArray(r)?r:[]);}catch(e){setError(e.message||"Không tải được danh sách chứng từ.");}finally{setLoading(false);}},[selectedShopId]);
 useEffect(()=>{load();},[load]);
 const sync=async()=>{setSyncing(true);setError("");setNotice("");try{const response=await shopeeApi.syncDocuments({shopId:selectedShopId,month});const payload=response?.data||response||{};const results=Array.isArray(payload.data)?payload.data:[];const failures=results.filter(x=>x.status==="failed");if(failures.length){setError(failures.map(x=>`${x.kind==="income_statement"?"Bảng kê PDF":"Báo cáo Excel"}: ${x.error||"Không tạo được"}`).join(" · "));}else{setNotice(payload.message||"Đã gửi yêu cầu Shopee.");}await load();}catch(e){setError(e.message||"Không tạo được báo cáo.");await load();}finally{setSyncing(false);}};
 const poll=async(doc)=>{setPolling(String(doc._id));setError("");try{await shopeeApi.pollDocument(doc._id,selectedShopId);await load();}catch(e){setError(e.message||"Không kiểm tra được trạng thái.");}finally{setPolling("");}};
 const download=async(doc)=>{try{const r=unwrap(await shopeeApi.getDocumentDownload(doc._id,selectedShopId));if(!r.url)throw new Error("Chưa có link tải.");window.open(r.url,"_blank","noopener,noreferrer");}catch(e){setError(e.message||"Không tải được file.");}};
 const view=async(doc)=>{setPreviewing(String(doc._id));setError("");try{const r=unwrap(await shopeeApi.getDocumentView(doc._id,selectedShopId));if(!r.htmlContent)throw new Error("Chứng từ chưa có bản xem HTML.");setPreview(r);}catch(e){setError(e.message||"Không mở được chứng từ.");}finally{setPreviewing("");}};
 return <div className="shopee-documents">
  <div className="sd-intro"><div className="sd-icon"><FileText size={23}/></div><div><h3>Chứng từ & báo cáo Shopee</h3><p>Tự yêu cầu báo cáo từ Shopee, theo dõi trạng thái và lưu file gốc trong kho Cloudinary của Nhật Khang Bike.</p></div></div>
  {!selectedShopId&&<div className="sd-alert"><AlertCircle size={17}/>Vui lòng chọn gian hàng ở phía trên.</div>}
  {error&&<div className="sd-alert"><AlertCircle size={17}/>{error}</div>}{notice&&<div className="sd-success"><CheckCircle2 size={17}/>{notice}</div>}
  <section className="sd-panel"><strong>Tạo báo cáo theo tháng</strong><p>Gửi hai yêu cầu: bảng kê thu nhập PDF và báo cáo chi tiết các khoản đã quyết toán dạng Excel (gói ZIP).</p>
   <div className="sd-controls"><label>Tháng<input type="month" value={month} max={latestCompleteMonth()} onChange={e=>setMonth(e.target.value)}/></label><button disabled={!selectedShopId||syncing||!month} onClick={sync}><UploadCloud size={16}/>{syncing?"Đang gửi...":"Tạo / đồng bộ chứng từ"}</button><button className="sd-secondary" disabled={loading} onClick={load}><RefreshCw size={16}/>{loading?"Đang tải":"Làm mới"}</button></div>
   <small className="sd-note">Báo cáo PDF phải đúng kỳ tháng theo giờ Việt Nam. Shopee thường cần thời gian xử lý; Render sẽ tự kiểm tra các yêu cầu đang chờ mỗi 2 phút.</small>
  </section>
  <section className="sd-panel"><div className="sd-list-head"><strong>Kho chứng từ</strong><span>{items.length} yêu cầu</span></div>
   {loading?<div className="sd-empty">Đang tải...</div>:!items.length?<div className="sd-empty">Chưa có báo cáo. Chọn tháng rồi bấm “Tạo / đồng bộ chứng từ”.</div>:
   <div className="sd-table-wrap"><table><thead><tr><th>Loại chứng từ</th><th>Kỳ</th><th>Trạng thái</th><th>Tên file / mã yêu cầu</th><th>Thao tác</th></tr></thead><tbody>{items.map(doc=><tr key={doc._id}>
    <td><span className="sd-kind">{doc.kind==="income_statement"?<FileText size={17}/>:<FileSpreadsheet size={17}/>} {title(doc.kind)}</span></td><td>{doc.periodKey}</td>
    <td><span className={`sd-status ${doc.status}`}>{statusText(doc.status)}</span>{doc.error&&<small className="sd-error">{doc.error}</small>}</td>
    <td>{doc.fileName|| (doc.remoteId?`ID ${doc.remoteId}`:"—")}</td><td><div className="sd-actions">{["requested","processing"].includes(doc.status)&&<button className="sd-secondary" disabled={polling===String(doc._id)} onClick={()=>poll(doc)}><Clock3 size={14}/>{polling===String(doc._id)?"Đang kiểm tra":"Kiểm tra"}</button>}{doc.filePublicId&&<><button className="sd-secondary" disabled={previewing===String(doc._id)||!doc.htmlAvailable} title={doc.htmlAvailable?"Xem trực tiếp dạng HTML":"Chưa có bản HTML"} onClick={()=>view(doc)}><Eye size={14}/>{previewing===String(doc._id)?"Đang mở...":"Xem trực tiếp"}</button><button onClick={()=>download(doc)}><Download size={14}/>Tải file gốc</button></>}</div></td>
   </tr>)}</tbody></table></div>}
  </section>
  <div className="sd-footnote">File gốc được lưu dưới dạng tài nguyên Cloudinary có xác thực; bản xem HTML được tạo trên máy chủ và hiển thị trực tiếp trong trang.</div>
  {preview&&<div className="sd-preview-backdrop" role="dialog" aria-modal="true" aria-label="Xem chứng từ Shopee">
   <div className="sd-preview-modal"><div className="sd-preview-head"><div><strong>{title(preview.kind)}</strong><small>{preview.periodKey} · {preview.fileName}</small></div><button aria-label="Đóng" onClick={()=>setPreview(null)}><X size={19}/></button></div>
    <iframe className="sd-preview-frame" title="Nội dung chứng từ Shopee" srcDoc={preview.htmlContent} sandbox="" />
   </div>
  </div>}
 </div>;
}
