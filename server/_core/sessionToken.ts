import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";

type RequestHeaders = {
  cookie?: string;
  authorization?: string;
};

/**
 * Returns the signed OAuth session from either first-party cookies or the
 * Bearer fallback used by preview and production browsers that block cookies.
 */
export function getRequestSessionToken(headers: RequestHeaders): string {
  const cookieToken = parseCookie(headers.cookie ?? "")[COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const authorization = headers.authorization;
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
}
