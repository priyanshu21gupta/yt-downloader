// Validates standard YouTube URLs, Shorts, youtu.be links, and live URLs
const YOUTUBE_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]{11}/;

export function isValidYouTubeUrl(url) {
  if (!url || typeof url !== "string") return false;
  return YOUTUBE_REGEX.test(url.trim());
}