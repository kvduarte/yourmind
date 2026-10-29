/**
 * Garante que o link seja http(s) e seguro para usar em <a href>.
 * - "youtube.com/watch?v=1"  ->  "https://youtube.com/watch?v=1"
 * - "javascript:..." e outros esquemas  ->  "" (bloqueado)
 */
export function normalizeUrl(value?: string | null): string {
  const url = (value ?? "").trim();

  if (!url) return "";

  if (/^https?:\/\//i.test(url)) return url;

  // Qualquer outro esquema (javascript:, data:, file:...) é bloqueado.
  if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(url)) return "";

  return `https://${url.replace(/^\/+/, "")}`;
}

/** Texto curto para mostrar no botão: "youtube.com". */
export function linkLabel(value?: string | null): string {
  const url = normalizeUrl(value);

  if (!url) return "";

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Prepara o endereço de uma IMAGEM para funcionar no <img>:
 * - aceita sem "https://"
 * - Google Imagens (/imgres?imgurl=...) -> pega o endereço direto da imagem
 * - links de redirecionamento do Google (/url?q=...)
 * - Google Drive (/file/d/ID/view) -> endereço de exibição
 * - Dropbox (?dl=0) -> ?raw=1
 */
export function normalizeImageUrl(value?: string | null): string {
  const raw = (value ?? "").trim();

  if (!raw) return "";

  if (/^data:image\//i.test(raw)) return raw;

  const url = normalizeUrl(raw);

  if (!url) return "";

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const isGoogle = /^google\./.test(host);

    if (isGoogle && parsed.pathname === "/imgres") {
      const direct = parsed.searchParams.get("imgurl");

      if (direct) return normalizeImageUrl(direct);
    }

    if (isGoogle && parsed.pathname === "/url") {
      const target =
        parsed.searchParams.get("url") || parsed.searchParams.get("q");

      if (target) return normalizeImageUrl(target);
    }

    if (host === "drive.google.com") {
      const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      const id = match?.[1] ?? parsed.searchParams.get("id");

      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }

    if (host.endsWith("dropbox.com")) {
      parsed.searchParams.delete("dl");
      parsed.searchParams.set("raw", "1");

      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return url;
  }
}