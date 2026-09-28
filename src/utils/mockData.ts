import { AppStateData } from '../types';

export const initialData: AppStateData = {
  settings: {
    storeName: 'TẠP HÓA HOÀNG ĐẶNG',
    phone: '0908 123 456',
    address: '128 Đường Đỗ Xuân Hợp, Phước Long B, TP. Thủ Đức',
    greetingReceipt: 'Cảm ơn quý khách và hẹn gặp lại!',
    pointRate: 10000, // 10k VND = 1 điểm
    pointRedemptionValue: 100, // 1 điểm = 100đ khi tiêu
    autoBackupDrive: false,
    bankAccount: {
      bankName: 'MBBANK',
      accountNumber: '0908123456',
      accountHolder: 'NGUYEN HOANG DANG',
      qrNoteTemplate: 'Thanh toan Tap Hoa'
    }
  },
  products: [
    {
      id: 'prod-1',
      code: '8934563138164',
      name: 'Mì Hảo Hảo Tôm Chua Cay (Gói 75g)',
      category: 'Thực phẩm khô',
      unit: 'gói',
      costPrice: 3800,
      sellingPrice: 4500,
      stock: 120,
      minStockAlert: 24,
      notes: 'Thùng 30 gói',
      updatedAt: '2026-09-27T08:00:00.000Z'
    },
    {
      id: 'prod-2',
      code: '8934563138171',
      name: 'Thùng Mì Hảo Hảo (30 gói)',
      category: 'Thực phẩm khô',
      unit: 'thùng',
      costPrice: 112000,
      sellingPrice: 128000,
      stock: 15,
      minStockAlert: 5,
      notes: 'Nguyên thùng',
      updatedAt: '2026-09-27T08:00:00.000Z'
    },
    {
      id: 'prod-3',
      code: '8935001701314',
      name: 'Nước Ngọt Coca Cola Chai 390ml',
      category: 'Đồ uống & Giải khát',
      unit: 'chai',
      costPrice: 6500,
      sellingPrice: 8000,
      stock: 48,
      minStockAlert: 12,
      notes: 'Két 24 chai',
      updatedAt: '2026-09-27T08:00:00.000Z'
    },
    {
      id: 'prod-4',
      code: '8935001701321',
      name: 'Lốc Nước Ngọt Coca Cola (6 lon 320ml)',
      category: 'Đồ uống & Giải khát',
      unit: 'lốc',
      costPrice: 52000,
      sellingPrice: 60000,
      stock: 18,
      minStockAlert: 4,
      notes: 'Lốc 6 lon',
      updatedAt: '2026-09-27T08:00:00.000Z'
    },
    {
      id: 'prod-5',
      code: '8934673523120',
      name: 'Nước mắm Nam Ngư Đệ Nhị 900ml',
      category: 'Gia vị & Nấu ăn',
      unit: 'chai',
      costPrice: 22000,
      sellingPrice: 26000,
      stock: 25,
      minStockAlert: 6,
      notes: 'Hàng tiêu dùng nhanh',
      updatedAt: '2026-09-27T08:00:00.000Z'
    },
    {
      id: 'prod-6',
      code: '8934563819201',
      name: 'Dầu ăn Tường An Cooking Oil 1L',
      category: 'Gia vị & Nấu ăn',
      unit: 'chai',
      costPrice: 44000,
      sellingPrice: 52000,
      stock: 20,
      minStockAlert: 5,
      notes: 'Chai 1 lít',
      updatedAt: '2026-09-27T08:00:00.000Z'
    },
    {
      id: 'prod-7',
      code: '8934988010153',
      name: 'Sữa tươi Vinamilk có đường 180ml (Lốc 4 hộp)',
      category: 'Sữa & Bánh kẹo',
      unit: 'lốc',
      costPrice: 27500,
      sellingPrice: 32000,
      stock: 30,
      minStockAlert: 8,
      notes: 'HSD 6 tháng',
      updatedAt: '2026-09-27T08:00:00.000Z'
    },
    {
      id: 'prod-8',
      code: '8935049500016',
      name: 'Bia Heineken Lon 330ml',
      category: 'Bia & Thuốc lá',
      unit: 'lon',
      costPrice: 18500,
      sellingPrice: 21000,
      stock: 72,
      minStockAlert: 24,
      notes: 'Ướp lạnh',
      updatedAt: '2026-09-27T08:00:00.000Z'
    },
    {
      id: 'prod-9',
      code: '8935049500023',
      name: 'Thùng Bia Heineken (24 lon)',
      category: 'Bia & Thuốc lá',
      unit: 'thùng',
      costPrice: 430000,
      sellingPrice: 465000,
      stock: 10,
      minStockAlert: 3,
      notes: 'Nguyên thùng 24 lon',
      updatedAt: '2026-09-27T08:00:00.000Z'
    },
    {
      id: 'prod-10',
      code: '8934804001012',
      name: 'Nước rửa chén Sunlight Trà Xanh 750g',
      category: 'Hóa mỹ phẩm',
      unit: 'túi',
      costPrice: 24000,
      sellingPrice: 29000,
      stock: 14,
      minStockAlert: 5,
      notes: 'Túi châm refill',
      updatedAt: '2026-09-27T08:00:00.000Z'
    }
  ],
  customers: [
    {
      id: 'cust-1',
      name: 'Chị Mai (Nhà 12/4)',
      phone: '0912 345 678',
      address: 'Hẻm 12 Đỗ Xuân Hợp',
      points: 145,
      totalDebt: 150000,
      totalSpent: 1650000,
      createdAt: '2026-09-15T09:00:00.000Z'
    },
    {
      id: 'cust-2',
      name: 'Anh Tuấn (Thợ điện)',
      phone: '0988 777 666',
      address: 'Khu phố 3',
      points: 80,
      totalDebt: 320000,
      totalSpent: 920000,
      createdAt: '2026-09-18T10:30:00.000Z'
    },
    {
      id: 'cust-3',
      name: 'Cô Bảy Tạp vụ',
      phone: '0977 123 999',
      address: 'Đường số 6',
      points: 210,
      totalDebt: 0,
      totalSpent: 2100000,
      createdAt: '2026-09-10T14:15:00.000Z'
    }
  ],
  orders: [
    {
      id: 'ord-101',
      orderNumber: 'HD-20260927-001',
      createdAt: '2026-09-27T09:15:00.000Z',
      customerId: 'cust-1',
      customerName: 'Chị Mai (Nhà 12/4)',
      customerPhone: '0912 345 678',
      items: [
        {
          productId: 'prod-1',
          code: '8934563138164',
          name: 'Mì Hảo Hảo Tôm Chua Cay (Gói 75g)',
          unit: 'gói',
          costPrice: 3800,
          originalPrice: 4500,
          customPrice: 4500,
          quantity: 10,
          discountType: 'fixed',
          discountValue: 0,
          subtotal: 45000
        },
        {
          productId: 'prod-5',
          code: '8934673523120',
          name: 'Nước mắm Nam Ngư Đệ Nhị 900ml',
          unit: 'chai',
          costPrice: 22000,
          originalPrice: 26000,
          customPrice: 26000,
          quantity: 1,
          discountType: 'fixed',
          discountValue: 0,
          subtotal: 26000
        },
        {
          productId: 'prod-6',
          code: '8934563819201',
          name: 'Dầu ăn Tường An Cooking Oil 1L',
          unit: 'chai',
          costPrice: 44000,
          originalPrice: 52000,
          customPrice: 50000, // giảm riêng chai này 2k
          quantity: 1,
          discountType: 'fixed',
          discountValue: 0,
          subtotal: 50000
        }
      ],
      totalCost: 104000,
      subtotal: 121000,
      discountType: 'fixed',
      discountValue: 0,
      finalTotal: 121000,
      amountPaid: 0, // Ghi nợ toàn bộ
      paymentMethod: 'cash',
      debtAmount: 121000,
      pointsEarned: 12,
      pointsRedeemed: 0,
      pointsDiscountAmount: 0,
      profit: 17000,
      note: 'Chị Mai hẹn cuối tuần trả'
    },
    {
      id: 'ord-102',
      orderNumber: 'HD-20260927-002',
      createdAt: '2026-09-27T10:30:00.000Z',
      customerName: 'Khách lẻ',
      items: [
        {
          productId: 'prod-9',
          code: '8935049500023',
          name: 'Thùng Bia Heineken (24 lon)',
          unit: 'thùng',
          costPrice: 430000,
          originalPrice: 465000,
          customPrice: 465000,
          quantity: 1,
          discountType: 'fixed',
          discountValue: 0,
          subtotal: 465000
        },
        {
          productId: 'prod-3',
          code: '8935001701314',
          name: 'Nước Ngọt Coca Cola Chai 390ml',
          unit: 'chai',
          costPrice: 6500,
          originalPrice: 8000,
          customPrice: 8000,
          quantity: 4,
          discountType: 'fixed',
          discountValue: 0,
          subtotal: 32000
        }
      ],
      totalCost: 456000,
      subtotal: 497000,
      discountType: 'fixed',
      discountValue: 7000, // Bớt 7.000 làm tròn
      finalTotal: 490000,
      amountPaid: 490000,
      paymentMethod: 'transfer',
      transferAmount: 490000,
      debtAmount: 0,
      pointsEarned: 0,
      profit: 34000,
      note: 'Đã chuyển khoản MBBank'
    }
  ],
  inventoryTransactions: [
    {
      id: 'inv-1',
      type: 'import',
      date: '2026-09-26T15:00:00.000Z',
      productId: 'prod-1',
      productName: 'Mì Hảo Hảo Tôm Chua Cay (Gói 75g)',
      productCode: '8934563138164',
      quantityChange: 150,
      unit: 'gói',
      costPrice: 3800,
      totalValue: 570000,
      supplierName: 'Đại lý Bách Hóa Sỉ Miền Nam',
      note: 'Nhập đầu tuần'
    },
    {
      id: 'inv-2',
      type: 'import',
      date: '2026-09-26T15:30:00.000Z',
      productId: 'prod-8',
      productName: 'Bia Heineken Lon 330ml',
      productCode: '8935049500016',
      quantityChange: 72,
      unit: 'lon',
      costPrice: 18500,
      totalValue: 1332000,
      supplierName: 'Công ty TNHH Phân Phối Đồ Uống',
      note: 'Nhập bia phục vụ cuối tuần'
    }
  ],
  debtPayments: [
    {
      id: 'pay-1',
      date: '2026-09-26T17:00:00.000Z',
      customerId: 'cust-1',
      customerName: 'Chị Mai (Nhà 12/4)',
      amountPaid: 100000,
      paymentMethod: 'cash',
      remainingDebt: 150000,
      note: 'Trả bớt nợ lần trước'
    }
  ],
  lastBackupDate: undefined
};
