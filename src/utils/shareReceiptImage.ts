import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { toPng } from 'html-to-image';
import { Order, StoreSettings } from '../types';
import { buildReceiptHtml } from './printReceipt';

const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const result = String(reader.result || '');
    const base64 = result.split(',')[1];
    if (base64) resolve(base64);
    else reject(new Error('Không chuyển được ảnh hóa đơn sang dữ liệu chia sẻ'));
  };
  reader.onerror = () => reject(reader.error || new Error('Không đọc được ảnh hóa đơn'));
  reader.readAsDataURL(blob);
});

/**
 * Render the exact same receipt document used by the print/PDF flow to PNG,
 * then share that PNG through the Android share sheet (including Zalo).
 */
export async function shareReceiptImage(order: Order, settings: StoreSettings): Promise<void> {
  const receiptHtml = buildReceiptHtml(order, settings);
  const parsed = new DOMParser().parseFromString(receiptHtml, 'text/html');
  const node = document.createElement('div');

  node.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    'width:340px',
    'box-sizing:border-box',
    'padding:8px',
    'background:#ffffff',
    'color:#0f172a',
    'z-index:2147483000',
    'overflow:visible',
  ].join(';');

  // Reuse the print template's CSS and body markup so the shared image
  // cannot drift from the receipt shown in the print/PDF preview.
  parsed.head.querySelectorAll('style').forEach(sourceStyle => {
    const style = document.createElement('style');
    style.textContent = sourceStyle.textContent || '';
    node.appendChild(style);
  });

  const receiptContent = parsed.body.cloneNode(true) as HTMLElement;
  receiptContent.querySelectorAll('script, .no-print').forEach(element => element.remove());
  receiptContent.style.margin = '0 auto';
  receiptContent.style.width = '100%';
  receiptContent.style.maxWidth = '340px';
  receiptContent.style.background = '#ffffff';
  node.appendChild(receiptContent);
  document.body.appendChild(node);

  try {
    // Wait for WebView layout to finish before rasterizing. Capturing
    // immediately after append can produce a transparent/blank PNG.
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
      width: 356,
      height: Math.ceil(node.scrollHeight),
      style: { transform: 'none' },
    });

    const response = await fetch(dataUrl);
    const blob = await response.blob();
    if (!blob.size || !blob.type.includes('image/png')) {
      throw new Error('Ảnh hóa đơn được tạo không hợp lệ');
    }

    const safeOrderNumber = String(order.orderNumber).replace(/[^a-zA-Z0-9_-]/g, '-');
    const fileName = `hoa-don-${safeOrderNumber}.png`;

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
    alert('Đã tạo ảnh hóa đơn từ mẫu in PDF. Hãy gửi ảnh vừa tải qua Zalo.');
  } finally {
    node.remove();
  }
}
