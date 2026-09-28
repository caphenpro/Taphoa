import * as XLSX from 'xlsx';
import { Product, Order, InventoryTransaction, Customer, DebtPayment, StoreSettings } from '../types';
import { formatDate } from './storage';

export function exportInventoryExcel(products: Product[], storeName: string) {
  const data = products.map((p, idx) => ({
    'STT': idx + 1,
    'Mã sản phẩm / Barcode': p.code,
    'Tên hàng hóa': p.name,
    'Nhóm hàng': p.category,
    'Đơn vị tính': p.unit,
    'Tồn kho hiện tại': p.stock,
    'Giá vốn (VNĐ)': p.costPrice,
    'Giá bán niêm yết (VNĐ)': p.sellingPrice,
    'Tổng giá trị vốn tồn': p.stock * p.costPrice,
    'Tổng giá trị bán ước tính': p.stock * p.sellingPrice,
    'Chênh lệch lãi tiềm năng': (p.sellingPrice - p.costPrice) * p.stock,
    'Cảnh báo hết hàng': p.stock <= (p.minStockAlert || 5) ? 'CẦN NHẬP THÊM' : 'Đủ hàng',
    'Ghi chú': p.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'TonKho');

  const nowStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `BaoCao_TonKho_${storeName.replace(/\s+/g, '_')}_${nowStr}.xlsx`);
}

export function exportSalesReportExcel(orders: Order[], storeName: string) {
  const data = orders.map((o, idx) => ({
    'STT': idx + 1,
    'Mã đơn hàng': o.orderNumber,
    'Thời gian tạo': formatDate(o.createdAt),
    'Khách hàng': o.customerName || 'Khách lẻ',
    'Số ĐT': o.customerPhone || '',
    'Số mặt hàng': o.items.reduce((s, it) => s + it.quantity, 0),
    'Tiền hàng (chưa giảm)': o.subtotal,
    'Giảm giá đơn hàng': o.discountValue + (o.pointsDiscountAmount || 0),
    'Tổng thanh toán': o.finalTotal,
    'Khách đã trả': o.amountPaid,
    'Ghi nợ đơn này': o.debtAmount,
    'Hình thức trả': o.paymentMethod === 'cash' ? 'Tiền mặt' : o.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Hỗn hợp/Nợ',
    'Giá vốn đơn': o.totalCost,
    'Lợi nhuận ròng': o.profit,
    'Tỷ suất lợi nhuận (%)': o.finalTotal > 0 ? ((o.profit / o.finalTotal) * 100).toFixed(1) + '%' : '0%',
    'Ghi chú': o.note || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DoanhThu_LoiNhuan');

  const nowStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `BaoCao_DoanhThu_${storeName.replace(/\s+/g, '_')}_${nowStr}.xlsx`);
}

export function exportCustomerDebtsExcel(customers: Customer[], debtPayments: DebtPayment[], storeName: string) {
  const debtData = customers.filter(c => c.totalDebt > 0).map((c, idx) => ({
    'STT': idx + 1,
    'Tên khách hàng': c.name,
    'Số điện thoại': c.phone,
    'Địa chỉ': c.address || '',
    'Số tiền đang nợ (VNĐ)': c.totalDebt,
    'Điểm tích lũy': c.points,
    'Tổng doanh số đã mua': c.totalSpent,
    'Ngày tham gia': formatDate(c.createdAt)
  }));

  const historyData = debtPayments.map((p, idx) => ({
    'STT': idx + 1,
    'Thời gian': formatDate(p.date),
    'Khách hàng': p.customerName,
    'Số tiền trả (VNĐ)': p.amountPaid,
    'Hình thức': p.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản',
    'Nợ còn lại sau trả': p.remainingDebt,
    'Ghi chú': p.note || ''
  }));

  const workbook = XLSX.utils.book_new();
  const wsDebts = XLSX.utils.json_to_sheet(debtData.length > 0 ? debtData : [{ 'Thông báo': 'Hiện không có khách nào nợ' }]);
  XLSX.utils.book_append_sheet(workbook, wsDebts, 'DanhSachNo');

  const wsHistory = XLSX.utils.json_to_sheet(historyData.length > 0 ? historyData : [{ 'Thông báo': 'Chưa có lịch sử thu nợ' }]);
  XLSX.utils.book_append_sheet(workbook, wsHistory, 'LichSuThuNo');

  const nowStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `BaoCao_CongNo_${storeName.replace(/\s+/g, '_')}_${nowStr}.xlsx`);
}

export function exportComprehensiveReportExcel(
  products: Product[],
  orders: Order[],
  customers: Customer[],
  transactions: InventoryTransaction[],
  settings: StoreSettings
) {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const totalRevenue = orders.reduce((sum, o) => sum + o.finalTotal, 0);
  const totalCost = orders.reduce((sum, o) => sum + o.totalCost, 0);
  const totalProfit = orders.reduce((sum, o) => sum + o.profit, 0);
  const totalDebt = customers.reduce((sum, c) => sum + c.totalDebt, 0);
  const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);

  const summary = [
    { 'Chỉ số tài chính': 'Tên cửa hàng', 'Giá trị': settings.storeName },
    { 'Chỉ số tài chính': 'Ngày xuất báo cáo', 'Giá trị': formatDate(new Date().toISOString()) },
    { 'Chỉ số tài chính': 'Tổng số đơn hàng', 'Giá trị': orders.length },
    { 'Chỉ số tài chính': 'Tổng doanh thu bán hàng (VNĐ)', 'Giá trị': totalRevenue },
    { 'Chỉ số tài chính': 'Tổng tiền vốn hàng đã bán (VNĐ)', 'Giá trị': totalCost },
    { 'Chỉ số tài chính': 'TỔNG LỢI NHUẬN BÁN HÀNG (VNĐ)', 'Giá trị': totalProfit },
    { 'Chỉ số tài chính': 'Tỷ suất lợi nhuận gộp', 'Giá trị': totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) + '%' : '0%' },
    { 'Chỉ số tài chính': 'Tổng giá trị hàng tồn kho (giá vốn)', 'Giá trị': totalStockValue },
    { 'Chỉ số tài chính': 'Tổng công nợ khách hàng chưa thu', 'Giá trị': totalDebt },
    { 'Chỉ số tài chính': 'Tổng số sản phẩm đang quản lý', 'Giá trị': products.length },
    { 'Chỉ số tài chính': 'Tổng số khách hàng thân thiết', 'Giá trị': customers.length },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summary);
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'TongQuan_KinhDoanh');

  // Products Sheet
  const prodData = products.map((p, i) => ({
    'STT': i + 1,
    'Mã SP': p.code,
    'Tên hàng': p.name,
    'Đơn vị': p.unit,
    'Tồn kho': p.stock,
    'Giá vốn': p.costPrice,
    'Giá bán': p.sellingPrice,
    'Trị giá tồn': p.stock * p.costPrice,
  }));
  const wsProd = XLSX.utils.json_to_sheet(prodData);
  XLSX.utils.book_append_sheet(workbook, wsProd, 'KhoHang');

  // Orders Sheet
  const orderData = orders.map((o, i) => ({
    'STT': i + 1,
    'Mã đơn': o.orderNumber,
    'Ngày': formatDate(o.createdAt),
    'Khách': o.customerName || 'Khách lẻ',
    'Thành tiền': o.finalTotal,
    'Đã trả': o.amountPaid,
    'Nợ': o.debtAmount,
    'Lợi nhuận': o.profit,
    'Hình thức': o.paymentMethod,
  }));
  const wsOrders = XLSX.utils.json_to_sheet(orderData);
  XLSX.utils.book_append_sheet(workbook, wsOrders, 'ChiTietDonHang');

  const nowStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `BaoCao_TongHop_${settings.storeName.replace(/\s+/g, '_')}_${nowStr}.xlsx`);
}
