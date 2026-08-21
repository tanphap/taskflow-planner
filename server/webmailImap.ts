import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

type DnsLookup = (hostname: string, options: { all: true; verbatim: true }) => Promise<Array<{ address: string; family: number }>>;

function isPublicIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  return true;
}

function isPublicIpv6(address: string) {
  const normalized = address.toLowerCase();
  return normalized !== "::" && normalized !== "::1" && !normalized.startsWith("fc") && !normalized.startsWith("fd") && !normalized.startsWith("fe80:");
}

export function isWebmailImapHostname(value: string) {
  const hostname = value.trim().toLowerCase();
  return hostname.length <= 253
    && hostname.includes(".")
    && isIP(hostname) === 0
    && !hostname.endsWith(".")
    && !hostname.includes("..")
    && !hostname.includes(":")
    && !hostname.endsWith(".localhost")
    && hostname !== "localhost"
    && hostname.split(".").every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
}

export async function resolvePublicWebmailImapHost(hostname: string, dnsLookup: DnsLookup = lookup) {
  const normalizedHost = hostname.trim().toLowerCase();
  if (!isWebmailImapHostname(normalizedHost)) throw new Error("Máy chủ IMAP phải là tên miền công khai, ví dụ email.vnpt.vn.");
  const addresses = await dnsLookup(normalizedHost, { all: true, verbatim: true }).catch(() => {
    throw new Error("Không thể phân giải máy chủ IMAP. Hãy kiểm tra lại tên máy chủ.");
  });
  const publicAddress = addresses.find(result => result.family === 4 ? isPublicIpv4(result.address) : isPublicIpv6(result.address));
  if (!publicAddress) throw new Error("Máy chủ IMAP phải trỏ tới địa chỉ công khai, không phải mạng nội bộ.");
  return { hostname: normalizedHost, address: publicAddress.address };
}
