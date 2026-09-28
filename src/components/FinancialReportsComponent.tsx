import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  FileSpreadsheet,
  Printer,
  Calendar,
  Receipt,
  ArrowUpRight,
  CreditCard,
  Banknote,
  Search,
  Eye,
  PieChart
} from 'lucide-react';
import { Order, Product, Customer, InventoryTransaction, StoreSettings } from '../types';
import { formatVND, formatDate } from '../utils/storage';
import { exportSalesReportExcel, exportComprehensiveReportExcel } from '../utils/excelExporter';
import { printFinancialSummaryPDF, printReceipt } from '../utils/printReceipt';

interface FinancialReportsProps {
  orders: Order[];
  products: Product[];
  customers: Customer[];
  transactions: InventoryTransaction[];
  settings: StoreSettings;
}

export const FinancialReportsComponent: React.FC<FinancialReportsProps> = ({
  orders,
  products,
  customers,
  transactions,
  settings,
}) => {
  const [timeFilter, setTimeFilter] = useState<'today' | '7days' | 'month' | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filter orders by time
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return orders.filter(o => {
      const orderTime = new Date(o.createdAt).getTime();

      let matchTime = true;
      if (timeFilter === 'today') matchTime = orderTime >= todayStart;
      else if (timeFilter === '7days') matchTime = orderTime >= sevenDaysAgo;
      else if (timeFilter === 'month') matchTime = orderTime >= monthStart;

      const matchSearch =
        o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.customerPhone && o.customerPhone.includes(searchTerm));

      return matchTime && matchSearch;
    });
  }, [orders, timeFilter, searchTerm]);

  // Financial aggregates
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.finalTotal, 0);
  const totalCost = filteredOrders.reduce((sum, o) => sum + o.totalCost, 0);
  const totalProfit = filteredOrders.reduce((sum, o) => sum + o.profit, 0);
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  const totalCashCollected = filteredOrders
    .filter(o => o.paymentMethod === 'cash')
    .reduce((sum, o) => sum + o.amountPaid, 0);
  const totalTransferCollected = filteredOrders
    .filter(o => o.paymentMethod === 'transfer')
    .reduce((sum, o) => sum + o.amountPaid, 0);
  const totalNewDebts = filteredOrders.reduce((sum, o) => sum + o.debtAmount, 0);

  // Best selling products in selected range
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; totalRevenue: number; profit: number }>();
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const current = map.get(item.productId) || { name: item.name, quantity: 0, totalRevenue: 0, profit: 0 };
        current.quantity += item.quantity;
        current.totalRevenue += item.subtotal;
        current.profit += (item.customPrice - item.costPrice) * item.quantity;
        map.set(item.productId, current);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [filteredOrders]);

  const handlePrintSalesPDF = () => {
    const summaryItems = [
      { label: 'Số đơn bán ra', value: `${filteredOrders.length} đơn` },
      { label: 'TỔNG DOANH THU', value: formatVND(totalRevenue), highlight: true },
      { label: 'Tiền vốn hàng bán', value: formatVND(totalCost) },
      { label: 'LỢI NHUẬN RÒNG', value: formatVND(totalProfit), highlight: true },
      { label: 'Tỷ suất sinh lời', value: `${profitMargin}%` },
    ];

    const headers = ['STT', 'Mã Đơn', 'Ngày Giờ', 'Khách hàng', 'Thành Tiền', 'Hình Thức', 'Vốn Đơn', 'Lợi Nhuận'];
    const rows = filteredOrders.map((o, idx) => [
      String(idx + 1),
      o.orderNumber,
      formatDate(o.createdAt),
      o.customerName || 'Khách lẻ',
      formatVND(o.finalTotal),
      o.paymentMethod === 'cash' ? 'Tiền mặt' : o.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Khác/Nợ',
      formatVND(o.totalCost),
      formatVND(o.profit),
    ]);

    printFinancialSummaryPDF('BÁO CÁO DOANH THU & LỢI NHUẬN BÁN HÀNG', summaryItems, headers, rows, settings);
  };

  return (
    <div className="p-3 md:p-6 space-y-5 bg-slate-50 min-h-full">
      {/* Time Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Calendar className="w-4 h-4 text-sky-600 mr-1 shrink-0" />
          <span className="text-xs font-semibold text-slate-700 mr-2 shrink-0">Kỳ báo cáo:</span>
          {(['today', '7days', 'month', 'all'] as const).map(period => (
            <button
              key={period}
              onClick={() => setTimeFilter(period)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                timeFilter === period
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {period === 'today'
                ? 'Hôm nay'
                : period === '7days'
                ? '7 ngày gần nhất'
                : period === 'month'
                ? 'Tháng này'
                : 'Tất cả thời gian'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportSalesReportExcel(filteredOrders, settings.storeName)}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Xuất Excel Đơn
          </button>

          <button
            onClick={() =>
              exportComprehensiveReportExcel(products, orders, customers, transactions, settings)
            }
            className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Báo cáo tổng thể
          </button>

          <button
            onClick={handlePrintSalesPDF}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Printer className="w-4 h-4" /> In / PDF
          </button>
        </div>
      </div>

      {/* Main KPI Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">TỔNG DOANH THU</div>
          <div className="text-xl md:text-2xl font-bold text-sky-700 mt-1">
            {formatVND(totalRevenue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Từ {filteredOrders.length} đơn hàng bán ra
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">LỢI NHUẬN RÒNG (LÃI)</div>
          <div className="text-xl md:text-2xl font-bold text-emerald-600 mt-1">
            {formatVND(totalProfit)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5 font-semibold">
            Tỷ suất sinh lời: {profitMargin}%
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">TIỀN VỐN HÀNG ĐÃ BÁN</div>
          <div className="text-xl md:text-2xl font-bold text-slate-700 mt-1">
            {formatVND(totalCost)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Giá gốc nhập kho của số hàng đã bán
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">PHÁT SINH GHI NỢ MỚI</div>
          <div className="text-xl md:text-2xl font-bold text-rose-600 mt-1">
            {formatVND(totalNewDebts)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Số tiền khách chưa thanh toán từ các đơn này
          </div>
        </div>
      </div>

      {/* Breakdown by Payment Method & Top products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Payment Methods */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-sky-600" /> Dòng tiền thu về
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-700">Thu tiền mặt:</span>
              </div>
              <span className="font-bold text-emerald-700 text-sm">{formatVND(totalCashCollected)}</span>
            </div>

            <div className="p-3 bg-sky-50/60 rounded-lg border border-sky-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-sky-600" />
                <span className="font-semibold text-slate-700">Chuyển khoản:</span>
              </div>
              <span className="font-bold text-sky-700 text-sm">{formatVND(totalTransferCollected)}</span>
            </div>

            <div className="p-3 bg-rose-50/60 rounded-lg border border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-rose-600" />
                <span className="font-semibold text-slate-700">Cho nợ lại:</span>
              </div>
              <span className="font-bold text-rose-700 text-sm">{formatVND(totalNewDebts)}</span>
            </div>
          </div>
        </div>

        {/* Top 5 Products */}
        <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-emerald-600" /> Mặt hàng bán chạy nhất
            </span>
            <span className="text-xs text-slate-400 font-normal">Theo doanh thu bán</span>
          </h3>

          <div className="space-y-2 text-xs">
            {topProducts.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-800">{p.name}</div>
                    <div className="text-[11px] text-slate-400">Đã bán: <strong>{p.quantity}</strong> món</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-sky-700">{formatVND(p.totalRevenue)}</div>
                  <div className="text-[11px] text-emerald-600 font-medium">Lãi: +{formatVND(p.profit)}</div>
                </div>
              </div>
            ))}

            {topProducts.length === 0 && (
              <div className="py-6 text-center text-slate-400 text-xs">
                Chưa có dữ liệu bán hàng trong khoảng thời gian này
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-sky-600" /> Danh sách hóa đơn chi tiết ({filteredOrders.length})
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn, tên khách..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-3">Mã đơn</th>
                <th className="py-3 px-3">Thời gian</th>
                <th className="py-3 px-3">Khách hàng</th>
                <th className="py-3 px-3 text-right">Tổng thanh toán</th>
                <th className="py-3 px-3">Hình thức</th>
                <th className="py-3 px-3 text-right">Ghi nợ</th>
                <th className="py-3 px-3 text-right">Lợi nhuận</th>
                <th className="py-3 px-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-sky-700">
                    {order.orderNumber}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">{formatDate(order.createdAt)}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-slate-800">
                      {order.customerName || 'Khách lẻ'}
                    </span>
                    {order.customerPhone && (
                      <span className="text-[11px] text-slate-400 block font-mono">{order.customerPhone}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {formatVND(order.finalTotal)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      order.paymentMethod === 'cash'
                        ? 'bg-emerald-50 text-emerald-700'
                        : order.paymentMethod === 'transfer'
                        ? 'bg-sky-50 text-sky-700'
                        : 'bg-purple-50 text-purple-700'
                    }`}>
                      {order.paymentMethod === 'cash' ? 'Tiền mặt' : order.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Khác/Nợ'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {order.debtAmount > 0 ? (
                      <span className="font-bold text-rose-600">{formatVND(order.debtAmount)}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                    +{formatVND(order.profit)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-1 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded"
                        title="Xem chi tiết đơn"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => printReceipt(order, settings)}
                        className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        title="In lại hóa đơn"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Không tìm thấy hóa đơn nào trong khoảng thời gian đã chọn.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Xem chi tiết hóa đơn */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-2">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Chi tiết hóa đơn bán hàng</h3>
                <span className="font-mono text-xs text-sky-700 font-bold">{selectedOrder.orderNumber}</span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Thời gian tạo:</span>
                <span className="font-semibold text-slate-800">{formatDate(selectedOrder.createdAt)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Khách hàng:</span>
                <span className="font-bold text-slate-900">{selectedOrder.customerName || 'Khách lẻ'}</span>
              </div>

              {/* Items List */}
              <div className="border border-slate-200 rounded-lg overflow-hidden my-2">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-[11px]">
                    <tr>
                      <th className="p-2">Hàng hóa</th>
                      <th className="p-2 text-center">SL</th>
                      <th className="p-2 text-right">Giá bán</th>
                      <th className="p-2 text-right">T.Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items.map((item, i) => (
                      <tr key={i}>
                        <td className="p-2 font-medium text-slate-800">
                          {item.name}
                          {item.discountValue > 0 && (
                            <span className="block text-[10px] text-rose-600">
                              (Giảm {item.discountType === 'percentage' ? `${item.discountValue}%` : formatVND(item.discountValue)})
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center">{item.quantity} {item.unit}</td>
                        <td className="p-2 text-right">{formatVND(item.customPrice)}</td>
                        <td className="p-2 text-right font-semibold">{formatVND(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Tiền hàng ban đầu:</span>
                  <span>{formatVND(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discountValue > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Giảm giá hóa đơn:</span>
                    <span>-{formatVND(selectedOrder.discountValue)}</span>
                  </div>
                )}
                {selectedOrder.pointsDiscountAmount && selectedOrder.pointsDiscountAmount > 0 ? (
                  <div className="flex justify-between text-amber-600 font-semibold">
                    <span>Đổi {selectedOrder.pointsRedeemed} điểm thưởng:</span>
                    <span>-{formatVND(selectedOrder.pointsDiscountAmount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-100">
                  <span>TỔNG KHÁCH TRẢ:</span>
                  <span className="text-sky-700">{formatVND(selectedOrder.finalTotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Khách đã đưa:</span>
                  <span>{formatVND(selectedOrder.amountPaid)}</span>
                </div>
                {selectedOrder.debtAmount > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Ghi nợ đơn này:</span>
                    <span>{formatVND(selectedOrder.debtAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-100">
                  <span>Tiền vốn đơn hàng:</span>
                  <span>{formatVND(selectedOrder.totalCost)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700 bg-emerald-50 p-2 rounded">
                  <span>LỢI NHUẬN CỦA ĐƠN:</span>
                  <span>+{formatVND(selectedOrder.profit)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 text-xs font-semibold"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  printReceipt(selectedOrder, settings);
                  setSelectedOrder(null);
                }}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow"
              >
                <Printer className="w-3.5 h-3.5" /> In phiếu tính tiền
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
