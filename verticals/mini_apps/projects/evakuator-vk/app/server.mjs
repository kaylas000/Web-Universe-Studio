/* Проверка подписи платформы: Telegram initData и VK launch params через HMAC-SHA256. */
import { createHmac } from "node:crypto";

export function verifyInitData(initData, botToken) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort()
    .map((pair) => pair[0] + "=" + pair[1])
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calc = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  return calc === hash;
}

export function verifyVkSign(locationSearch, secretKey) {
  const params = new URLSearchParams(locationSearch.replace(/^\?/, ""));
  const sign = params.get("sign");
  params.delete("sign");
  const dataCheckString = [...params.entries()]
    .sort()
    .map((pair) => pair[0] + "=" + pair[1])
    .join("");
  const calc = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("base64url");
  return calc === sign;
}
