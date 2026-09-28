import { Order, StoreSettings } from '../types';
import { formatVND, formatDate } from './storage';

export function printReceipt(order: Order, settings: StoreSettings) {
  const printWindow = window.open('', '_blank', 'width=450,height=700');
  if (!printWindow) {
    alert('Vui lòng cho phép popup để in hóa đơn bán hàng!');
    return;
  }

  const itemsHtml = order.items.map((item, idx) => `
    <tr>
      <td style="padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px;">
        <div style="font-weight: 600;">${idx + 1}. ${item.name}</div>
        <div style="font-size: 11px; color: #64748b;">
          ${item.quantity} ${item.unit} x ${formatVND(item.customPrice)}
          ${item.discountValue > 0 ? `(Giảm ${item.discountType === 'percentage' ? item.discountValue + '%' : formatVND(item.discountValue)})` : ''}
        </div>
      </td>
      <td style="padding: 6px 0; border-bottom: 1px dashed #e2e8f0; text-align: right; vertical-align: top; font-weight: 600; font-size: 13px;">
        ${formatVND(item.subtotal)}
      </td>
    </tr>
  `).join('');

  const paymentText = order.paymentMethod === 'cash' ? 'Tiền mặt' : order.paymentMethod === 'transfer' ? 'Chuyển khoản ngân hàng' : 'Chia khoản';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Hóa đơn ${order.orderNumber}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 8px;
            color: #0f172a;
            line-height: 1.4;
            width: 100%;
            max-width: 340px;
            margin: 0 auto;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .divider { border-bottom: 1px dashed #94a3b8; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px; }
          .total-row { font-size: 16px; font-weight: bold; margin: 8px 0; padding-top: 4px; border-top: 1px solid #0f172a; }
          table { width: 100%; border-collapse: collapse; }
          .badge { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="text-center" style="margin-bottom: 8px;">
          <h2 style="margin: 0 0 4px 0; font-size: 18px; text-transform: uppercase;">${settings.storeName}</h2>
          <div style="font-size: 12px; color: #475569;">Đ/C: ${settings.address}</div>
          <div style="font-size: 12px; color: #475569;">SĐT: ${settings.phone}</div>
          <div style="margin-top: 6px; font-size: 15px; font-weight: bold; letter-spacing: 0.5px;">PHIẾU THANH TOÁN</div>
          <div style="font-size: 11px; color: #64748b;">Mã: ${order.orderNumber} - ${formatDate(order.createdAt)}</div>
        </div>

        <div class="divider"></div>

        <div style="font-size: 12px; margin-bottom: 8px;">
          <div><strong>Khách hàng:</strong> ${order.customerName || 'Khách lẻ'}</div>
          ${order.customerPhone ? `<div><strong>SĐT:</strong> ${order.customerPhone}</div>` : ''}
        </div>

        <table>
          <thead>
            <tr style="border-bottom: 1px solid #cbd5e1; font-size: 12px; text-transform: uppercase; color: #64748b;">
              <th style="text-align: left; padding-bottom: 4px;">Sản phẩm</th>
              <th style="text-align: right; padding-bottom: 4px;">T.Tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        <div class="row">
          <span>Tổng tiền hàng:</span>
          <span>${formatVND(order.subtotal)}</span>
        </div>

        ${order.discountValue > 0 ? `
          <div class="row" style="color: #dc2626;">
            <span>Giảm giá hóa đơn:</span>
            <span>-${formatVND(order.discountValue)}</span>
          </div>
        ` : ''}

        ${order.pointsDiscountAmount && order.pointsDiscountAmount > 0 ? `
          <div class="row" style="color: #dc2626;">
            <span>Đổi ${order.pointsRedeemed} điểm thưởng:</span>
            <span>-${formatVND(order.pointsDiscountAmount)}</span>
          </div>
        ` : ''}

        <div class="row total-row">
          <span>KHÁCH CẦN TRẢ:</span>
          <span style="color: #0f172a;">${formatVND(order.finalTotal)}</span>
        </div>

        <div class="row" style="font-size: 12px;">
          <span>Phương thức:</span>
          <span class="badge">${paymentText}</span>
        </div>

        <div class="row" style="font-size: 13px;">
          <span>Khách đã trả:</span>
          <span class="font-bold">${formatVND(order.amountPaid)}</span>
        </div>

        ${order.debtAmount > 0 ? `
          <div class="row" style="color: #ea580c; font-weight: bold; font-size: 13px;">
            <span>GHI NỢ CÒN LẠI:</span>
            <span>${formatVND(order.debtAmount)}</span>
          </div>
        ` : `
          <div class="row" style="color: #16a34a; font-size: 12px;">
            <span>Tiền thừa trả khách:</span>
            <span>${formatVND(Math.max(0, order.amountPaid - order.finalTotal))}</span>
          </div>
        `}

        ${order.pointsEarned > 0 ? `
          <div style="margin-top: 6px; padding: 4px; background: #f0fdf4; border-radius: 4px; text-align: center; font-size: 11px; color: #15803d;">
            ★ Đơn hàng này được tích lũy <strong>+${order.pointsEarned}</strong> điểm thưởng
          </div>
        ` : ''}

        <div class="divider"></div>

        <div class="text-center" style="margin-top: 10px; font-size: 12px; color: #475569;">
          <div>${settings.greetingReceipt}</div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Phần mềm Quản lý Tạp Hóa Pro</div>
        </div>

        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 8px 16px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            In Hóa Đơn / Lưu PDF
          </button>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function printFinancialSummaryPDF(
  title: string,
  summaryItems: { label: string; value: string; highlight?: boolean }[],
  tableHeaders: string[],
  tableRows: string[][],
  storeSettings: StoreSettings
) {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    alert('Vui lòng cho phép popup để xem báo cáo in!');
    return;
  }

  const cardsHtml = summaryItems.map(item => `
    <div style="background: ${item.highlight ? '#eff6ff' : '#f8fafc'}; border: 1px solid ${item.highlight ? '#bfdbfe' : '#e2e8f0'}; padding: 10px 14px; border-radius: 8px; flex: 1; min-width: 140px;">
      <div style="font-size: 12px; color: #64748b;">${item.label}</div>
      <div style="font-size: 18px; font-weight: bold; color: ${item.highlight ? '#1d4ed8' : '#0f172a'}; margin-top: 4px;">${item.value}</div>
    </div>
  `).join('');

  const headersHtml = tableHeaders.map(h => `<th style="padding: 8px; border: 1px solid #cbd5e1; background: #f1f5f9; text-align: left; font-size: 12px;">${h}</th>`).join('');

  const rowsHtml = tableRows.map(row => `
    <tr>
      ${row.map(cell => `<td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 12px;">${cell}</td>`).join('')}
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - ${storeSettings.storeName}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 16px;
            color: #0f172a;
          }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 12px;">
          <div>
            <h2 style="margin: 0; color: #0284c7; font-size: 20px;">${storeSettings.storeName}</h2>
            <div style="font-size: 12px; color: #475569; margin-top: 2px;">Địa chỉ: ${storeSettings.address} | Hotline: ${storeSettings.phone}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: #64748b;">Thời gian lập báo cáo:</div>
            <div style="font-weight: 600; font-size: 13px;">${formatDate(new Date().toISOString())}</div>
          </div>
        </div>

        <h1 style="text-align: center; margin: 18px 0 12px 0; font-size: 18px; text-transform: uppercase; color: #1e293b;">
          ${title}
        </h1>

        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
          ${cardsHtml}
        </div>

        <table>
          <thead>
            <tr>${headersHtml}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 30px; display: flex; justify-content: space-between; text-align: center;">
          <div style="font-size: 13px;">
            <p><strong>Người lập báo cáo</strong></p>
            <p style="margin-top: 40px; color: #64748b;">(Ký & ghi rõ họ tên)</p>
          </div>
          <div style="font-size: 13px;">
            <p><strong>Chủ cửa hàng tạp hóa</strong></p>
            <p style="margin-top: 40px; color: #64748b;">(Ký & xác nhận)</p>
          </div>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 24px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;">
            Xuất PDF / In Báo Cáo
          </button>
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
