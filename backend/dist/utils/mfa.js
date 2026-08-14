"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMFAToken = exports.generateQRCodeDataURL = exports.generateMFASecret = void 0;
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
const generateMFASecret = (email) => {
    const secret = speakeasy_1.default.generateSecret({
        name: `AI Cloud Cost & Security Advisor (${email})`,
        issuer: "AI Cloud Advisor",
    });
    return {
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url || "",
    };
};
exports.generateMFASecret = generateMFASecret;
const generateQRCodeDataURL = async (otpauthUrl) => {
    try {
        return await qrcode_1.default.toDataURL(otpauthUrl);
    }
    catch (error) {
        throw new Error(`Failed to generate QR Code: ${error.message}`);
    }
};
exports.generateQRCodeDataURL = generateQRCodeDataURL;
const verifyMFAToken = (secret, token) => {
    return speakeasy_1.default.totp.verify({
        secret,
        encoding: "base32",
        token,
        window: 1, // Allow a 30s clock skew
    });
};
exports.verifyMFAToken = verifyMFAToken;
