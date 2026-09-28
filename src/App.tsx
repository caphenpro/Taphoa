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
  ShieldCheck
} from 'lucide-react';
import { AppStateData, Order, Product, Customer, InventoryTransaction, DebtPayment, StoreSettings } from './types';
import { loadAppState, saveAppState } from './utils/storage';
import { POSComponent } from './components/POSComponent';
import { InventoryComponent } from './components/InventoryComponent';
import { CustomersAndDebtComponent } from './components/CustomersAndDebtComponent';
import { FinancialReportsComponent } from './components/FinancialReportsComponent';
import { SyncAndSettingsComponent } from './components/SyncAndSettingsComponent';

export default function App() {
  const [appState, setAppState] = useState<AppStateData>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'debts' | 'reports' | 'sync'>('pos');

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
    setAppState(prev => ({
      ...prev,
      inventoryTransactions: [trans, ...prev.inventoryTransactions],
    }));
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
    setAppState(newState);
    saveAppState(newState);
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

        {/* Navigation Tabs */}
        <div className="flex px-2 md:px-4 gap-1 overflow-x-auto border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold transition border-b-2 whitespace-nowrap ${
              activeTab === 'pos'
                ? 'border-sky-400 text-sky-400 bg-slate-800/60'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'
            }`}
          >
            <ShoppingCart className="w-4 h-4" /> Bán Hàng (POS)
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold transition border-b-2 whitespace-nowrap relative ${
              activeTab === 'inventory'
                ? 'border-sky-400 text-sky-400 bg-slate-800/60'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'
            }`}
          >
            <Package className="w-4 h-4" /> Xuất Nhập Tồn Kho
            {lowStockCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('debts')}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold transition border-b-2 whitespace-nowrap ${
              activeTab === 'debts'
                ? 'border-sky-400 text-sky-400 bg-slate-800/60'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'
            }`}
          >
            <Users className="w-4 h-4" /> Sổ Nợ & Khách Thân Thiết
            {debtorsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded text-[10px] font-bold">
                {debtorsCount} nợ
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold transition border-b-2 whitespace-nowrap ${
              activeTab === 'reports'
                ? 'border-sky-400 text-sky-400 bg-slate-800/60'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Doanh Thu & Lợi Nhuận
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold transition border-b-2 whitespace-nowrap ${
              activeTab === 'sync'
                ? 'border-sky-400 text-sky-400 bg-slate-800/60'
                : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'
            }`}
          >
            <Settings className="w-4 h-4" /> Cài Đặt & Đồng Bộ
          </button>
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
