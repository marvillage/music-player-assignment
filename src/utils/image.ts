const FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/512px-Placeholder_view_vector.svg.png";

type RawImage = {
  quality?: string;
  link?: string;
  url?: string;
};

export const pickBestImage = (image: RawImage[] | undefined | null): string => {
  if (!Array.isArray(image) || image.length === 0) {
    return FALLBACK_IMAGE;
  }

  const sorted = [...image].sort((a, b) => {
    const qa = Number.parseInt((a.quality ?? "0").split("x")[0], 10) || 0;
    const qb = Number.parseInt((b.quality ?? "0").split("x")[0], 10) || 0;
    return qb - qa;
  });

  const found = sorted.find((item) => Boolean(item.url ?? item.link));
  return found?.url ?? found?.link ?? FALLBACK_IMAGE;
};

export const pickHighestQualityUrl = (
  links: Array<{ quality?: string; url?: string; link?: string }> | undefined | null
): string | null => {
  if (!Array.isArray(links) || links.length === 0) {
    return null;
  }

  const sorted = [...links].sort((a, b) => {
    const qa = Number.parseInt((a.quality ?? "0").replace(/[^0-9]/g, ""), 10) || 0;
    const qb = Number.parseInt((b.quality ?? "0").replace(/[^0-9]/g, ""), 10) || 0;
    return qb - qa;
  });

  const first = sorted.find((item) => Boolean(item.url ?? item.link));
  return first?.url ?? first?.link ?? null;
};

