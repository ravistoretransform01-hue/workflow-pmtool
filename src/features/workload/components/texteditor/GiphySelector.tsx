import { useState, useEffect } from "react";
import { Input } from "@/shared/ui/input";
import { Search, Loader2 } from "lucide-react";
import giphyLogo from "@/assets/giphy-powered-by.png";

interface GiphySelectorProps {
  onSelect: (url: string) => void;
  apiKey: string;
}

interface GiphyImage {
  id: string;
  images: {
    fixed_height: {
      url: string;
    };
    original: {
      url: string;
    };
  };
}

export function GiphySelector({ onSelect, apiKey }: GiphySelectorProps) {
  const [search, setSearch] = useState("");
  const [gifs, setGifs] = useState<GiphyImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGifs = async (query: string = "") => {
    setIsLoading(true);
    try {
      const endpoint = query
        ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=20`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20`;

      const response = await fetch(endpoint);
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error("Failed to fetch GIFs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGifs();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        fetchGifs(search);
      } else {
        fetchGifs();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="flex flex-col gap-3 p-3 w-[320px] h-[420px] bg-card border border-border rounded-lg shadow-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-1">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <img
            src="https://giphy.com/static/img/favicon.png"
            className="w-4 h-4 grayscale"
            alt=""
          />
          Giphy
        </span>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search GIFs..."
          className="pl-9 h-10 bg-muted/30 border-none focus-visible:ring-1 ring-primary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-1 -mr-1 custom-scrollbar min-h-0">
        {isLoading && gifs.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : gifs.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => onSelect(gif.images.original.url)}
                className="relative w-full aspect-[4/3] rounded-md overflow-hidden hover:ring-2 ring-primary transition-all group bg-muted"
              >
                <img
                  src={gif.images.fixed_height.url}
                  alt="GIF"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-sm text-muted-foreground gap-2">
            <span>No GIFs found</span>
          </div>
        )}
      </div>

      <div className="border-t border-border flex justify-end">
        <img
          src={giphyLogo}
          className="h-5 opacity-70 hover:opacity-100 transition-opacity invert dark:invert-0"
          alt="Powered by Giphy"
        />
      </div>
    </div>
  );
}
