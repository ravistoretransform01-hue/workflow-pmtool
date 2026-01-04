import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Search } from "lucide-react";

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void;
}

// Mock GIF data with search terms - in a real app, this would come from an API like Giphy or Tenor
const mockGifs = [
  // Animals
  { url: "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif", tags: ["cat", "cute", "kitten", "animal"] },
  { url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif", tags: ["dog", "puppy", "happy", "animal"] },
  { url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif", tags: ["cat", "typing", "working", "computer"] },
  { url: "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif", tags: ["dog", "love", "heart", "cute"] },
  { url: "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif", tags: ["cat", "annoyed", "no", "funny"] },
  
  // Reactions - Happy/Excited
  { url: "https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif", tags: ["excited", "yes", "celebration", "happy"] },
  { url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif", tags: ["dance", "party", "celebrate", "happy"] },
  { url: "https://media.giphy.com/media/kyLYXonQYYfwYDIeZl/giphy.gif", tags: ["success", "celebrate", "win", "happy"] },
  { url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif", tags: ["clap", "applause", "good job", "happy"] },
  { url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif", tags: ["thumbs up", "approve", "good", "yes"] },
  
  // Reactions - Funny/Silly
  { url: "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyE/giphy.gif", tags: ["fight", "office", "angry", "funny"] },
  { url: "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif", tags: ["laugh", "laughing", "funny", "hilarious"] },
  { url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif", tags: ["shocked", "surprised", "omg", "funny"] },
  { url: "https://media.giphy.com/media/l3vR85PnGsBwu1PFK/giphy.gif", tags: ["awkward", "nervous", "funny", "oops"] },
  
  // Reactions - Confused/Thinking
  { url: "https://media.giphy.com/media/3oEjHWXddcCOGZNmFO/giphy.gif", tags: ["confused", "thinking", "hmm", "question"] },
  { url: "https://media.giphy.com/media/a5viI92PAF89q/giphy.gif", tags: ["thinking", "confused", "wondering", "question"] },
  { url: "https://media.giphy.com/media/3oz8xLd9DJq2l2VFtu/giphy.gif", tags: ["confused", "what", "huh", "question"] },
  
  // Reactions - No/Negative
  { url: "https://media.giphy.com/media/STfLOU6iRBRunMciZv/giphy.gif", tags: ["no", "nope", "deny", "negative"] },
  { url: "https://media.giphy.com/media/6h4z4b3v6XWxO/giphy.gif", tags: ["no", "shake head", "negative", "nope"] },
  { url: "https://media.giphy.com/media/vyTnNTrs3wqQ0UIvwE/giphy.gif", tags: ["facepalm", "disappointed", "no", "fail"] },
  
  // Reactions - Love/Heart
  { url: "https://media.giphy.com/media/R6gvnAxj2ISzJdbA63/giphy.gif", tags: ["love", "heart", "hearts", "like"] },
  { url: "https://media.giphy.com/media/ZBQhoZC0nqknSviPqT/giphy.gif", tags: ["love", "heart", "kiss", "romance"] },
  { url: "https://media.giphy.com/media/l1KVaj5UcbHwrBMqI/giphy.gif", tags: ["heart", "love", "cute", "aww"] },
  
  // Working/Busy
  { url: "https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif", tags: ["working", "typing", "busy", "computer"] },
  { url: "https://media.giphy.com/media/XIqCQx02E1U9W/giphy.gif", tags: ["loading", "waiting", "busy", "work"] },
  { url: "https://media.giphy.com/media/unFLKoAV3TkXe/giphy.gif", tags: ["done", "finished", "work", "complete"] },
  
  // Celebration
  { url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif", tags: ["party", "celebrate", "celebration", "confetti"] },
  { url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif", tags: ["celebrate", "party", "happy", "win"] },
  { url: "https://media.giphy.com/media/3oz8xIsloV7zOmt81G/giphy.gif", tags: ["celebrate", "dance", "party", "happy"] },
  
  // Funny/Meme
  { url: "https://media.giphy.com/media/Lopx9eUi34rbq/giphy.gif", tags: ["deal with it", "cool", "sunglasses", "meme"] },
  { url: "https://media.giphy.com/media/5wWf7GR2nhgamhRnEuA/giphy.gif", tags: ["high five", "celebrate", "teamwork", "good job"] },
  { url: "https://media.giphy.com/media/BpnkuY1i2rBpm/giphy.gif", tags: ["wave", "hello", "hi", "greeting"] },
  { url: "https://media.giphy.com/media/l2YWqU7ev0l5nfYTC/giphy.gif", tags: ["popcorn", "watching", "interesting", "drama"] },
];

export function GifPicker({ onGifSelect }: GifPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGifs = useMemo(() => {
    if (!searchQuery.trim()) return mockGifs;
    const query = searchQuery.toLowerCase();
    return mockGifs.filter(gif => 
      gif.tags.some(tag => tag.includes(query))
    );
  }, [searchQuery]);

  const handleGifClick = (gifUrl: string) => {
    onGifSelect(gifUrl);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
          GIF
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-3" align="start">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
            <Input
              placeholder="Search GIFs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <ScrollArea className="h-64">
            <div className="grid grid-cols-2 gap-2 pr-4">
              {filteredGifs.length > 0 ? (
                filteredGifs.map((gif, index) => (
                  <button
                    key={index}
                    type="button"
                    className="aspect-square rounded overflow-hidden hover:opacity-80 transition-opacity"
                    onClick={() => handleGifClick(gif.url)}
                  >
                    <img
                      src={gif.url}
                      alt="GIF"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))
              ) : (
                <div className="col-span-2 text-center text-sm text-muted-foreground py-8">
                  No GIFs found
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="text-xs text-center text-muted-foreground">
            Powered by GIPHY
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
