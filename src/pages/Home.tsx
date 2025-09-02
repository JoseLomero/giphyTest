import { useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useLastSearch } from "../hooks/useLastSearch";
import { fetchTrendingGifs, searchStickers, type GiphyItem } from "../services/giphy";
import "../App.css";

const PAGE_SIZE = 24;

export default function Home() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<GiphyItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copiedTimer = useRef<number | null>(null);

  const isSearching = useMemo(() => query.trim().length > 0, [query]);
  const debouncedQuery = useDebouncedValue(query, 300);
  const { lastSearch, saveLastSearch, clearLastSearch } = useLastSearch();

  // Initial load: hydrate last search if present, otherwise trending
  useEffect(() => {
    void loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadInitial() {
    setLoading(true);
    setError(null);
    setOffset(0);
    try {
      const stored = (lastSearch || "").trim();
      if (stored) {
        // Hydrate input and let debounced effect perform the search
        setQuery(stored);
        setItems([]);
      } else {
        const data = await fetchTrendingGifs(PAGE_SIZE, 0);
        setItems(data);
      }
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  // Debounced search effect
  useEffect(() => {
    const q = debouncedQuery.trim();
    // Avoid triggering on initial mount when trending already loaded
    if (q.length === 0) {
      // Load trending when cleared
      (async () => {
        setLoading(true);
        setError(null);
        setOffset(0);
        try {
          clearLastSearch();
          const data = await fetchTrendingGifs(PAGE_SIZE, 0);
          setItems(data);
        } catch (e: any) {
          setError(e?.message ?? "Unexpected error");
        } finally {
          setLoading(false);
        }
      })();
      return;
    }
    // Non-empty: search stickers
    (async () => {
      setLoading(true);
      setError(null);
      setOffset(0);
      try {
        saveLastSearch(q);
        const data = await searchStickers(q, PAGE_SIZE, 0);
        setItems(data);
      } catch (e: any) {
        setError(e?.message ?? "Unexpected error");
      } finally {
        setLoading(false);
      }
    })();
  }, [debouncedQuery, saveLastSearch, clearLastSearch]);

  // Note: Search runs via debounced effect; form submit not needed

  async function loadMore() {
    if (loading) return;
    const nextOffset = offset + PAGE_SIZE;
    setLoading(true);
    setError(null);
    try {
      const more = isSearching
        ? await searchStickers(query.trim(), PAGE_SIZE, nextOffset)
        : await fetchTrendingGifs(PAGE_SIZE, nextOffset);
      setItems((prev) => [...prev, ...more]);
      setOffset(nextOffset);
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function copyUrl(id: string, url: string) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedId(id);
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopiedId(null), 1200);
    } catch (err) {
      console.error('Failed to copy', err);
      setError('Failed to copy link');
      setTimeout(() => setError(null), 1500);
    }
  }

  const showNoResults = !loading && items.length === 0;

  return (
    <div className="home-container">
      <h1 className="title">Giphy Browser</h1>

      <div className="searchbar" role="search">
        <input
          type="text"
          placeholder="Search stickers..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search stickers"
        />
      </div>

      {error && <p className="error">{error}</p>}

      {showNoResults ? (
        <p className="no-results">No results</p>
      ) : (
        <div className="grid">
          {items.map((it) => (
            <a
              className={`cell ${copiedId === it.id ? 'copied' : ''}`}
              key={it.id}
              href={it.originalUrl}
              title={`Click to copy URL: ${it.title}`}
              onClick={(e) => {
                e.preventDefault();
                void copyUrl(it.id, it.originalUrl);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  void copyUrl(it.id, it.originalUrl);
                }
              }}
              role="button"
              tabIndex={0}
            >
              {/* Using loading=lazy to improve performance */}
              <img src={it.previewUrl} alt={it.title || "gif"} loading="lazy" />
              {copiedId === it.id && <span className="copy-badge">Copied!</span>}
            </a>
          ))}
        </div>
      )}

      <div className="load-more-wrap">
        <span
          className={`load-more ${loading ? "disabled" : ""}`}
          role="button"
          tabIndex={0}
          onClick={loadMore}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && loadMore()}
          aria-busy={loading}
        >
          {loading ? "Loading..." : "Load more"}
        </span>
      </div>
    </div>
  );
}
