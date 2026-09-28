import React, { useState, useEffect } from 'react';
import {
  Cloud,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Store
} from 'lucide-react';
import { AppStateData, StoreSettings } from '../types';
import { exportLocalBackupJson, formatDate } from '../utils/storage';
import { driveService } from '../services/driveService';

interface SyncAndSettingsProps {
  appState: AppStateData;
  onRestoreState: (newState: AppStateData) => void;
  onUpdateSettings: (newSettings: StoreSettings) => void;
  onRefreshLastBackupDate: (dateStr: string) => void;
}

export const SyncAndSettingsComponent: React.FC<SyncAndSettingsProps> = ({
  appState,
  onRestoreState,
  onUpdateSettings,
  onRefreshLastBackupDate,
}) => {
  // Settings form
  const [storeName, setStoreName] = useState(appState.settings.storeName);
  const [phone, setPhone] = useState(appState.settings.phone);
  const [address, setAddress] = useState(appState.settings.address);
  const [greetingReceipt, setGreetingReceipt] = useState(appState.settings.greetingReceipt);
  const [pointRate, setPointRate] = useState(appState.settings.pointRate || 10000);
  const [pointRedemptionValue, setPointRedemptionValue] = useState(appState.settings.pointRedemptionValue || 100);
  const [autoBackupDrive, setAutoBackupDrive] = useState(appState.settings.autoBackupDrive || false);
  const [isSettingsSaved, setIsSettingsSaved] = useState(false);

  // Google Drive state
  const [driveToken, setDriveToken] = useState<string | null>(driveService.getSavedToken());
  const [driveStatusMsg, setDriveStatusMsg] = useState<string | null>(null);
  const [isDriveLoading, setIsDriveLoading] = useState(false);

  // File restore from local computer
  const [fileRestoreError, setFileRestoreError] = useState<string | null>(null);
  const [fileRestoreSuccess, setFileRestoreSuccess] = useState(false);

  useEffect(() => {
    // Check if Google GSI is loaded
    const checkGoogleApi = () => {
      if (window.google?.accounts?.oauth2) {
        // Init token client with client ID if present
        // AI Studio automatically configured OAuth with Drive scope
      }
    };
    checkGoogleApi();
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StoreSettings = {
      ...appState.settings,
      storeName: storeName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      greetingReceipt: greetingReceipt.trim(),
      pointRate: Number(pointRate) || 10000,
      pointRedemptionValue: Number(pointRedemptionValue) || 100,
      autoBackupDrive,
    };
    onUpdateSettings(updated);
    setIsSettingsSaved(true);
    setTimeout(() => setIsSettingsSaved(false), 3000);
  };

  const handleExportLocalFile = () => {
    exportLocalBackupJson(appState);
  };

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileRestoreError(null);
    setFileRestoreSuccess(false);

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as AppStateData;

        if (!parsed.products || !Array.isArray(parsed.products)) {
          throw new Error('Tập tin sao lưu không đúng định dạng của Tạp Hóa Pro.');
        }

        if (confirm(`Tìm thấy ${parsed.products.length} sản phẩm và ${parsed.orders?.length || 0} đơn hàng trong tệp sao lưu. Bạn có muốn phục hồi toàn bộ dữ liệu này?`)) {
          onRestoreState(parsed);
          setFileRestoreSuccess(true);
        }
      } catch (err: any) {
        setFileRestoreError(err.message || 'Không thể đọc tệp sao lưu JSON!');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  // Google Drive Manual Login & Backup
  const handleConnectGoogleDrive = () => {
    setIsDriveLoading(true);
    setDriveStatusMsg(null);

    // Using Google Identity Services client token flow
    const clientId = '1009383212611-preview.apps.googleusercontent.com'; // configured in AI Studio oauth

    if (window.google?.accounts?.oauth2) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: async (resp: any) => {
          if (resp.error) {
            setIsDriveLoading(false);
            setDriveStatusMsg(`Không thể kết nối Drive: ${resp.error}`);
            return;
          }
          setDriveToken(resp.access_token);
          localStorage.setItem('gdrive_token', resp.access_token);
          setIsDriveLoading(false);
          setDriveStatusMsg('Đã kết nối thành công tài khoản Google Drive!');
        },
      });
      client.requestAccessToken();
    } else {
      setIsDriveLoading(false);
      // If GSI script isn't dynamically populated yet, provide fallback token input or instructions
      const manualToken = prompt('Vui lòng cấp Access Token Google Drive (hoặc dùng tính năng Sao lưu tải về máy tính để đồng bộ sang máy khác):');
      if (manualToken) {
        setDriveToken(manualToken);
        localStorage.setItem('gdrive_token', manualToken);
        setDriveStatusMsg('Đã lưu mã truy cập Google Drive');
      }
    }
  };

  const handleBackupToDriveNow = async () => {
    if (!driveToken) {
      handleConnectGoogleDrive();
      return;
    }

    setIsDriveLoading(true);
    setDriveStatusMsg(null);

    try {
      const res = await driveService.uploadBackupToDrive(driveToken, appState);
      const nowStr = new Date().toISOString();
      onRefreshLastBackupDate(nowStr);
      setDriveStatusMsg(`Đã sao lưu thành công lên Google Drive lúc ${formatDate(nowStr)} (ID tệp: ${res.fileId})`);
    } catch (err: any) {
      setDriveStatusMsg(`Lỗi khi sao lưu: ${err.message}`);
      if (err.message.includes('hết hạn')) {
        setDriveToken(null);
      }
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleRestoreFromDriveNow = async () => {
    if (!driveToken) {
      handleConnectGoogleDrive();
      return;
    }

    setIsDriveLoading(true);
    setDriveStatusMsg(null);

    try {
      const restored = await driveService.restoreBackupFromDrive(driveToken);
      if (!restored) {
        setDriveStatusMsg('Không tìm thấy tệp sao lưu "taphoa_pro_backup_database.json" trên tài khoản Google Drive này.');
        return;
      }

      if (
        confirm(
          `Tìm thấy bản sao lưu trên Drive (${restored.products.length} SP, ${restored.orders.length} đơn). Bạn có muốn đồng bộ phục hồi đè lên dữ liệu máy này?`
        )
      ) {
        onRestoreState(restored);
        setDriveStatusMsg('Đã phục hồi đồng bộ dữ liệu thành công từ Google Drive!');
      }
    } catch (err: any) {
      setDriveStatusMsg(`Lỗi khi phục hồi từ Drive: ${err.message}`);
      if (err.message.includes('hết hạn')) {
        setDriveToken(null);
      }
    } finally {
      setIsDriveLoading(false);
    }
  };

  return (
    <div className="p-3 md:p-6 space-y-6 bg-slate-50 min-h-full">
      {/* SECTION 1: DỒNG BỘ GOOGLE DRIVE & LƯU TRỮ TRÊN MÁY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Drive Sync Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm md:text-base">
                    Đồng bộ Google Drive Cá Nhân
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Lưu trữ dữ liệu lên đám mây, tự động khôi phục khi đổi điện thoại/máy tính
                  </p>
                </div>
              </div>
              {driveToken ? (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                  Đã kết nối
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-medium">
                  Chưa kết nối
                </span>
              )}
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Khi kích hoạt, toàn bộ danh mục sản phẩm, lịch sử đơn bán hàng, sổ nợ khách và điểm tích lũy được đóng gói an toàn và lưu vào thư mục Drive cá nhân của bạn.
              </p>

              {appState.lastBackupDate && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 flex items-center justify-between">
                  <span>Lần sao lưu gần nhất:</span>
                  <span className="font-bold text-slate-800">{formatDate(appState.lastBackupDate)}</span>
                </div>
              )}

              {driveStatusMsg && (
                <div className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                  driveStatusMsg.includes('Lỗi') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}>
                  {driveStatusMsg.includes('Lỗi') ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{driveStatusMsg}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
            {!driveToken ? (
              <button
                type="button"
                onClick={handleConnectGoogleDrive}
                disabled={isDriveLoading}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow"
              >
                <Cloud className="w-4 h-4" /> Kết nối Google Drive của bạn
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleBackupToDriveNow}
                  disabled={isDriveLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <Upload className="w-4 h-4" /> Sao lưu lên Drive ngay
                </button>
                <button
                  type="button"
                  onClick={handleRestoreFromDriveNow}
                  disabled={isDriveLoading}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-4 h-4 ${isDriveLoading ? 'animate-spin' : ''}`} /> Tải & Khôi phục từ Drive
                </button>
              </>
            )}
          </div>
        </div>

        {/* Local File Backup & Restore Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm md:text-base">
                  Sao Lưu & Chuyển Đổi Máy Bằng Tệp Tin
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tạo tệp JSON tải về máy hoặc nạp tệp từ máy cũ sang máy mới
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                Bạn có thể <strong>Xuất tệp sao lưu</strong> về máy tính hoặc điện thoại bất cứ lúc nào. Khi đổi máy mới, chỉ cần ấn nút <strong>Chọn tệp nạp lại</strong>, toàn bộ thông tin bán hàng sẽ ngay lập tức được khôi phục 100%.
              </p>

              {fileRestoreSuccess && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Đã khôi phục dữ liệu từ tệp tin thành công!
                </div>
              )}

              {fileRestoreError && (
                <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {fileRestoreError}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportLocalFile}
              className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow"
            >
              <Download className="w-4 h-4" /> Tải tệp sao lưu về máy (.json)
            </button>

            <label className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer text-center">
              <Upload className="w-4 h-4" /> Chọn tệp để nạp lại
              <input
                type="file"
                accept=".json"
                onChange={handleLocalFileSelect}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* SECTION 2: CẤU HÌNH THÔNG TIN CỬA HÀNG VÀ TÍCH ĐIỂM */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Cấu hình Cửa Hàng & In Hóa Đơn</h3>
            <p className="text-xs text-slate-500">Thông tin xuất hiện trên phiếu tính tiền và tỷ lệ điểm thưởng</p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="mt-4 space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tên cửa hàng tạp hóa (*)</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-sm text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Số điện thoại liên hệ</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Địa chỉ cửa hàng</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Lời chào / Lời cảm ơn in dưới hóa đơn</label>
            <input
              type="text"
              value={greetingReceipt}
              onChange={e => setGreetingReceipt(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          {/* Point policy */}
          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-amber-950 font-bold mb-1">
                Tỷ lệ tích lũy điểm (Số tiền để nhận 1 điểm)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={pointRate}
                  onChange={e => setPointRate(Number(e.target.value) || 10000)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg font-bold bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">VNĐ / 1 điểm</span>
              </div>
              <p className="text-[11px] text-amber-800 mt-1">Ví dụ: 10,000 đ = 1 điểm. Mua 100,000 đ được cộng 10 điểm.</p>
            </div>

            <div>
              <label className="block text-amber-950 font-bold mb-1">
                Giá trị quy đổi khi khách tiêu điểm
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={pointRedemptionValue}
                  onChange={e => setPointRedemptionValue(Number(e.target.value) || 100)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg font-bold bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">VNĐ / 1 điểm</span>
              </div>
              <p className="text-[11px] text-amber-800 mt-1">Ví dụ: 1 điểm = 100 đ. Khách dùng 50 điểm sẽ được giảm 5,000 đ vào đơn hàng.</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {isSettingsSaved ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Đã lưu cấu hình thành công!
              </span>
            ) : (
              <span className="text-slate-400 text-xs">Hãy lưu lại khi thay đổi thông tin cửa hàng</span>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow"
            >
              <Save className="w-4 h-4" /> Lưu cấu hình
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
