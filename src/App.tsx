import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  Cloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  History,
  Truck
} from 'lucide-react';
import { AppStateData, Order, Product, Customer, InventoryTransaction, DebtPayment, StoreSettings, PriceHistoryEntry, SupplierDebt, SupplierPayment } from './types';
import { loadAppState, saveAppState } from './utils/storage';
import { POSComponent } from './components/POSComponent';
import { InventoryComponent } from './components/InventoryComponent';
import { CustomersAndDebtComponent } from './components/CustomersAndDebtComponent';
import { FinancialReportsComponent } from './components/FinancialReportsComponent';
import { SyncAndSettingsComponent } from './components/SyncAndSettingsComponent';
import { SupplierDebtComponent } from './components/SupplierDebtComponent';

export default function App() {
  const [appState, setAppState] = useState<AppStateData>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'debts' | 'reports' | 'sync' | 'prices' | 'supplierDebts'>('pos');

  // Sync state to local storage whenever modified
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  // Handler for completed sale order
  const handleCompleteOrder = (order: Order, updatedCustomer?: Customer) => {
    setAppState(prev => {
      // 1. Deduct stock for all items
      const updatedProducts = prev.products.map(prod => {
        const cartItem = order.items.find(i => i.productId === prod.id);
        if (cartItem) {
          return {
            ...prod,
            stock: Math.max(0, prod.stock - cartItem.quantity),
            updatedAt: new Date().toISOString(),
          };
        }
        return prod;
      });

      // 2. Update customer record if any
      let updatedCustomers = prev.customers;
      if (updatedCustomer) {
        const exists = prev.customers.some(c => c.id === updatedCustomer.id);
        if (exists) {
          updatedCustomers = prev.customers.map(c => (c.id === updatedCustomer.id ? updatedCustomer : c));
        } else {
          updatedCustomers = [updatedCustomer, ...prev.customers];
        }
      }

      // 3. Record inventory transactions for this sale
      const newTransactions: InventoryTransaction[] = order.items.map(item => ({
        id: 'inv-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        type: 'export_sale',
        date: order.createdAt,
        productId: item.productId,
        productName: item.name,
        productCode: item.code,
        quantityChange: -item.quantity,
        unit: item.unit,
        costPrice: item.costPrice,
        totalValue: item.costPrice * item.quantity,
        referenceOrderNumber: order.orderNumber,
        note: `Bán lẻ theo đơn ${order.orderNumber}`,
      }));

      return {
        ...prev,
        products: updatedProducts,
        customers: updatedCustomers,
        orders: [order, ...prev.orders],
        inventoryTransactions: [...newTransactions, ...prev.inventoryTransactions],
      };
    });
  };

  const handleUpdateSellingPrice = (productId: string, newPrice: number, reason: string) => {
    setAppState(prev => {
      const product = prev.products.find(p => p.id === productId);
      if (!product || product.sellingPrice === newPrice) return prev;
      const entry: PriceHistoryEntry = {
        id: 'price-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        productId,
        productName: product.name,
        productCode: product.code,
        oldPrice: product.sellingPrice,
        newPrice,
        changedAt: new Date().toISOString(),
        reason,
      };
      return {
        ...prev,
        products: prev.products.map(p => p.id === productId ? { ...p, sellingPrice: newPrice, updatedAt: entry.changedAt } : p),
        priceHistory: [entry, ...(prev.priceHistory || [])],
      };
    });
  };

  // Products CRUD
  const handleAddProduct = (prod: Product) => {
    setAppState(prev => ({
      ...prev,
      products: [prod, ...prev.products],
    }));
  };

  const handleUpdateProduct = (prod: Product) => {
    setAppState(prev => ({
      ...prev,
      products: prev.products.map(p => (p.id === prod.id ? prod : p)),
    }));
  };

  const handleDeleteProduct = (productId: string) => {
    setAppState(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== productId),
    }));
  };

  const handleStockTransaction = (trans: InventoryTransaction) => {
    setAppState(prev => {
      const totalAmount = trans.type === 'import' ? (trans.totalValue || 0) : 0;
      const paidAmount = Math.max(0, Math.min(totalAmount, trans.supplierPaidAmount || 0));
      const supplierDebt: SupplierDebt | null = trans.type === 'import' && trans.supplierName?.trim() ? {
        id: 'supdebt-' + trans.id,
        date: trans.date,
        supplierName: trans.supplierName.trim(),
        totalAmount,
        paidAmount,
        remainingAmount: totalAmount - paidAmount,
        inventoryTransactionId: trans.id,
        note: trans.note,
      } : null;
      return {
        ...prev,
        inventoryTransactions: [trans, ...prev.inventoryTransactions],
        supplierDebts: supplierDebt ? [supplierDebt, ...(prev.supplierDebts || [])] : (prev.supplierDebts || []),
      };
    });
  };

  const handleAddSupplierDebt = (supplierName: string, amount: number, note: string) => {
    const debt: SupplierDebt = {
      id: 'supdebt-manual-' + Date.now(),
      date: new Date().toISOString(),
      supplierName,
      totalAmount: amount,
      paidAmount: 0,
      remainingAmount: amount,
      note: note || 'Ghi nợ đầu kỳ',
    };
    setAppState(prev => ({ ...prev, supplierDebts: [debt, ...(prev.supplierDebts || [])] }));
  };

  const handleSupplierPayment = (debtId: string, amount: number, note: string) => {
    setAppState(prev => {
      const debt = (prev.supplierDebts || []).find(d => d.id === debtId);
      if (!debt || amount <= 0 || amount > debt.remainingAmount) return prev;
      const payment: SupplierPayment = {
        id: 'suppay-' + Date.now(),
        date: new Date().toISOString(),
        supplierDebtId: debtId,
        supplierName: debt.supplierName,
        amount,
        note,
      };
      return {
        ...prev,
        supplierDebts: prev.supplierDebts.map(d => d.id === debtId ? {
          ...d, paidAmount: d.paidAmount + amount, remainingAmount: Math.max(0, d.remainingAmount - amount),
        } : d),
        supplierPayments: [payment, ...(prev.supplierPayments || [])],
      };
    });
  };

  // Customers CRUD & Debt
  const handleAddCustomer = (cust: Customer) => {
    setAppState(prev => ({
      ...prev,
      customers: [cust, ...prev.customers],
    }));
  };

  const handleUpdateCustomer = (cust: Customer) => {
    setAppState(prev => ({
      ...prev,
      customers: prev.customers.map(c => (c.id === cust.id ? cust : c)),
    }));
  };

  const handleRecordDebtPayment = (payment: DebtPayment, updatedCust: Customer) => {
    setAppState(prev => ({
      ...prev,
      customers: prev.customers.map(c => (c.id === updatedCust.id ? updatedCust : c)),
      debtPayments: [payment, ...prev.debtPayments],
    }));
  };

  // Settings & Restore
  const handleRestoreState = (newState: AppStateData) => {
    const safeState: AppStateData = {
      ...newState,
      supplierDebts: newState.supplierDebts || [],
      supplierPayments: newState.supplierPayments || [],
      priceHistory: newState.priceHistory || [],
      debtPayments: newState.debtPayments || [],
    };
    setAppState(safeState);
    saveAppState(safeState);
  };

  const handleUpdateSettings = (newSettings: StoreSettings) => {
    setAppState(prev => ({
      ...prev,
      settings: newSettings,
    }));
  };

  const handleRefreshLastBackupDate = (dateStr: string) => {
    setAppState(prev => ({
      ...prev,
      lastBackupDate: dateStr,
    }));
  };

  // Warning for low stock count
  const lowStockCount = appState.products.filter(
    p => p.stock <= (p.minStockAlert || 5)
  ).length;

  // Total debt count
  const debtorsCount = appState.customers.filter(c => c.totalDebt > 0).length;

  return (
    <div className="flex flex-col h-dvh w-screen overflow-hidden bg-slate-100 font-sans text-slate-800">
      {/* APP TOP NAVIGATION BAR */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shrink-0 z-20">
        <div className="flex items-center justify-between px-3 md:px-5 py-2.5">
          {/* Logo & Store identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center font-bold text-white text-base shadow-sm">
              T
            </div>
            <div>
              <div className="font-extrabold text-sm md:text-base leading-tight tracking-wide flex items-center gap-1.5">
                <span>{appState.settings.storeName}</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-400/30 px-1.5 py-0.2 rounded font-semibold">
                  PRO
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>Hotline: {appState.settings.phone}</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline truncate max-w-xs">{appState.settings.address}</span>
              </div>
            </div>
          </div>

          {/* Quick sync status pill */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('sync')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
              title="Quản lý đồng bộ Google Drive & tệp lưu trữ máy"
            >
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              <span>Đồng bộ Drive / Tệp</span>
            </button>
          </div>
        </div>

        {/* Main navigation: four clear tasks for a small shop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-slate-900">
          {[
            { id: 'pos', label: 'BÁN HÀNG', icon: <ShoppingCart className="w-6 h-6"/> },
            { id: 'inventory', label: 'HÀNG HÓA', icon: <Package className="w-6 h-6"/> },
            { id: 'debts', label: 'SỔ CÔNG NỢ', icon: <Users className="w-6 h-6"/> },
            { id: 'reports', label: 'THU CHI – LÃI LỖ', icon: <BarChart3 className="w-6 h-6"/> },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as typeof activeTab)}
              className={`min-h-16 rounded-xl px-3 py-3 flex items-center justify-center gap-2 text-sm md:text-base font-extrabold border-2 transition ${activeTab === item.id ? 'bg-sky-600 border-sky-300 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700'}`}>
              {item.icon}<span>{item.label}</span>
              {item.id === 'inventory' && lowStockCount > 0 && <span className="rounded-full bg-rose-500 text-white px-2 py-0.5 text-xs">{lowStockCount}</span>}
              {item.id === 'debts' && (debtorsCount + (appState.supplierDebts || []).filter(d => d.remainingAmount > 0).length) > 0 && <span className="rounded-full bg-amber-500 text-white px-2 py-0.5 text-xs">{debtorsCount + (appState.supplierDebts || []).filter(d => d.remainingAmount > 0).length}</span>}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-4 px-4 py-2 bg-slate-800 text-xs">
          <button onClick={() => setActiveTab('prices')} className="text-slate-300 underline">Lịch sử giá</button>
          <button onClick={() => setActiveTab('sync')} className="text-slate-300 underline">Sao lưu & cài đặt</button>
        </div>
      </header>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'pos' && (
          <POSComponent
            products={appState.products}
            customers={appState.customers}
            settings={appState.settings}
            onCompleteOrder={handleCompleteOrder}
            onAddQuickProduct={handleAddProduct}
            onUpdateSellingPrice={handleUpdateSellingPrice}
            onAddQuickCustomer={handleAddCustomer}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryComponent
            products={appState.products}
            transactions={appState.inventoryTransactions}
            settings={appState.settings}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onStockTransaction={handleStockTransaction}
          />
        )}

        {activeTab === 'debts' && (
          <CustomersAndDebtComponent
            customers={appState.customers}
            debtPayments={appState.debtPayments}
            orders={appState.orders}
            settings={appState.settings}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onRecordDebtPayment={handleRecordDebtPayment}
          />
        )}

        {activeTab === 'reports' && (
          <FinancialReportsComponent
            orders={appState.orders}
            products={appState.products}
            customers={appState.customers}
            transactions={appState.inventoryTransactions}
            settings={appState.settings}
          />
        )}

        {activeTab === 'prices' && (
          <div className="h-full overflow-y-auto p-3 md:p-5">
            <div className="max-w-6xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h2 className="font-bold text-slate-900 flex items-center gap-2"><History className="w-5 h-5 text-sky-600" /> Lịch sử điều chỉnh giá bán</h2>
                <p className="text-xs text-slate-500 mt-1">Ghi lại các lần cập nhật giá niêm yết từ màn hình bán hàng POS.</p>
              </div>
              {(!appState.priceHistory || appState.priceHistory.length === 0) ? (
                <div className="p-10 text-center text-sm text-slate-400">Chưa có lịch sử thay đổi giá.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Thời gian</th>
                        <th className="px-4 py-3">Sản phẩm</th>
                        <th className="px-4 py-3 text-right">Giá cũ</th>
                        <th className="px-4 py-3 text-right">Giá mới</th>
                        <th className="px-4 py-3 text-right">Chênh lệch</th>
                        <th className="px-4 py-3">Lý do</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...appState.priceHistory].sort((x, y) => y.changedAt.localeCompare(x.changedAt)).map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(entry.changedAt).toLocaleString('vi-VN')}</td>
                          <td className="px-4 py-3"><div className="font-semibold text-slate-800">{entry.productName}</div><div className="font-mono text-slate-400 mt-0.5">{entry.productCode}</div></td>
                          <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{new Intl.NumberFormat('vi-VN').format(entry.oldPrice)} đ</td>
                          <td className="px-4 py-3 text-right font-bold text-sky-700 whitespace-nowrap">{new Intl.NumberFormat('vi-VN').format(entry.newPrice)} đ</td>
                          <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${entry.newPrice > entry.oldPrice ? 'text-rose-600' : 'text-emerald-600'}`}>{entry.newPrice > entry.oldPrice ? '+' : ''}{new Intl.NumberFormat('vi-VN').format(entry.newPrice - entry.oldPrice)} đ</td>
                          <td className="px-4 py-3 text-slate-600">{entry.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sync' && (
          <SyncAndSettingsComponent
            appState={appState}
            onRestoreState={handleRestoreState}
            onUpdateSettings={handleUpdateSettings}
            onRefreshLastBackupDate={handleRefreshLastBackupDate}
          />
        )}
      </main>
    </div>
  );
}
