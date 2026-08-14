import speakeasy from "speakeasy";
import QRCode from "qrcode";

export interface MFASecretResponse {
  secret: string;
  otpauthUrl: string;
}

export const generateMFASecret = (email: string): MFASecretResponse => {
  const secret = speakeasy.generateSecret({
    name: `AI Cloud Cost & Security Advisor (${email})`,
    issuer: "AI Cloud Advisor",
  });
  
  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url || "",
  };
};

export const generateQRCodeDataURL = async (otpauthUrl: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(otpauthUrl);
  } catch (error: any) {
    throw new Error(`Failed to generate QR Code: ${error.message}`);
  }
};

export const verifyMFAToken = (secret: string, token: string): boolean => {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1, // Allow a 30s clock skew
  });
};
