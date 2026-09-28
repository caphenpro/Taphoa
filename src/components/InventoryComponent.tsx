import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  FileSpreadsheet,
  Printer,
  Edit2,
  Trash2,
  AlertTriangle,
  History
} from 'lucide-react';
import { Product, InventoryTransaction, StoreSettings } from '../types';
import { formatVND, formatDate } from '../utils/storage';
import { exportInventoryExcel } from '../utils/excelExporter';
import { printFinancialSummaryPDF } from '../utils/printReceipt';

interface InventoryProps {
  products: Product[];
  transactions: InventoryTransaction[];
  settings: StoreSettings;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onStockTransaction: (transaction: InventoryTransaction) => void;
}

export const InventoryComponent: React.FC<InventoryProps> = ({
  products,
  transactions,
  settings,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onStockTransaction,
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'history'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Stock In/Out adjustment modal
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockModalType, setStockModalType] = useState<'import' | 'export_damage' | 'stock_adjustment'>('import');
  const [targetProduct, setTargetProduct] = useState<Product | null>(null);
  const [stockChangeQty, setStockChangeQty] = useState<number>(1);
  const [stockUnitCost, setStockUnitCost] = useState<number>(0);
  const [supplierName, setSupplierName] = useState('');
  const [stockNote, setStockNote] = useState('');

  // Form states for Product
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formUnit, setFormUnit] = useState('gói');
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formSellingPrice, setFormSellingPrice] = useState<number>(0);
  const [formStock, setFormStock] = useState<number>(0);
  const [formMinStockAlert, setFormMinStockAlert] = useState<number>(5);
  const [formNotes, setFormNotes] = useState('');

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;

      let matchStock = true;
      if (stockFilter === 'low') {
        matchStock = p.stock > 0 && p.stock <= (p.minStockAlert || 5);
      } else if (stockFilter === 'out') {
        matchStock = p.stock <= 0;
      }

      return matchSearch && matchCat && matchStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  // Stats calculation
  const totalStockItems = products.reduce((s, p) => s + p.stock, 0);
  const totalInventoryCapital = products.reduce((s, p) => s + (p.stock * p.costPrice), 0);
  const totalInventoryRetailValue = products.reduce((s, p) => s + (p.stock * p.sellingPrice), 0);
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= (p.minStockAlert || 5)).length;
  const outOfStockCount = products.filter(p => p.stock <= 0).length;

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormCode(String(Math.floor(1000000000000 + Math.random() * 9000000000000)));
    setFormName('');
    setFormCategory('Hàng tổng hợp');
    setFormUnit('cái');
    setFormCostPrice(0);
    setFormSellingPrice(0);
    setFormStock(0);
    setFormMinStockAlert(5);
    setFormNotes('');
    setIsProductModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormCode(p.code);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormUnit(p.unit);
    setFormCostPrice(p.costPrice);
    setFormSellingPrice(p.sellingPrice);
    setFormStock(p.stock);
    setFormMinStockAlert(p.minStockAlert || 5);
    setFormNotes(p.notes || '');
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) return;

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        code: formCode.trim(),
        name: formName.trim(),
        category: formCategory.trim(),
        unit: formUnit.trim(),
        costPrice: Number(formCostPrice) || 0,
        sellingPrice: Number(formSellingPrice) || 0,
        stock: Number(formStock) || 0,
        minStockAlert: Number(formMinStockAlert) || 5,
        notes: formNotes.trim(),
        updatedAt: new Date().toISOString(),
      };
      onUpdateProduct(updated);
    } else {
      const newProd: Product = {
        id: 'prod-' + Date.now(),
        code: formCode.trim(),
        name: formName.trim(),
        category: formCategory.trim(),
        unit: formUnit.trim(),
        costPrice: Number(formCostPrice) || 0,
        sellingPrice: Number(formSellingPrice) || 0,
        stock: Number(formStock) || 0,
        minStockAlert: Number(formMinStockAlert) || 5,
        notes: formNotes.trim(),
        updatedAt: new Date().toISOString(),
      };
      onAddProduct(newProd);

      // Record initial inventory transaction if stock > 0
      if (newProd.stock > 0) {
        onStockTransaction({
          id: 'inv-' + Date.now(),
          type: 'import',
          date: new Date().toISOString(),
          productId: newProd.id,
          productName: newProd.name,
          productCode: newProd.code,
          quantityChange: newProd.stock,
          unit: newProd.unit,
          costPrice: newProd.costPrice,
          totalValue: newProd.stock * newProd.costPrice,
          note: 'Nhập kho khởi tạo',
        });
      }
    }

    setIsProductModalOpen(false);
  };

  const openStockModal = (product: Product, type: 'import' | 'export_damage' | 'stock_adjustment') => {
    setTargetProduct(product);
    setStockModalType(type);
    setStockChangeQty(type === 'import' ? 10 : 1);
    setStockUnitCost(product.costPrice);
    setSupplierName('');
    setStockNote('');
    setIsStockModalOpen(true);
  };

  const handleConfirmStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProduct || stockChangeQty <= 0) return;

    let delta = stockChangeQty;
    if (stockModalType === 'export_damage') {
      delta = -stockChangeQty;
    } else if (stockModalType === 'stock_adjustment') {
      delta = stockChangeQty - targetProduct.stock; // adjustment to exact number
    }

    const newStock = Math.max(0, targetProduct.stock + delta);
    const updatedProd: Product = {
      ...targetProduct,
      stock: newStock,
      costPrice: stockModalType === 'import' && stockUnitCost > 0 ? stockUnitCost : targetProduct.costPrice,
      updatedAt: new Date().toISOString(),
    };

    onUpdateProduct(updatedProd);

    // Save transaction
    const trans: InventoryTransaction = {
      id: 'inv-' + Date.now(),
      type: stockModalType,
      date: new Date().toISOString(),
      productId: targetProduct.id,
      productName: targetProduct.name,
      productCode: targetProduct.code,
      quantityChange: delta,
      unit: targetProduct.unit,
      costPrice: stockUnitCost,
      totalValue: Math.abs(delta) * (stockUnitCost || targetProduct.costPrice),
      supplierName: supplierName.trim(),
      note: stockNote.trim() || (stockModalType === 'import' ? 'Nhập hàng vào kho' : 'Xuất hỏng/điều chỉnh'),
    };

    onStockTransaction(trans);
    setIsStockModalOpen(false);
  };

  const handlePrintInventoryPDF = () => {
    const summaryItems = [
      { label: 'Tổng mặt hàng', value: `${products.length} SP` },
      { label: 'Tổng tồn lượng', value: `${totalStockItems} đơn vị` },
      { label: 'Tổng vốn tồn kho', value: formatVND(totalInventoryCapital), highlight: true },
      { label: 'Giá trị bán dự kiến', value: formatVND(totalInventoryRetailValue) },
      { label: 'Cần nhập thêm', value: `${lowStockCount + outOfStockCount} SP` },
    ];

    const headers = ['STT', 'Mã Barcode', 'Tên sản phẩm', 'ĐVT', 'Tồn kho', 'Giá vốn', 'Giá bán', 'Trị giá tồn'];
    const rows = filteredProducts.map((p, idx) => [
      String(idx + 1),
      p.code,
      p.name,
      p.unit,
      String(p.stock),
      formatVND(p.costPrice),
      formatVND(p.sellingPrice),
      formatVND(p.stock * p.costPrice),
    ]);

    printFinancialSummaryPDF('BÁO CÁO XUẤT NHẬP TỒN & GIÁ TRỊ KHO HÀNG', summaryItems, headers, rows, settings);
  };

  return (
    <div className="p-3 md:p-6 space-y-5 bg-slate-50 min-h-full">
      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Tổng giá trị vốn kho</div>
          <div className="text-lg md:text-xl font-bold text-sky-700 mt-1">
            {formatVND(totalInventoryCapital)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tiền vốn lưu kho hiện tại</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Doanh thu dự kiến</div>
          <div className="text-lg md:text-xl font-bold text-emerald-700 mt-1">
            {formatVND(totalInventoryRetailValue)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">
            Lãi tiềm năng: +{formatVND(totalInventoryRetailValue - totalInventoryCapital)}
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Số lượng mặt hàng</div>
          <div className="text-lg md:text-xl font-bold text-slate-800 mt-1">
            {products.length} SP
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tổng {totalStockItems} cái/gói</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Cảnh báo tồn kho</div>
          <div className="text-lg md:text-xl font-bold text-rose-600 mt-1 flex items-center gap-1.5">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {lowStockCount + outOfStockCount} SP
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {outOfStockCount} hết hàng, {lowStockCount} sắp hết
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tabs & Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('products')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'products' ? 'bg-white shadow text-sky-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-4 h-4" /> Danh mục & Tồn kho
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'history' ? 'bg-white shadow text-sky-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-4 h-4" /> Sổ nhật ký Nhập / Xuất
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportInventoryExcel(products, settings.storeName)}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-4 h-4" /> Xuất Excel
            </button>

            <button
              onClick={handlePrintInventoryPDF}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" /> In / PDF
            </button>

            <button
              onClick={openCreateModal}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Thêm sản phẩm mới
            </button>
          </div>
        </div>

        {activeTab === 'products' ? (
          <div>
            {/* Filter bar */}
            <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center gap-2.5 text-xs">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên sản phẩm, mã vạch barcode, nhóm hàng..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'Tất cả danh mục' : c}</option>
                ))}
              </select>

              <select
                value={stockFilter}
                onChange={e => setStockFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700"
              >
                <option value="all">Tất cả tình trạng kho</option>
                <option value="low">Sắp hết hàng (Dưới định mức)</option>
                <option value="out">Đã hết hàng (0)</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3">Mã SP</th>
                    <th className="py-3 px-3">Tên sản phẩm</th>
                    <th className="py-3 px-3">ĐVT</th>
                    <th className="py-3 px-3 text-right">Tồn kho</th>
                    <th className="py-3 px-3 text-right">Giá vốn</th>
                    <th className="py-3 px-3 text-right">Giá bán</th>
                    <th className="py-3 px-3 text-right">Trị giá tồn</th>
                    <th className="py-3 px-3 text-center">Thao tác kho</th>
                    <th className="py-3 px-3 text-right">Quản lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map(p => {
                    const isOutOfStock = p.stock <= 0;
                    const isLowStock = p.stock > 0 && p.stock <= (p.minStockAlert || 5);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-500 font-medium">
                          {p.code}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-400">{p.category}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium">
                            {p.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          {isOutOfStock ? (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[11px]">
                              Hết hàng (0)
                            </span>
                          ) : isLowStock ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[11px]">
                              {p.stock} (Sắp hết)
                            </span>
                          ) : (
                            <span className="text-slate-800">{p.stock}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 font-medium">
                          {formatVND(p.costPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-sky-700">
                          {formatVND(p.sellingPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                          {formatVND(p.stock * p.costPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openStockModal(p, 'import')}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded font-semibold text-[11px] flex items-center gap-0.5"
                              title="Nhập thêm hàng vào kho"
                            >
                              <ArrowDownRight className="w-3 h-3" /> Nhập
                            </button>
                            <button
                              onClick={() => openStockModal(p, 'export_damage')}
                              className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded font-semibold text-[11px] flex items-center gap-0.5"
                              title="Xuất hỏng / hủy / thất thoát"
                            >
                              <ArrowUpRight className="w-3 h-3" /> Hỏng
                            </button>
                            <button
                              onClick={() => openStockModal(p, 'stock_adjustment')}
                              className="px-1.5 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded font-medium text-[11px]"
                              title="Kiểm kê điều chỉnh số tồn"
                            >
                              Kiểm
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded"
                              title="Sửa thông tin"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Bạn có chắc muốn xóa sản phẩm "${p.name}"?`)) {
                                  onDeleteProduct(p.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Không có sản phẩm nào phù hợp điều kiện lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Transaction History Tab */
          <div>
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <span>Ghi nhận chi tiết tất cả các đợt Nhập kho, Xuất hủy, Điều chỉnh kiểm kê</span>
              <span className="font-semibold">{transactions.length} bản ghi</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3">Thời gian</th>
                    <th className="py-3 px-3">Loại giao dịch</th>
                    <th className="py-3 px-3">Mặt hàng</th>
                    <th className="py-3 px-3 text-right">Số lượng</th>
                    <th className="py-3 px-3 text-right">Đơn giá vốn</th>
                    <th className="py-3 px-3 text-right">Tổng giá trị</th>
                    <th className="py-3 px-3">Đối tác / Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 text-slate-500">{formatDate(t.date)}</td>
                      <td className="py-2.5 px-3">
                        {t.type === 'import' ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px] inline-flex items-center gap-1">
                            <ArrowDownRight className="w-3 h-3" /> Nhập kho
                          </span>
                        ) : t.type === 'export_damage' ? (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-semibold text-[11px] inline-flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" /> Xuất hủy/hỏng
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-semibold text-[11px]">
                            Kiểm kê điều chỉnh
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {t.productName}
                        <span className="block text-[11px] font-mono text-slate-400 font-normal">{t.productCode}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {t.quantityChange > 0 ? `+${t.quantityChange}` : t.quantityChange} {t.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-medium">
                        {t.costPrice ? formatVND(t.costPrice) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                        {t.totalValue ? formatVND(t.totalValue) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {t.supplierName && <div className="font-semibold text-slate-700">{t.supplierName}</div>}
                        <div className="text-[11px] text-slate-500">{t.note}</div>
                      </td>
                    </tr>
                  ))}

                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Chưa có lịch sử xuất nhập kho.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Thêm/Sửa sản phẩm */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 border border-slate-200 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-800 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-sky-600" />
              {editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới vào danh mục'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mã vạch / SKU (*)</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                    placeholder="Quét mã vạch hoặc tự sinh"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nhóm hàng / Danh mục</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    placeholder="VD: Gia vị, Bánh kẹo, Nước ngọt..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tên sản phẩm (*)</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="VD: Nước mắm Chinsu chai 500ml"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Đơn vị tính</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                    placeholder="gói, chai, lon, kg..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tồn kho ban đầu</label>
                  <input
                    type="number"
                    min="0"
                    value={formStock}
                    onChange={e => setFormStock(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Báo hết khi dưới</label>
                  <input
                    type="number"
                    min="1"
                    value={formMinStockAlert}
                    onChange={e => setFormMinStockAlert(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Giá vốn nhập hàng (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    value={formCostPrice}
                    onChange={e => setFormCostPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Giá bán niêm yết (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    value={formSellingPrice}
                    onChange={e => setFormSellingPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-sky-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Ghi chú thêm</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Quy cách đóng thùng, vị trí kệ..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-4 flex gap-2 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow"
                >
                  {editingProduct ? 'Lưu cập nhật' : 'Tạo sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Thao tác xuất / nhập kho */}
      {isStockModalOpen && targetProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-slate-200">
            <h3 className="font-bold text-base text-slate-800 mb-1 flex items-center gap-2">
              {stockModalType === 'import' ? (
                <span className="text-emerald-600 flex items-center gap-1.5"><ArrowDownRight /> Nhập thêm hàng vào kho</span>
              ) : stockModalType === 'export_damage' ? (
                <span className="text-rose-600 flex items-center gap-1.5"><ArrowUpRight /> Xuất hủy / hỏng / hết hạn</span>
              ) : (
                <span className="text-sky-600">Kiểm kê điều chỉnh tồn thực tế</span>
              )}
            </h3>
            <p className="text-xs font-semibold text-slate-700 mb-3">
              {targetProduct.name} ({targetProduct.unit}) - Hiện tồn: <strong>{targetProduct.stock}</strong>
            </p>

            <form onSubmit={handleConfirmStock} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {stockModalType === 'stock_adjustment' ? 'Số lượng tồn thực tế sau kiểm kê' : 'Số lượng'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockChangeQty}
                  onChange={e => setStockChangeQty(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900"
                />
              </div>

              {stockModalType === 'import' && (
                <>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Giá vốn đợt nhập này (VNĐ)</label>
                    <input
                      type="number"
                      min="0"
                      value={stockUnitCost}
                      onChange={e => setStockUnitCost(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Nhà cung cấp / Đại lý sỉ</label>
                    <input
                      type="text"
                      placeholder="VD: NPP Tiến Thành"
                      value={supplierName}
                      onChange={e => setSupplierName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Lý do / Ghi chú</label>
                <input
                  type="text"
                  placeholder="VD: Hàng móp méo, cận date..."
                  value={stockNote}
                  onChange={e => setStockNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
