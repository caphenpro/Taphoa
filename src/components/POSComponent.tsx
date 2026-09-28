import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  UserCheck,
  CreditCard,
  Banknote,
  Percent,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Award,
  AlertCircle
} from 'lucide-react';
import { Product, Customer, CartItem, Order, PaymentMethod, StoreSettings } from '../types';
import { formatVND, generateOrderNumber } from '../utils/storage';
import { printReceipt } from '../utils/printReceipt';
import confetti from 'canvas-confetti';

interface POSProps {
  products: Product[];
  customers: Customer[];
  settings: StoreSettings;
  onCompleteOrder: (order: Order, updatedCustomer?: Customer) => void;
  onAddQuickProduct: (product: Product) => void;
  onAddQuickCustomer: (customer: Customer) => void;
}

export const POSComponent: React.FC<POSProps> = ({
  products,
  customers,
  settings,
  onCompleteOrder,
  onAddQuickProduct,
  onAddQuickCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isQuickCustomerModal, setIsQuickCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Discount whole order
  const [orderDiscountType, setOrderDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [orderDiscountValue, setOrderDiscountValue] = useState<number>(0);

  // Points redemption
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [isAmountManuallySet, setIsAmountManuallySet] = useState(false);
  const [orderNote, setOrderNote] = useState('');

  // Success modal state
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Item customization modal
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editDiscountType, setEditDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [editDiscountValue, setEditDiscountValue] = useState<number>(0);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, selectedCategory]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Cart calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const totalCost = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
  }, [cart]);

  // Order level discount amount
  const orderDiscountAmount = useMemo(() => {
    if (orderDiscountType === 'percentage') {
      return Math.round((cartSubtotal * (orderDiscountValue || 0)) / 100);
    }
    return Math.min(orderDiscountValue || 0, cartSubtotal);
  }, [cartSubtotal, orderDiscountType, orderDiscountValue]);

  // Points discount calculation
  const maxAvailablePoints = selectedCustomer ? selectedCustomer.points : 0;
  const pointsDiscountAmount = useMemo(() => {
    if (!usePoints || !selectedCustomer) return 0;
    const pts = Math.min(pointsToRedeem, maxAvailablePoints);
    return pts * (settings.pointRedemptionValue || 100);
  }, [usePoints, pointsToRedeem, maxAvailablePoints, selectedCustomer, settings.pointRedemptionValue]);

  // Final Total to pay
  const finalTotal = useMemo(() => {
    const afterDiscount = Math.max(0, cartSubtotal - orderDiscountAmount - pointsDiscountAmount);
    return Math.round(afterDiscount);
  }, [cartSubtotal, orderDiscountAmount, pointsDiscountAmount]);

  // Synchronize amountPaid if not manual
  const effectiveAmountPaid = isAmountManuallySet ? amountPaid : finalTotal;
  const debtAmount = Math.max(0, finalTotal - effectiveAmountPaid);
  const changeAmount = Math.max(0, effectiveAmountPaid - finalTotal);

  // Add product to cart
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(item => {
          if (item.productId === product.id) {
            const nextQty = item.quantity + 1;
            const singleAfterDisc =
              item.discountType === 'percentage'
                ? Math.round(item.customPrice * (1 - item.discountValue / 100))
                : Math.max(0, item.customPrice - item.discountValue);
            return {
              ...item,
              quantity: nextQty,
              subtotal: singleAfterDisc * nextQty,
            };
          }
          return item;
        });
      }

      return [
        ...prev,
        {
          productId: product.id,
          code: product.code,
          name: product.name,
          unit: product.unit,
          costPrice: product.costPrice,
          originalPrice: product.sellingPrice,
          customPrice: product.sellingPrice,
          quantity: 1,
          discountType: 'fixed',
          discountValue: 0,
          subtotal: product.sellingPrice,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const singleAfterDisc =
              item.discountType === 'percentage'
                ? Math.round(item.customPrice * (1 - item.discountValue / 100))
                : Math.max(0, item.customPrice - item.discountValue);
            return {
              ...item,
              quantity: newQty,
              subtotal: singleAfterDisc * newQty,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const openItemEditor = (item: CartItem) => {
    setEditingItem(item);
    setEditPrice(item.customPrice);
    setEditDiscountType(item.discountType);
    setEditDiscountValue(item.discountValue);
  };

  const saveItemEditor = () => {
    if (!editingItem) return;
    setCart(prev =>
      prev.map(i => {
        if (i.productId === editingItem.productId) {
          const singleAfterDisc =
            editDiscountType === 'percentage'
              ? Math.round(editPrice * (1 - editDiscountValue / 100))
              : Math.max(0, editPrice - editDiscountValue);
          return {
            ...i,
            customPrice: editPrice,
            discountType: editDiscountType,
            discountValue: editDiscountValue,
            subtotal: singleAfterDisc * i.quantity,
          };
        }
        return i;
      })
    );
    setEditingItem(null);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    if (debtAmount > 0 && !selectedCustomer) {
      alert('Vui lòng chọn hoặc thêm thông tin Khách hàng để ghi nợ số tiền ' + formatVND(debtAmount));
      return;
    }

    // Points earned
    const rate = settings.pointRate || 10000;
    const earnedPoints = Math.floor(finalTotal / rate);

    const orderNumber = generateOrderNumber();
    const profit = finalTotal - totalCost;

    const newOrder: Order = {
      id: 'ord-' + Date.now(),
      orderNumber,
      createdAt: new Date().toISOString(),
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer ? selectedCustomer.name : 'Khách lẻ',
      customerPhone: selectedCustomer?.phone,
      items: [...cart],
      totalCost,
      subtotal: cartSubtotal,
      discountType: orderDiscountType,
      discountValue: orderDiscountAmount,
      finalTotal,
      amountPaid: effectiveAmountPaid,
      paymentMethod,
      debtAmount,
      cashAmount: paymentMethod === 'cash' ? effectiveAmountPaid : paymentMethod === 'split' ? effectiveAmountPaid / 2 : 0,
      transferAmount: paymentMethod === 'transfer' ? effectiveAmountPaid : paymentMethod === 'split' ? effectiveAmountPaid / 2 : 0,
      pointsEarned: earnedPoints,
      pointsRedeemed: usePoints ? pointsToRedeem : 0,
      pointsDiscountAmount,
      profit,
      note: orderNote,
    };

    let updatedCust: Customer | undefined;
    if (selectedCustomer) {
      const remainingPoints = selectedCustomer.points - (usePoints ? pointsToRedeem : 0) + earnedPoints;
      updatedCust = {
        ...selectedCustomer,
        points: Math.max(0, remainingPoints),
        totalDebt: selectedCustomer.totalDebt + debtAmount,
        totalSpent: selectedCustomer.totalSpent + finalTotal,
      };
    }

    onCompleteOrder(newOrder, updatedCust);
    setCompletedOrder(newOrder);

    // Fire joyful confetti
    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch (e) {
      // ignore
    }

    // Reset current POS
    setCart([]);
    setSelectedCustomerId('');
    setOrderDiscountValue(0);
    setUsePoints(false);
    setPointsToRedeem(0);
    setAmountPaid(0);
    setIsAmountManuallySet(false);
    setOrderNote('');
  };

  const handleCreateQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const newCust: Customer = {
      id: 'cust-' + Date.now(),
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim(),
      points: 0,
      totalDebt: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
    };

    onAddQuickCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setIsQuickCustomerModal(false);
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const scrollToCart = () => {
    const el = document.getElementById('pos-cart-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToCatalog = () => {
    const el = document.getElementById('pos-catalog-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 p-2 md:p-4 bg-slate-50 overflow-y-auto lg:overflow-hidden relative">
      {/* LEFT: Product Catalog & Fast search */}
      <div
        id="pos-catalog-section"
        className="flex-1 flex flex-col min-w-0 bg-white rounded-xl shadow-sm border border-slate-200 shrink-0 lg:shrink lg:overflow-hidden min-h-[420px] lg:min-h-0"
      >
        {/* Search Header */}
        <div className="p-3 border-b border-slate-200 bg-white space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên hàng, quét mã vạch (Barcode), danh mục..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          {/* Category Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition ${
                  selectedCategory === cat
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? 'Tất cả' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile floating quick view & scroll to cart bar */}
        {cart.length > 0 && (
          <div className="lg:hidden p-2.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-sky-400 text-slate-900 font-extrabold text-xs flex items-center justify-center">
                {totalCartCount}
              </span>
              <div className="text-xs">
                <span className="text-slate-300">Đã chọn {totalCartCount} món • </span>
                <span className="font-bold text-emerald-400 text-sm">{formatVND(finalTotal)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={scrollToCart}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-lg shadow flex items-center gap-1"
            >
              <span>Xem giỏ hàng & thanh toán ↓</span>
            </button>
          </div>
        )}

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {filteredProducts.map(product => {
            const isOutOfStock = product.stock <= 0;
            const isLowStock = product.stock > 0 && product.stock <= (product.minStockAlert || 5);

            return (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className={`relative flex flex-col justify-between p-3 rounded-xl border transition cursor-pointer select-none text-left ${
                  isOutOfStock
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : 'bg-white border-slate-200 hover:border-sky-500 hover:shadow-md active:scale-98'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                      {product.unit}
                    </span>
                    {isOutOfStock ? (
                      <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded">
                        Hết hàng
                      </span>
                    ) : isLowStock ? (
                      <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded">
                        Còn {product.stock}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium">
                        Kho: {product.stock}
                      </span>
                    )}
                  </div>

                  <h4 className="font-semibold text-slate-800 text-sm mt-1.5 line-clamp-2 leading-snug">
                    {product.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{product.code}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-base font-bold text-sky-700">
                    {formatVND(product.sellingPrice)}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Vốn: {formatVND(product.costPrice)}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <AlertCircle className="w-10 h-10 mb-2 stroke-1" />
              <p className="text-sm font-medium">Không tìm thấy sản phẩm phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">Thử đổi từ khóa hoặc quét lại mã vạch</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Bill & Checkout Panel */}
      <div
        id="pos-cart-section"
        className="w-full lg:w-96 xl:w-[420px] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 shrink-0 lg:overflow-hidden"
      >
        <div className="lg:hidden p-2 bg-slate-100 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-700">
          <span>🛒 GIỎ HÀNG & THANH TOÁN</span>
          <button
            type="button"
            onClick={scrollToCatalog}
            className="text-sky-600 hover:underline text-[11px] font-semibold"
          >
            ↑ Chọn thêm sản phẩm
          </button>
        </div>
        {/* Customer Header */}
        <div className="p-3 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              >
                <option value="">👤 Khách Lẻ (Không tích điểm/nợ)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.phone} {c.totalDebt > 0 ? `(Nợ: ${formatVND(c.totalDebt)})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setIsQuickCustomerModal(true)}
              className="px-2.5 py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
              title="Thêm nhanh khách hàng"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm khách
            </button>
          </div>

          {selectedCustomer && (
            <div className="mt-2.5 p-2 bg-sky-50/60 rounded-lg border border-sky-100 text-xs flex justify-between items-center">
              <div>
                <div className="font-semibold text-slate-800 flex items-center gap-1">
                  <span>{selectedCustomer.name}</span>
                  <span className="text-[10px] bg-sky-200 text-sky-800 px-1.5 rounded">
                    ★ {selectedCustomer.points} điểm
                  </span>
                </div>
                <div className="text-slate-500 text-[11px]">{selectedCustomer.phone}</div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500">Nợ hiện tại:</span>
                <div className={`font-bold ${selectedCustomer.totalDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatVND(selectedCustomer.totalDebt)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 min-h-[100px] overflow-y-auto p-2.5 space-y-2">
          {cart.map(item => (
            <div
              key={item.productId}
              className="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs sm:text-sm text-slate-800 truncate">
                    {item.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                    <button
                      onClick={() => openItemEditor(item)}
                      className="text-sky-600 hover:underline font-medium flex items-center gap-0.5"
                    >
                      {formatVND(item.customPrice)} / {item.unit}
                      {item.customPrice !== item.originalPrice && (
                        <span className="text-amber-600 font-bold ml-1">(Giá tùy chỉnh)</span>
                      )}
                    </button>
                    {item.discountValue > 0 && (
                      <span className="text-rose-600 font-medium">
                        Giảm {item.discountType === 'percentage' ? `${item.discountValue}%` : formatVND(item.discountValue)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs sm:text-sm font-bold text-slate-900">
                    {formatVND(item.subtotal)}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-slate-400 hover:text-rose-600 transition p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100">
                <div className="flex items-center border border-slate-200 rounded-md overflow-hidden bg-slate-50">
                  <button
                    onClick={() => updateQuantity(item.productId, -1)}
                    className="p-1 hover:bg-slate-200 text-slate-700 transition"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-2.5 py-0.5 text-xs font-bold text-slate-800 min-w-8 text-center bg-white">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.productId, 1)}
                    className="p-1 hover:bg-slate-200 text-slate-700 transition"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button
                  onClick={() => openItemEditor(item)}
                  className="text-[11px] text-sky-700 font-semibold hover:text-sky-900"
                >
                  Sửa giá / Chiết khấu
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-center p-4">
              <Receipt className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs font-medium">Giỏ hàng đang trống</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Nhấp chọn mặt hàng bên trái để thêm vào đơn</p>
            </div>
          )}
        </div>

        {/* Calculation Summary & Payment Options */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50 space-y-2 text-xs">
          {/* Subtotal */}
          <div className="flex justify-between text-slate-600">
            <span>Tiền hàng ({cart.reduce((s, i) => s + i.quantity, 0)} món):</span>
            <span className="font-semibold text-slate-800">{formatVND(cartSubtotal)}</span>
          </div>

          {/* Discount whole invoice */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600">Giảm giá đơn:</span>
            <div className="flex items-center gap-1">
              <div className="flex border border-slate-300 rounded overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOrderDiscountType('fixed')}
                  className={`px-1.5 py-0.5 text-[11px] ${orderDiscountType === 'fixed' ? 'bg-sky-600 text-white font-bold' : 'bg-white text-slate-600'}`}
                >
                  VNĐ
                </button>
                <button
                  type="button"
                  onClick={() => setOrderDiscountType('percentage')}
                  className={`px-1.5 py-0.5 text-[11px] ${orderDiscountType === 'percentage' ? 'bg-sky-600 text-white font-bold' : 'bg-white text-slate-600'}`}
                >
                  %
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={orderDiscountValue === 0 ? '' : orderDiscountValue}
                placeholder="0"
                onChange={e => setOrderDiscountValue(Number(e.target.value) || 0)}
                className="w-20 px-2 py-1 text-right bg-white border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 font-semibold"
              />
            </div>
          </div>

          {/* Points Redemption */}
          {selectedCustomer && selectedCustomer.points > 0 && (
            <div className="flex items-center justify-between p-1.5 bg-amber-50 rounded border border-amber-200">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usePoints}
                  onChange={e => {
                    setUsePoints(e.target.checked);
                    if (e.target.checked) {
                      setPointsToRedeem(selectedCustomer.points);
                    }
                  }}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-amber-900 font-semibold text-[11px]">
                  Đổi {selectedCustomer.points} điểm (={formatVND(selectedCustomer.points * (settings.pointRedemptionValue || 100))})
                </span>
              </label>
              {usePoints && (
                <span className="font-bold text-rose-600">
                  -{formatVND(pointsDiscountAmount)}
                </span>
              )}
            </div>
          )}

          {/* Final Total */}
          <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
            <span>KHÁCH CẦN TRẢ:</span>
            <span className="text-lg text-sky-700">{formatVND(finalTotal)}</span>
          </div>

          {/* Payment Method Tabs */}
          <div className="pt-2">
            <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-200 rounded-lg">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition ${
                  paymentMethod === 'cash' ? 'bg-white shadow text-emerald-700' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" /> Tiền mặt
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition ${
                  paymentMethod === 'transfer' ? 'bg-white shadow text-sky-700' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" /> Chuyển khoản
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('split')}
                className={`py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition ${
                  paymentMethod === 'split' ? 'bg-white shadow text-purple-700' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Ghi nợ / Chia
              </button>
            </div>
          </div>

          {/* Customer Paid Input & Debt Check */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-700">Khách đưa / Thanh toán:</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={isAmountManuallySet ? amountPaid : finalTotal}
                  onChange={e => {
                    setIsAmountManuallySet(true);
                    setAmountPaid(Number(e.target.value) || 0);
                  }}
                  className="w-32 px-2 py-1 text-right font-bold text-slate-900 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 bg-white"
                />
              </div>
            </div>

            {/* Quick cash pills */}
            <div className="flex gap-1 justify-end flex-wrap">
              {[finalTotal, 20000, 50000, 100000, 200000, 500000].filter((val, i, arr) => val >= finalTotal && arr.indexOf(val) === i).slice(0, 4).map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setIsAmountManuallySet(true);
                    setAmountPaid(val);
                  }}
                  className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-semibold"
                >
                  {formatVND(val)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setIsAmountManuallySet(true);
                  setAmountPaid(0); // Cho ghi nợ toàn bộ
                }}
                className="px-1.5 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded text-[10px] font-bold"
              >
                Nợ 100%
              </button>
            </div>

            {debtAmount > 0 ? (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 font-semibold flex justify-between items-center text-xs">
                <span>Ghi nợ đơn này:</span>
                <span className="text-sm font-bold">{formatVND(debtAmount)}</span>
              </div>
            ) : changeAmount > 0 ? (
              <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 font-semibold flex justify-between items-center text-xs">
                <span>Tiền thừa trả khách:</span>
                <span className="font-bold">{formatVND(changeAmount)}</span>
              </div>
            ) : null}
          </div>

          {/* Order note */}
          <div>
            <input
              type="text"
              placeholder="Ghi chú đơn hàng (VD: khách hẹn chiều ghé lấy)..."
              value={orderNote}
              onChange={e => setOrderNote(e.target.value)}
              className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded"
            />
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className={`w-full py-3 rounded-xl font-bold text-white text-sm shadow-md transition flex items-center justify-center gap-2 ${
                cart.length === 0
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 shadow-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              HOÀN TẤT ĐƠN ({formatVND(finalTotal)})
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Sửa giá / Giảm giá mặt hàng */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-800 text-sm mb-1">
              Chỉnh giá bán & Giảm giá
            </h3>
            <p className="text-xs text-slate-500 mb-3 font-semibold">{editingItem.name}</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Đơn giá bán tùy chỉnh (Giá gốc: {formatVND(editingItem.originalPrice)})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={editPrice}
                    onChange={e => setEditPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">VNĐ</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Chiết khấu mặt hàng:</label>
                <div className="flex gap-2">
                  <div className="flex border border-slate-300 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setEditDiscountType('fixed')}
                      className={`px-3 py-1.5 text-xs font-semibold ${editDiscountType === 'fixed' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                    >
                      VNĐ
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditDiscountType('percentage')}
                      className={`px-3 py-1.5 text-xs font-semibold ${editDiscountType === 'percentage' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                    >
                      %
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={editDiscountValue}
                    onChange={e => setEditDiscountValue(Number(e.target.value) || 0)}
                    placeholder="Nhập mức giảm"
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600 font-medium">Thành tiền sau giảm:</span>
                <span className="text-sm font-bold text-sky-700">
                  {formatVND(
                    (editDiscountType === 'percentage'
                      ? Math.round(editPrice * (1 - editDiscountValue / 100))
                      : Math.max(0, editPrice - editDiscountValue)) * editingItem.quantity
                  )}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={saveItemEditor}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Thêm nhanh khách hàng */}
      {isQuickCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4 border border-slate-200">
            <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-sky-600" /> Thêm nhanh khách hàng mới
            </h3>

            <form onSubmit={handleCreateQuickCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Tên khách hàng (*)</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Chị Hương (Tổ 4)"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Số điện thoại</label>
                <input
                  type="text"
                  placeholder="VD: 0987 654 321"
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Địa chỉ / Ghi nhớ</label>
                <input
                  type="text"
                  placeholder="VD: Nhà đối diện tiệm bánh mì"
                  value={newCustAddress}
                  onChange={e => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="mt-4 flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold"
                >
                  Lưu & Chọn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Đơn hoàn tất & In hóa đơn */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Bán hàng thành công!</h3>
            <p className="text-xs text-slate-500 mt-1">Mã hóa đơn: <span className="font-mono font-bold text-slate-700">{completedOrder.orderNumber}</span></p>

            <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Khách hàng:</span>
                <span className="font-semibold text-slate-800">{completedOrder.customerName || 'Khách lẻ'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tổng thanh toán:</span>
                <span className="font-bold text-slate-900">{formatVND(completedOrder.finalTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Khách đã trả:</span>
                <span className="font-semibold text-emerald-600">{formatVND(completedOrder.amountPaid)}</span>
              </div>
              {completedOrder.debtAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Ghi nợ:</span>
                  <span>{formatVND(completedOrder.debtAmount)}</span>
                </div>
              )}
              {completedOrder.pointsEarned > 0 && (
                <div className="flex justify-between text-amber-600 font-semibold pt-1 border-t border-slate-200">
                  <span>Điểm tích lũy cộng:</span>
                  <span>+{completedOrder.pointsEarned} điểm</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCompletedOrder(null)}
                className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700"
              >
                Đóng (Tạo đơn mới)
              </button>
              <button
                type="button"
                onClick={() => printReceipt(completedOrder, settings)}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <Receipt className="w-4 h-4" /> In Hóa Đơn (PDF)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
