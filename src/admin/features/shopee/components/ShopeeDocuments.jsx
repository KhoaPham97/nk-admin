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
 const [chart,setChart]=useState(null); const [chartLoading,setChartLoading]=useState(false); const [chartError,setChartError]=useState("");
 const load=useCallback(async()=>{ if(!selectedShopId){setItems([]);return;} setLoading(true);setError("");try{const r=unwrap(await shopeeApi.getDocuments({shopId:selectedShopId}));setItems(Array.isArray(r.data)?r.data:Array.isArray(r)?r:[]);}catch(e){setError(e.message||"Không tải được danh sách chứng từ.");}finally{setLoading(false);}},[selectedShopId]);
 const loadChart=useCallback(async()=>{if(!selectedShopId){setChart(null);return;}setChartLoading(true);setChartError("");try{const r=unwrap(await shopeeApi.getDocumentRevenueChart({shopId:selectedShopId}));setChart(r);}catch(e){setChartError(e.message||"Không tổng hợp được doanh thu.");}finally{setChartLoading(false);}},[selectedShopId]);
 useEffect(()=>{load();loadChart();},[load,loadChart]);
 const sync=async()=>{setSyncing(true);setError("");setNotice("");try{const response=await shopeeApi.syncDocuments({shopId:selectedShopId,month});const payload=response?.data||response||{};const results=Array.isArray(payload.data)?payload.data:[];const failures=results.filter(x=>x.status==="failed");if(failures.length){setError(failures.map(x=>`${x.kind==="income_statement"?"Bảng kê PDF":"Báo cáo Excel"}: ${x.error||"Không tạo được"}`).join(" · "));}else{setNotice(payload.message||"Đã gửi yêu cầu Shopee.");}await load();await loadChart();}catch(e){setError(e.message||"Không tạo được báo cáo.");await load();await loadChart();}finally{setSyncing(false);}};
 const poll=async(doc)=>{setPolling(String(doc._id));setError("");try{await shopeeApi.pollDocument(doc._id,selectedShopId);await load();await loadChart();}catch(e){setError(e.message||"Không kiểm tra được trạng thái.");}finally{setPolling("");}};
 const download=async(doc)=>{try{const r=unwrap(await shopeeApi.getDocumentDownload(doc._id,selectedShopId));if(!r.url)throw new Error("Chưa có link tải.");window.open(r.url,"_blank","noopener,noreferrer");}catch(e){setError(e.message||"Không tải được file.");}};
 const view=async(doc)=>{setPreviewing(String(doc._id));setError("");try{const r=unwrap(await shopeeApi.getDocumentView(doc._id,selectedShopId));if(!r.htmlContent)throw new Error("Chứng từ chưa có bản xem HTML.");setPreview(r);await loadChart();}catch(e){setError(e.message||"Không mở được chứng từ.");}finally{setPreviewing("");}};
 return <div className="shopee-documents">
  <div className="sd-intro"><div className="sd-icon"><FileText size={23}/></div><div><h3>Chứng từ & báo cáo Shopee</h3><p>Tự yêu cầu báo cáo từ Shopee, theo dõi trạng thái và lưu file gốc trong kho Cloudinary của Nhật Khang Bike.</p></div></div>
  {!selectedShopId&&<div className="sd-alert"><AlertCircle size={17}/>Vui lòng chọn gian hàng ở phía trên.</div>}
  {error&&<div className="sd-alert"><AlertCircle size={17}/>{error}</div>}{notice&&<div className="sd-success"><CheckCircle2 size={17}/>{notice}</div>}
  <section className="sd-panel"><strong>Tạo báo cáo theo tháng</strong><p>Gửi hai yêu cầu: bảng kê thu nhập PDF và báo cáo chi tiết các khoản đã quyết toán dạng Excel (gói ZIP).</p>
   <div className="sd-controls"><label>Tháng<input type="month" value={month} max={latestCompleteMonth()} onChange={e=>setMonth(e.target.value)}/></label><button disabled={!selectedShopId||syncing||!month} onClick={sync}><UploadCloud size={16}/>{syncing?"Đang gửi...":"Tạo / đồng bộ chứng từ"}</button><button className="sd-secondary" disabled={loading} onClick={load}><RefreshCw size={16}/>{loading?"Đang tải":"Làm mới"}</button></div>
   <small className="sd-note">Báo cáo PDF phải đúng kỳ tháng theo giờ Việt Nam. Shopee thường cần thời gian xử lý; Render sẽ tự kiểm tra các yêu cầu đang chờ mỗi 2 phút.</small>
  </section>
  <section className="sd-panel sd-revenue-panel">
   <div className="sd-list-head"><div><strong>Biểu đồ doanh thu tổng hợp Shopee</strong><p className="sd-chart-subtitle">Tổng hợp từ tất cả báo cáo thu nhập Excel đã đồng bộ trong gian hàng.</p></div><button className="sd-chart-refresh" disabled={chartLoading||!selectedShopId} onClick={loadChart}><RefreshCw size={14}/>{chartLoading?"Đang tính...":"Cập nhật"}</button></div>
   {chartError&&<div className="sd-alert"><AlertCircle size={16}/>{chartError}</div>}
   {chartLoading&&!chart?<div className="sd-empty">Đang đọc dữ liệu từ các chứng từ...</div>:chart&&<>
    <div className="sd-kpis">
     <div className="sd-kpi"><span>Tổng doanh thu đọc được</span><strong>{Number(chart.totalRevenue||0).toLocaleString("vi-VN")} ₫</strong></div>
     <div className="sd-kpi"><span>Tháng có dữ liệu</span><strong>{chart.months?.length||0}</strong></div>
     <div className="sd-kpi"><span>File đã phân tích</span><strong>{chart.parsedFiles||0}/{chart.detailedFiles||0}</strong></div>
     <div className="sd-kpi"><span>Dòng giao dịch</span><strong>{(chart.months||[]).reduce((n,x)=>n+Number(x.transactions||0),0).toLocaleString("vi-VN")}</strong></div>
    </div>
    {chart.months?.length?<div className="sd-chart">
     <div className="sd-chart-axis"><span>{Math.max(...chart.months.map(x=>Number(x.revenue)||0)).toLocaleString("vi-VN")} ₫</span><span>0 ₫</span></div>
     <div className="sd-chart-bars">{chart.months.map(item=>{const max=Math.max(1,...chart.months.map(x=>Number(x.revenue)||0));const h=Math.max(3,(Number(item.revenue)||0)/max*100);return <div className="sd-chart-col" key={item.month} title={item.month+": "+Number(item.revenue||0).toLocaleString("vi-VN")+" ₫"}><strong>{Number(item.revenue||0).toLocaleString("vi-VN")} ₫</strong><div className="sd-chart-track"><div className="sd-chart-bar" style={{height:h+"%"}}/></div><span>{item.month}</span><small>{item.files} file · {item.transactions} dòng</small></div>;})}</div>
    </div>:<div className="sd-empty">Chưa tìm thấy cột doanh thu phù hợp trong các báo cáo Excel đã lưu. Hãy mở chứng từ cũ bằng “Tạo bản xem” để trích xuất dữ liệu, hoặc đồng bộ lại báo cáo.</div>}
    {!!chart.unparsedFiles?.length&&<div className="sd-unparsed"><strong>{chart.unparsedFiles.length} file chưa đọc được doanh thu</strong>{chart.unparsedFiles.map((x,i)=><small key={i}>{x.periodKey} · {x.fileName}: {x.reason}</small>)}</div>}
    <small className="sd-note">Biểu đồ chỉ cộng dữ liệu từ báo cáo thu nhập chi tiết (Excel/ZIP), không cộng thêm PDF bảng kê tháng để tránh tính trùng. Đây là doanh thu nhận diện được từ cột dữ liệu trong file, chưa phải lợi nhuận sau phí.</small>
   </>}
  </section>
  <section className="sd-panel"><div className="sd-list-head"><strong>Kho chứng từ</strong><span>{items.length} yêu cầu</span></div>
   {loading?<div className="sd-empty">Đang tải...</div>:!items.length?<div className="sd-empty">Chưa có báo cáo. Chọn tháng rồi bấm “Tạo / đồng bộ chứng từ”.</div>:
   <div className="sd-table-wrap"><table><thead><tr><th>Loại chứng từ</th><th>Kỳ</th><th>Trạng thái</th><th>Tên file / mã yêu cầu</th><th>Thao tác</th></tr></thead><tbody>{items.map(doc=><tr key={doc._id}>
    <td><span className="sd-kind">{doc.kind==="income_statement"?<FileText size={17}/>:<FileSpreadsheet size={17}/>} {title(doc.kind)}</span></td><td>{doc.periodKey}</td>
    <td><span className={`sd-status ${doc.status}`}>{statusText(doc.status)}</span>{doc.error&&<small className="sd-error">{doc.error}</small>}</td>
    <td>{doc.fileName|| (doc.remoteId?`ID ${doc.remoteId}`:"—")}</td><td><div className="sd-actions">{["requested","processing"].includes(doc.status)&&<button className="sd-secondary" disabled={polling===String(doc._id)} onClick={()=>poll(doc)}><Clock3 size={14}/>{polling===String(doc._id)?"Đang kiểm tra":"Kiểm tra"}</button>}{doc.filePublicId&&<><button className="sd-secondary" disabled={previewing===String(doc._id)} title={doc.htmlAvailable?"Xem trực tiếp dạng HTML":"Tạo bản xem HTML từ chứng từ đã lưu"} onClick={()=>view(doc)}><Eye size={14}/>{previewing===String(doc._id)?"Đang mở...":doc.htmlAvailable?"Xem trực tiếp":"Tạo bản xem"}</button><button onClick={()=>download(doc)}><Download size={14}/>Tải file gốc</button></>}</div></td>
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
