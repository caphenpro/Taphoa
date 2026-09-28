import { AppStateData } from '../types';

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

const BACKUP_FILE_NAME = 'taphoa_pro_backup_database.json';
const BACKUP_FOLDER_NAME = 'TapHoa_Pro_Backup';

export interface DriveAuthState {
  isSignedIn: boolean;
  accessToken: string | null;
  userEmail: string | null;
  userName: string | null;
  isLoading: boolean;
  error: string | null;
}

// Drive client for client-side authorization
class GoogleDriveService {
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private isGsiLoaded: boolean = false;

  constructor() {
    this.accessToken = localStorage.getItem('gdrive_token');
  }

  public getSavedToken(): string | null {
    return this.accessToken;
  }

  public initTokenClient(clientId: string, onTokenCallback: (token: string, email?: string) => void) {
    if (window.google?.accounts?.oauth2) {
      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: (response: any) => {
            if (response.error !== undefined) {
              console.error('Google OAuth error:', response);
              return;
            }
            this.accessToken = response.access_token;
            localStorage.setItem('gdrive_token', response.access_token);
            onTokenCallback(response.access_token);
          },
        });
      } catch (err) {
        console.error('Failed to init token client:', err);
      }
    }
  }

  public requestToken() {
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  }

  public signOut() {
    this.accessToken = null;
    localStorage.removeItem('gdrive_token');
  }

  // Upload or update backup file in Google Drive
  public async uploadBackupToDrive(token: string, data: AppStateData): Promise<{ fileId: string; modifiedTime: string }> {
    const backupContent = JSON.stringify(data, null, 2);

    // 1. Search for existing file
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and trashed=false&fields=files(id, name, modifiedTime)`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!searchRes.ok) {
      if (searchRes.status === 401) {
        throw new Error('Phiên đăng nhập Google đã hết hạn. Vui lòng kết nối lại!');
      }
      throw new Error(`Lỗi tìm file Drive: ${searchRes.statusText}`);
    }

    const searchJson = await searchRes.json();
    const existingFile = searchJson.files && searchJson.files.length > 0 ? searchJson.files[0] : null;

    if (existingFile) {
      // Update existing file content
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
      const updateRes = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: backupContent,
      });

      if (!updateRes.ok) {
        throw new Error(`Lỗi cập nhật sao lưu: ${updateRes.statusText}`);
      }

      return {
        fileId: existingFile.id,
        modifiedTime: new Date().toISOString(),
      };
    } else {
      // Create new multipart file
      const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: 'application/json',
        description: 'Tập tin sao lưu dữ liệu Tạp Hóa Pro',
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        backupContent +
        closeDelim;

      const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      const createRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      if (!createRes.ok) {
        throw new Error(`Lỗi tạo file sao lưu trên Google Drive: ${createRes.statusText}`);
      }

      const createJson = await createRes.json();
      return {
        fileId: createJson.id,
        modifiedTime: new Date().toISOString(),
      };
    }
  }

  // Restore latest backup from Google Drive
  public async restoreBackupFromDrive(token: string): Promise<AppStateData | null> {
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and trashed=false&fields=files(id, name, modifiedTime, size)&orderBy=modifiedTime desc`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!searchRes.ok) {
      if (searchRes.status === 401) {
        throw new Error('Phiên đăng nhập Google đã hết hạn. Vui lòng kết nối lại!');
      }
      throw new Error(`Không thể tìm file trên Google Drive: ${searchRes.statusText}`);
    }

    const searchJson = await searchRes.json();
    if (!searchJson.files || searchJson.files.length === 0) {
      return null;
    }

    const file = searchJson.files[0];
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
    const downloadRes = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!downloadRes.ok) {
      throw new Error(`Lỗi tải dữ liệu sao lưu: ${downloadRes.statusText}`);
    }

    const parsedData = await downloadRes.json();
    return parsedData as AppStateData;
  }
}

export const driveService = new GoogleDriveService();
