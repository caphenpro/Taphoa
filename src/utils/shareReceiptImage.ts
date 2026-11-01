import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { toPng } from 'html-to-image';
import { Order, StoreSettings } from '../types';
import { formatVND, formatDate } from './storage';

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char] as string));

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl);
  return response.blob();
};

const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const result = String(reader.result || '');
    resolve(result.split(',')[1] || '');
  };
  reader.onerror = () => reject(reader.error || new Error('Không đọc được ảnh hóa đơn'));
  reader.readAsDataURL(blob);
});

/** Render a receipt to PNG and open the Android share sheet (Zalo, Messages, etc.). */
export async function shareReceiptImage(order: Order, settings: StoreSettings): Promise<void> {
  const node = document.createElement('div');
  node.style.cssText = 'position:fixed;left:-10000px;top:0;width:380px;padding:24px 22px;background:#fff;color:#0f172a;font-family:Arial,sans-serif;font-size:14px;line-height:1.45;box-sizing:border-box;';
  const items = order.items.map((item, index) => `
    <div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px dashed #cbd5e1;">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;">${index + 1}. ${escapeHtml(item.name)}</div>
        <div style="font-size:12px;color:#64748b;">${item.quantity} ${escapeHtml(item.unit)} × ${formatVND(item.customPrice)}${(item.unitsPerSale || 1) > 1 ? ` (quy đổi ${item.quantity * (item.unitsPerSale || 1)} ${escapeHtml(item.baseUnit || 'đv lẻ')})` : ''}</div>
        ${item.discountValue > 0 ? `<div style="font-size:12px;color:#dc2626;">Giảm ${item.discountType === 'percentage' ? item.discountValue + '%' : formatVND(item.discountValue)}</div>` : ''}
      </div>
      <strong style="white-space:nowrap;">${formatVND(item.subtotal)}</strong>
    </div>`).join('');
  const previousDebt = Math.max(0, order.previousDebt || 0);
  const newDebt = Math.max(0, order.debtAmount || 0);
  const totalDebt = Math.max(0, order.totalDebtAfterOrder ?? previousDebt + newDebt);
  const payment = order.paymentMethod === 'cash' ? 'Tiền mặt' : order.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Chia khoản';
  node.innerHTML = `
    <div style="text-align:center;padding-bottom:14px;border-bottom:2px solid #0f172a;">
      <div style="font-size:22px;font-weight:800;text-transform:uppercase;">${escapeHtml(settings.storeName)}</div>
      <div style="font-size:12px;color:#475569;margin-top:4px;">${escapeHtml(settings.address)}</div>
      <div style="font-size:12px;color:#475569;">${escapeHtml(settings.phone)}</div>
      <div style="font-size:18px;font-weight:800;margin-top:12px;">PHIẾU THANH TOÁN</div>
      <div style="font-size:12px;color:#64748b;">Mã: ${escapeHtml(order.orderNumber)} · ${escapeHtml(formatDate(order.createdAt))}</div>
    </div>
    <div style="padding:12px 0;border-bottom:1px dashed #94a3b8;font-size:13px;">
      <div><b>Khách hàng:</b> ${escapeHtml(order.customerName || 'Khách lẻ')}</div>
      ${order.customerPhone ? `<div><b>SĐT:</b> ${escapeHtml(order.customerPhone)}</div>` : ''}
    </div>
    <div>${items}</div>
    <div style="border-top:1px dashed #94a3b8;margin-top:10px;padding-top:10px;">
      <div style="display:flex;justify-content:space-between;margin:5px 0;"><span>Tổng tiền hàng</span><b>${formatVND(order.subtotal)}</b></div>
      ${order.discountValue > 0 ? `<div style="display:flex;justify-content:space-between;color:#dc2626;margin:5px 0;"><span>Giảm giá hóa đơn</span><b>-${formatVND(order.discountValue)}</b></div>` : ''}
      ${order.pointsDiscountAmount ? `<div style="display:flex;justify-content:space-between;color:#dc2626;margin:5px 0;"><span>Đổi điểm thưởng</span><b>-${formatVND(order.pointsDiscountAmount)}</b></div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;border-top:2px solid #0f172a;margin-top:10px;padding-top:10px;font-size:17px;font-weight:800;"><span>KHÁCH CẦN TRẢ</span><span>${formatVND(order.finalTotal)}</span></div>
      <div style="display:flex;justify-content:space-between;margin:7px 0;font-size:13px;"><span>Phương thức</span><b>${payment}</b></div>
      <div style="display:flex;justify-content:space-between;margin:7px 0;font-size:13px;"><span>Khách đã trả</span><b>${formatVND(order.amountPaid)}</b></div>
      ${newDebt > 0 ? `<div style="display:flex;justify-content:space-between;color:#c2410c;margin:7px 0;font-weight:700;"><span>Nợ phát sinh đơn này</span><b>${formatVND(newDebt)}</b></div>` : ''}
      ${previousDebt > 0 || newDebt > 0 || totalDebt > 0 ? `
        <div style="border-top:1px dashed #cbd5e1;margin-top:10px;padding-top:8px;font-size:13px;">
          <div style="display:flex;justify-content:space-between;margin:4px 0;"><span>Nợ cũ trước đơn</span><b>${formatVND(previousDebt)}</b></div>
          <div style="display:flex;justify-content:space-between;margin:4px 0;"><span>Nợ mới của đơn</span><b>${formatVND(newDebt)}</b></div>
          <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid #fed7aa;color:#c2410c;font-size:15px;font-weight:800;"><span>TỔNG NỢ HIỆN TẠI</span><span>${formatVND(totalDebt)}</span></div>
        </div>` : ''}
      ${order.pointsEarned > 0 ? `<div style="text-align:center;color:#15803d;background:#f0fdf4;padding:8px;margin-top:10px;">★ Tích lũy +${order.pointsEarned} điểm</div>` : ''}
    </div>
    <div style="text-align:center;border-top:1px dashed #94a3b8;margin-top:16px;padding-top:14px;font-size:13px;color:#475569;">
      <div>${escapeHtml(settings.greetingReceipt)}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:6px;">Phần mềm Quản lý Tạp Hóa Pro</div>
    </div>`;
  document.body.appendChild(node);

  try {
    const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
    const blob = await dataUrlToBlob(dataUrl);
    const fileName = `hoa-don-${String(order.orderNumber).replace(/[^a-zA-Z0-9_-]/g, '-')}.png`;

    if (Capacitor.isNativePlatform()) {
      const base64 = await blobToBase64(blob);
      const saved = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
      });
      await Share.share({
        title: `Hóa đơn ${order.orderNumber}`,
        text: `Hóa đơn ${order.orderNumber} - ${settings.storeName}`,
        files: [saved.uri],
        dialogTitle: 'Chia sẻ hóa đơn',
      });
      return;
    }

    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({ title: `Hóa đơn ${order.orderNumber}`, files: [file] });
      return;
    }
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    link.click();
    alert('Đã tạo ảnh hóa đơn. Hãy đính kèm ảnh vừa tải khi gửi qua Zalo.');
  } finally {
    node.remove();
  }
}
