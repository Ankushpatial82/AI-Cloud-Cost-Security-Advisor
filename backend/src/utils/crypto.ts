import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

// Load key from environment or use a secure fallback for local dev
const getEncryptionKey = (): Buffer => {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    if (envKey.length === 64) {
      return Buffer.from(envKey, "hex");
    }
    // If it's a raw 32-character string
    if (envKey.length === 32) {
      return Buffer.from(envKey, "utf8");
    }
  }
  // Safe fallback for dev
  return crypto.scryptSync("secure-default-fallback-password-12345", "salt", 32);
};

export const encrypt = (text: string): string => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Return IV, auth tag, and ciphertext combined in a single string
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
};

export const decrypt = (cipherText: string): string => {
  try {
    const key = getEncryptionKey();
    const parts = cipherText.split(":");
    
    if (parts.length !== 3) {
      throw new Error("Invalid cipher text format");
    }
    
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error: any) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};
