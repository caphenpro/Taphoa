export interface Product {
  id: string;
  code: string; // barcode or custom SKU
  name: string;
  category: string;
  unit: string; // cái, chai, lon, kg, gói, thùng, hộp...
  costPrice: number; // giá vốn nhập hàng
  sellingPrice: number; // giá bán niêm yết
  stock: number; // số lượng tồn hiện tại
  minStockAlert?: number; // ngưỡng cảnh báo sắp hết hàng
  notes?: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  points: number; // điểm tích lũy
  totalDebt: number; // tổng nợ hiện tại (dương nghĩa là khách nợ cửa hàng)
  totalSpent: number; // tổng tiền đã mua lũy kế
  createdAt: string;
}

export interface CartItem {
  productId: string;
  code: string;
  name: string;
  unit: string;
  costPrice: number;
  originalPrice: number; // giá gốc niêm yết
  customPrice: number; // giá bán thực tế cho phép điều chỉnh
  quantity: number;
  discountType: 'percentage' | 'fixed'; // giảm theo % hoặc theo số tiền cụ thể
  discountValue: number; // giá trị giảm (ví dụ: 10% hoặc 5000đ)
  subtotal: number; // thành tiền sau giảm giá
}

export type PaymentMethod = 'cash' | 'transfer' | 'split'; // tiền mặt, chuyển khoản hoặc kết hợp

export interface Order {
  id: string;
  orderNumber: string; // Mã đơn VD: HD-20260928-001
  createdAt: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: CartItem[];
  totalCost: number; // tổng vốn của đơn
  subtotal: number; // tổng tiền trước giảm giá toàn đơn
  discountType: 'percentage' | 'fixed'; // giảm thêm trên hóa đơn
  discountValue: number;
  finalTotal: number; // khách cần thanh toán
  amountPaid: number; // khách đã trả thực tế
  paymentMethod: PaymentMethod;
  cashAmount?: number; // nếu trả tiền mặt
  transferAmount?: number; // nếu chuyển khoản
  debtAmount: number; // nợ phát sinh từ đơn này (finalTotal - amountPaid)
  pointsEarned: number; // điểm được tích từ đơn này
  pointsRedeemed?: number; // điểm đã dùng trừ tiền (nếu có)
  pointsDiscountAmount?: number;
  profit: number; // lợi nhuận = finalTotal - totalCost
  note?: string;
}

export interface InventoryTransaction {
  id: string;
  type: 'import' | 'export_damage' | 'export_sale' | 'stock_adjustment';
  date: string;
  productId: string;
  productName: string;
  productCode: string;
  quantityChange: number; // dương khi nhập, âm khi xuất
  unit: string;
  costPrice?: number;
  totalValue?: number;
  supplierName?: string;
  referenceOrderNumber?: string;
  note?: string;
}

export interface DebtPayment {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  amountPaid: number;
  paymentMethod: 'cash' | 'transfer';
  remainingDebt: number;
  note?: string;
}

export interface StoreSettings {
  storeName: string;
  phone: string;
  address: string;
  greetingReceipt: string;
  pointRate: number; // Ví dụ: 10,000 VND = 1 điểm
  pointRedemptionValue: number; // Ví dụ: 1 điểm = 100 VND
  autoBackupDrive: boolean;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    qrNoteTemplate?: string;
  };
}

export interface AppStateData {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  inventoryTransactions: InventoryTransaction[];
  debtPayments: DebtPayment[];
  settings: StoreSettings;
  lastBackupDate?: string;
}
