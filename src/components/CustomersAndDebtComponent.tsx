import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  FileSpreadsheet,
  Printer,
  Phone,
  MapPin,
  Award,
  CreditCard,
  Banknote,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  History
} from 'lucide-react';
import { Customer, DebtPayment, StoreSettings, Order } from '../types';
import { formatVND, formatDate } from '../utils/storage';
import { exportCustomerDebtsExcel } from '../utils/excelExporter';
import { printFinancialSummaryPDF } from '../utils/printReceipt';

interface CustomersAndDebtProps {
  customers: Customer[];
  debtPayments: DebtPayment[];
  orders: Order[];
  settings: StoreSettings;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onRecordDebtPayment: (payment: DebtPayment, updatedCustomer: Customer) => void;
}

export const CustomersAndDebtComponent: React.FC<CustomersAndDebtProps> = ({
  customers,
  debtPayments,
  orders,
  settings,
  onAddCustomer,
  onUpdateCustomer,
  onRecordDebtPayment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'customers' | 'history'>('customers');
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);

  // Modal create/edit customer
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [initialDebt, setInitialDebt] = useState<number>(0);
  const [points, setPoints] = useState<number>(0);

  // Modal Pay Debt
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [targetCustomer, setTargetCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [paymentNote, setPaymentNote] = useState('');

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchDebt = filterDebtOnly ? c.totalDebt > 0 : true;
      return matchSearch && matchDebt;
    });
  }, [customers, searchTerm, filterDebtOnly]);

  // Aggregate stats
  const totalReceivables = customers.reduce((sum, c) => sum + c.totalDebt, 0);
  const debtorsCount = customers.filter(c => c.totalDebt > 0).length;
  const totalPointsInSystem = customers.reduce((sum, c) => sum + c.points, 0);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setAddress('');
    setInitialDebt(0);
    setPoints(0);
    setIsCustomerModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setAddress(c.address || '');
    setInitialDebt(c.totalDebt);
    setPoints(c.points);
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingCustomer) {
      const updated: Customer = {
        ...editingCustomer,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        totalDebt: Number(initialDebt) || 0,
        points: Number(points) || 0,
      };
      onUpdateCustomer(updated);
    } else {
      const newCust: Customer = {
        id: 'cust-' + Date.now(),
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        points: Number(points) || 0,
        totalDebt: Number(initialDebt) || 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
      };
      onAddCustomer(newCust);
    }

    setIsCustomerModalOpen(false);
  };

  const openPayDebtModal = (customer: Customer) => {
    setTargetCustomer(customer);
    setPaymentAmount(customer.totalDebt);
    setPaymentMethod('cash');
    setPaymentNote('Khách trả nợ');
    setIsPaymentModalOpen(true);
  };

  const handleConfirmDebtPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCustomer || paymentAmount <= 0) return;

    const remainingDebt = Math.max(0, targetCustomer.totalDebt - paymentAmount);
    const updatedCustomer: Customer = {
      ...targetCustomer,
      totalDebt: remainingDebt,
    };

    const paymentRecord: DebtPayment = {
      id: 'pay-' + Date.now(),
      date: new Date().toISOString(),
      customerId: targetCustomer.id,
      customerName: targetCustomer.name,
      amountPaid: paymentAmount,
      paymentMethod,
      remainingDebt,
      note: paymentNote.trim(),
    };

    onRecordDebtPayment(paymentRecord, updatedCustomer);
    setIsPaymentModalOpen(false);
  };

  const handlePrintDebtPDF = () => {
    const summaryItems = [
      { label: 'Tổng khách ghi sổ', value: `${customers.length} người` },
      { label: 'Số khách đang nợ', value: `${debtorsCount} người`, highlight: true },
      { label: 'TỔNG TIỀN NỢ PHẢI THU', value: formatVND(totalReceivables), highlight: true },
      { label: 'Tổng điểm thưởng cấp', value: `${totalPointsInSystem} điểm` },
    ];

    const headers = ['STT', 'Họ và tên khách hàng', 'Số điện thoại', 'Địa chỉ / Ghi chú', 'Điểm tích', 'Số nợ hiện tại (VNĐ)'];
    const rows = customers.filter(c => c.totalDebt > 0).map((c, idx) => [
      String(idx + 1),
      c.name,
      c.phone,
      c.address || '-',
      String(c.points),
      formatVND(c.totalDebt),
    ]);

    printFinancialSummaryPDF('SỔ TỔNG HỢP CÔNG NỢ KHÁCH HÀNG', summaryItems, headers, rows, settings);
  };

  return (
    <div className="p-3 md:p-6 space-y-5 bg-slate-50 min-h-full">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Tổng nợ cần thu hồi</div>
            <div className="text-xl md:text-2xl font-bold text-rose-600 mt-1">
              {formatVND(totalReceivables)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Từ {debtorsCount} khách hàng đang nợ</div>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Tổng khách hàng</div>
            <div className="text-xl md:text-2xl font-bold text-slate-800 mt-1">
              {customers.length} khách
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Khách quen & mua chịu</div>
          </div>
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Tổng điểm tích lũy</div>
            <div className="text-xl md:text-2xl font-bold text-amber-600 mt-1">
              {totalPointsInSystem} điểm
            </div>
            <div className="text-[11px] text-amber-700 mt-0.5">
              Tương đương {formatVND(totalPointsInSystem * (settings.pointRedemptionValue || 100))}
            </div>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Action Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'customers' ? 'bg-white shadow text-sky-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" /> Danh sách khách & Công nợ
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'history' ? 'bg-white shadow text-sky-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-4 h-4" /> Lịch sử thanh toán thu nợ
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportCustomerDebtsExcel(customers, debtPayments, settings.storeName)}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-4 h-4" /> Xuất Excel nợ
            </button>

            <button
              onClick={handlePrintDebtPDF}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" /> In / PDF
            </button>

            <button
              onClick={openCreateModal}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Thêm khách hàng
            </button>
          </div>
        </div>

        {activeTab === 'customers' ? (
          <div>
            {/* Search and filters */}
            <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên khách hàng, số điện thoại, địa chỉ..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={filterDebtOnly}
                  onChange={e => setFilterDebtOnly(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span className={filterDebtOnly ? 'text-rose-600 font-bold' : ''}>
                  Chỉ hiện khách đang có nợ ({debtorsCount})
                </span>
              </label>
            </div>

            {/* Customers table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3">Họ tên khách</th>
                    <th className="py-3 px-3">Liên hệ</th>
                    <th className="py-3 px-3 text-center">Điểm thưởng</th>
                    <th className="py-3 px-3 text-right">Tổng mua lũy kế</th>
                    <th className="py-3 px-3 text-right">NỢ HIỆN TẠI</th>
                    <th className="py-3 px-3 text-center">Thu nợ</th>
                    <th className="py-3 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                        <div className="text-[11px] text-slate-400">Tham gia: {formatDate(c.createdAt)}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 font-medium text-slate-700">
                          <Phone className="w-3 h-3 text-slate-400" /> {c.phone || 'Chưa có SĐT'}
                        </div>
                        {c.address && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" /> {c.address}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 font-bold rounded-full border border-amber-200">
                          ★ {c.points} điểm
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700">
                        {formatVND(c.totalSpent)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {c.totalDebt > 0 ? (
                          <span className="text-base font-extrabold text-rose-600 block">
                            {formatVND(c.totalDebt)}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600">
                            Không nợ (0đ)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {c.totalDebt > 0 ? (
                          <button
                            onClick={() => openPayDebtModal(c)}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg font-bold text-xs inline-flex items-center gap-1 shadow-sm transition"
                          >
                            <Banknote className="w-3.5 h-3.5" /> Thu nợ
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => openEditModal(c)}
                          className="px-2.5 py-1 text-sky-600 hover:bg-sky-50 rounded font-semibold text-xs"
                        >
                          Sửa
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Không tìm thấy khách hàng nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Payment History Tab */
          <div>
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-500 flex justify-between items-center">
              <span>Danh sách các lần khách trả bớt nợ hoặc thanh toán hết công nợ</span>
              <span className="font-semibold">{debtPayments.length} giao dịch</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3">Thời gian</th>
                    <th className="py-3 px-3">Khách hàng</th>
                    <th className="py-3 px-3 text-right">Số tiền thu</th>
                    <th className="py-3 px-3">Hình thức</th>
                    <th className="py-3 px-3 text-right">Nợ còn lại sau trả</th>
                    <th className="py-3 px-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {debtPayments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 text-slate-500">{formatDate(p.date)}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{p.customerName}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600 text-sm">
                        +{formatVND(p.amountPaid)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          p.paymentMethod === 'cash' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'
                        }`}>
                          {p.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                        {formatVND(p.remainingDebt)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{p.note || '-'}</td>
                    </tr>
                  ))}

                  {debtPayments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Chưa có lịch sử thu nợ nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Thêm / Sửa khách hàng */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200">
            <h3 className="font-bold text-base text-slate-800 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-600" />
              {editingCustomer ? 'Chỉnh sửa thông tin khách hàng' : 'Thêm khách hàng mới'}
            </h3>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tên khách hàng (*)</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Cô Năm Tạp Dề, Anh Tuấn..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Số điện thoại</label>
                <input
                  type="text"
                  placeholder="VD: 0912 345 678"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Địa chỉ / Ghi nhớ vị trí</label>
                <input
                  type="text"
                  placeholder="VD: Hẻm 12, số nhà 4..."
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số nợ hiện tại (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    value={initialDebt}
                    onChange={e => setInitialDebt(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Điểm tích lũy ban đầu</label>
                  <input
                    type="number"
                    min="0"
                    value={points}
                    onChange={e => setPoints(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-amber-600"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-2 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow"
                >
                  {editingCustomer ? 'Lưu thay đổi' : 'Tạo khách hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Thu tiền nợ */}
      {isPaymentModalOpen && targetCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-slate-200">
            <h3 className="font-bold text-base text-slate-800 mb-1 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" /> Thu nợ khách hàng
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Khách hàng: <strong className="text-slate-800">{targetCustomer.name}</strong> - Hiện nợ: <strong className="text-rose-600 font-bold">{formatVND(targetCustomer.totalDebt)}</strong>
            </p>

            <form onSubmit={handleConfirmDebtPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Số tiền khách trả (VNĐ)</label>
                <input
                  type="number"
                  min="1000"
                  max={targetCustomer.totalDebt}
                  required
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-base text-emerald-700"
                />
              </div>

              {/* Quick suggestions */}
              <div className="flex gap-1.5 justify-end">
                <button
                  type="button"
                  onClick={() => setPaymentAmount(targetCustomer.totalDebt)}
                  className="px-2 py-1 bg-emerald-50 text-emerald-700 font-bold rounded text-[11px] hover:bg-emerald-100"
                >
                  Trả hết ({formatVND(targetCustomer.totalDebt)})
                </button>
                {targetCustomer.totalDebt > 50000 && (
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(Math.round(targetCustomer.totalDebt / 2))}
                    className="px-2 py-1 bg-slate-100 text-slate-700 font-semibold rounded text-[11px] hover:bg-slate-200"
                  >
                    Trả 50%
                  </button>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Hình thức thanh toán</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1 border ${
                      paymentMethod === 'cash' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" /> Tiền mặt
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1 border ${
                      paymentMethod === 'transfer' ? 'bg-sky-50 border-sky-500 text-sky-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Chuyển khoản
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center font-medium">
                <span className="text-slate-600">Nợ còn lại sau trả:</span>
                <span className="font-bold text-slate-900">
                  {formatVND(Math.max(0, targetCustomer.totalDebt - paymentAmount))}
                </span>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow"
                >
                  Ghi nhận thu nợ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
