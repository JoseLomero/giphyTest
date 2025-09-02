export type GiphyItem = {
  id: string;
  title: string;
  previewUrl: string;
  originalUrl: string;
};

const API_KEY = "ViRYcASLihgxKweAT6lD6AvhO3s0PfpZ";
const BASE_URL = "https://api.giphy.com/v1";

function mapToItems(data: any[]): GiphyItem[] {
  return (data || []).map((item: any) => {
    const images = item.images || {};
    const fixedWidth = images.fixed_width || images.fixed_width_downsampled || images.preview_gif || images.original || {};
    const original = images.original || fixedWidth || {};
    return {
      id: item.id,
      title: item.title || item.slug || "",
      previewUrl: fixedWidth.url,
      originalUrl: original.url,
    } as GiphyItem;
  });
}

export async function fetchTrendingGifs(limit = 24, offset = 0): Promise<GiphyItem[]> {
  const params = new URLSearchParams({ api_key: API_KEY, limit: String(limit), offset: String(offset) });
  const url = `${BASE_URL}/gifs/trending?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch trending: ${res.status}`);
  const json = await res.json();
  return mapToItems(json.data);
}

export async function searchStickers(query: string, limit = 24, offset = 0): Promise<GiphyItem[]> {
  const params = new URLSearchParams({ api_key: API_KEY, q: query, limit: String(limit), offset: String(offset) });
  const url = `${BASE_URL}/stickers/search?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to search stickers: ${res.status}`);
  const json = await res.json();
  return mapToItems(json.data);
}
