export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  authTag: string;
}

export interface ShamirShare {
  shareType: 'user_share' | 'recovery_share' | 'device_share';
  encryptedShare: string;
}

export class CryptoUtils {
  static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return this.arrayBufferToBase64(exported);
  }

  static async importKey(keyString: string): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(keyString);
    return await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async encryptData(
    data: ArrayBuffer | string,
    key: CryptoKey
  ): Promise<EncryptionResult> {
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const dataBuffer = typeof data === 'string'
      ? new TextEncoder().encode(data)
      : data;

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      key,
      dataBuffer
    );

    const encryptedArray = new Uint8Array(encryptedBuffer);
    const authTagLength = 16;
    const ciphertext = encryptedArray.slice(0, -authTagLength);
    const authTag = encryptedArray.slice(-authTagLength);

    return {
      encryptedData: this.arrayBufferToBase64(ciphertext),
      iv: this.arrayBufferToBase64(iv),
      authTag: this.arrayBufferToBase64(authTag),
    };
  }

  static async decryptData(
    encryptedData: string,
    iv: string,
    authTag: string,
    key: CryptoKey
  ): Promise<ArrayBuffer> {
    const ciphertext = this.base64ToArrayBuffer(encryptedData);
    const ivBuffer = this.base64ToArrayBuffer(iv);
    const authTagBuffer = this.base64ToArrayBuffer(authTag);

    const encryptedBuffer = new Uint8Array(ciphertext.byteLength + authTagBuffer.byteLength);
    encryptedBuffer.set(new Uint8Array(ciphertext), 0);
    encryptedBuffer.set(new Uint8Array(authTagBuffer), ciphertext.byteLength);

    try {
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBuffer,
          tagLength: 128,
        },
        key,
        encryptedBuffer
      );
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed: Invalid key or corrupted data');
    }
  }

  static async decryptToString(
    encryptedData: string,
    iv: string,
    authTag: string,
    key: CryptoKey
  ): Promise<string> {
    const decrypted = await this.decryptData(encryptedData, iv, authTag, key);
    return new TextDecoder().decode(decrypted);
  }

  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToBase64(hashBuffer);
  }

  static generateRandomToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static generateOTP(): string {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return (array[0] % 1000000).toString().padStart(6, '0');
  }

  static splitSecretShamir(secret: string): ShamirShare[] {
    const secretBytes = new TextEncoder().encode(secret);
    const shares: ShamirShare[] = [];

    const randomBytes1 = crypto.getRandomValues(new Uint8Array(secretBytes.length));
    const randomBytes2 = crypto.getRandomValues(new Uint8Array(secretBytes.length));

    const share3 = new Uint8Array(secretBytes.length);
    for (let i = 0; i < secretBytes.length; i++) {
      share3[i] = secretBytes[i] ^ randomBytes1[i] ^ randomBytes2[i];
    }

    shares.push({
      shareType: 'user_share',
      encryptedShare: this.arrayBufferToBase64(randomBytes1),
    });
    shares.push({
      shareType: 'recovery_share',
      encryptedShare: this.arrayBufferToBase64(randomBytes2),
    });
    shares.push({
      shareType: 'device_share',
      encryptedShare: this.arrayBufferToBase64(share3),
    });

    return shares;
  }

  static reconstructSecretShamir(
    share1: string,
    share2: string
  ): string {
    const bytes1 = new Uint8Array(this.base64ToArrayBuffer(share1));
    const bytes2 = new Uint8Array(this.base64ToArrayBuffer(share2));

    if (bytes1.length !== bytes2.length) {
      throw new Error('Share lengths do not match');
    }

    const reconstructed = new Uint8Array(bytes1.length);
    for (let i = 0; i < bytes1.length; i++) {
      reconstructed[i] = bytes1[i] ^ bytes2[i];
    }

    return new TextDecoder().decode(reconstructed);
  }

  static async encryptFile(file: File, key: CryptoKey): Promise<EncryptionResult> {
    const arrayBuffer = await file.arrayBuffer();
    return await this.encryptData(arrayBuffer, key);
  }

  static createDownloadLink(data: ArrayBuffer, filename: string, mimeType: string): void {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static addWatermark(text: string, username: string): string {
    const timestamp = new Date().toLocaleString();
    const watermark = `\n\n--- Decrypted by ${username} at ${timestamp} ---`;
    return text + watermark;
  }

  static async generateThumbnail(file: File): Promise<string | null> {
    if (!file.type.startsWith('image/')) {
      return null;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  static getDeviceInfo(): Record<string, string> {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
}
