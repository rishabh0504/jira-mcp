import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.CREDENTIAL_SECRET_KEY || 'default_secret_key';

export class CryptoUtil {
  static encrypt(value: string): string {
    return CryptoJS.AES.encrypt(value, SECRET_KEY).toString();
  }

  static decrypt(encrypted: string): string {
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
