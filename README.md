# Tạp Hóa Pro

Ứng dụng quản lý bán hàng, tồn kho, công nợ và báo cáo. Giao diện được tối ưu cho màn hình điện thoại và có thể đóng gói thành ứng dụng Android thông qua Capacitor.

## Chạy web

```bash
npm install
npm run dev
```

## Tạo APK Android

Yêu cầu Node.js 22, JDK 21 và Android SDK/Gradle phù hợp.

```bash
npm install
npm run android:init   # chỉ chạy lần đầu để tạo thư mục android/
npm run android:sync
npm run android:debug
```

APK debug sẽ được tạo tại:

`android/app/build/outputs/apk/debug/app-debug.apk`

## Tự động tạo APK trên GitHub

Mở tab **Actions** → **Build Android APK** → **Run workflow**. Khi hoàn tất, tải artifact **taphoa-pro-android-debug** xuống và giải nén để lấy `app-debug.apk`.

APK debug có thể cài thử trên thiết bị Android. Để phát hành công khai, cần cấu hình khóa ký release và kiểm thử trên thiết bị thực tế.

## Lưu ý dữ liệu và bảo mật

- Bản Android này đóng gói giao diện web vào WebView của Capacitor; dữ liệu ứng dụng đang dùng local storage vẫn phụ thuộc thiết bị và trình duyệt WebView.
- APK không tự động đồng bộ dữ liệu giữa nhiều thiết bị. Hãy xuất/sao lưu dữ liệu trước khi cài lại hoặc xóa dữ liệu ứng dụng.
- Chức năng cần mạng (ví dụ Google Drive/AI nếu có cấu hình) vẫn cần internet và cấu hình quyền/khóa tương ứng.
- Không đưa khóa API bí mật vào mã frontend hoặc APK. Mọi khóa đặt trong ứng dụng client có thể bị trích xuất.
- CI tạo APK debug để thử nghiệm; chưa phải bản release đã ký để phát hành trên Google Play.
