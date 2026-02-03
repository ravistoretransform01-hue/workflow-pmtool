import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import Mention from "@tiptap/extension-mention";
import UnderlineExtension from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import { Extension } from "@tiptap/core";
import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Type,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Minus,
  Check,
  AtSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";

interface TiptapEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  boardId?: number;
}

const colors = [
  // Row 1
  "#000000", "#ffffff", "#66d9a8", "#52c880", "#41b86a", "#2d8d52", "#ff7044", "#ff8a6d", "#ff5c8d", "#ff69b4",
  // Row 2
  "#ff4757", "#ff6b81", "#fc5c9c", "#ff6bcb", "#ffa0d2", "#e64dff", "#b84dff", "#9945ff", "#7d3cff", "#5865f2",
  // Row 3
  "#4a90e2", "#5da9e9", "#74c0fc", "#3bc9db", "#38bdf8", "#0ea5e9", "#0284c7", "#5c7cfa", "#7c3aed", "#9ca3af",
  // Row 4
  "#6b7280", "#71717a", "#d4d4d8", "#fbbf24", "#fb923c", "#f59e0b", "#f97316", "#fde047"
];

// MentionList Component for Tiptap
const MentionList = React.forwardRef<
  HTMLDivElement,
  { items: Array<{ id: string; name: string }>; command: (item: any) => void }
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) {
      command({ id: item.id, label: item.name });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowDown") {
        setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        selectItem(selectedIndex);
        e.preventDefault();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, items, command]);

  return (
    <div
      ref={ref}
      className="bg-card border border-border rounded-lg shadow-2xl w-56 overflow-hidden z-[9999]"
    >
      <div className="text-[11px] px-3 py-2 text-muted-foreground uppercase tracking-wider border-b border-border bg-card">
        Mention
      </div>
      <div className="flex flex-col max-h-64 overflow-y-auto bg-card">
        {items.length > 0 ? (
          items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => selectItem(index)}
              className={cn(
                "flex items-center gap-2 w-full text-left px-3 py-2 transition-colors text-sm text-foreground",
                index === selectedIndex ? "bg-accent" : "hover:bg-accent"
              )}
            >
              <span className="w-6 h-6 rounded bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                {item.name
                  .split(" ")
                  .map((n) => n.charAt(0).toUpperCase())
                  .slice(0, 2)
                  .join("")}
              </span>
              <span className="truncate">{item.name}</span>
            </button>
          ))
        ) : (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground bg-card">
            No users found
          </div>
        )}
      </div>
    </div>
  );
});

MentionList.displayName = "MentionList";

function getStorageKey(boardId: number): string {
  return `cms_data_board_${boardId}`;
}

function getMembersFromLocalStorage(boardId?: number): Array<{ id: string; name: string, email: string }> {
  if (!boardId) return [];
  
  try {
    const storageKey = getStorageKey(boardId);
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const cmsData = JSON.parse(stored);
      if (cmsData.members && Array.isArray(cmsData.members)) {
        // console.log("cmsData.members", cmsData.members)
        return cmsData.members.map((member: any) => ({
          id: member.user_id || member.id,
          name: member.name || member.user_name || "Unknown",
          email: member.email || "Unknown",
        }));
      }
    }
  } catch (error) {
    console.error("Error reading members from localStorage:", error);
  }
  
  return [];
}

export function TiptapEditor({
  value,
  onChange,
  placeholder,
  boardId,
}: TiptapEditorProps) {
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionItems, setMentionItems] = useState<Array<{ id: string; name: string }>>([]);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const isUpdatingRef = useRef(false);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const mentionRef = useRef<HTMLDivElement | null>(null);
  const membersRef = useRef<Array<{ id: string; name: string }>>([]);

  // Load members from localStorage
  useEffect(() => {
    if (boardId) {
      const loadedMembers = getMembersFromLocalStorage(boardId);
      membersRef.current = loadedMembers;
    }
  }, [boardId]);

  // Custom extension for font size
  const FontSize = Extension.create({
    name: 'fontSize',
    addGlobalAttributes() {
      return [
        {
          types: ['textStyle'],
          attributes: {
            fontSize: {
              default: null,
              parseHTML: element => element.style.fontSize || null,
              renderHTML: attributes => {
                if (!attributes.fontSize) {
                  return {};
                }
                return {
                  style: `font-size: ${attributes.fontSize}`,
                };
              },
            },
          },
        },
      ];
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        hardBreak: {
          keepMarks: true,
        },
      }),
      TextStyle,
      FontSize,
      Color,
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary hover:underline cursor-pointer',
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "bg-blue-100 text-blue-600 px-1 rounded hover:bg-blue-200 cursor-pointer",
        },
        suggestion: {
          items: ({ query }) => {
            const filtered = membersRef.current
              .filter((user) =>
                user.name.toLowerCase().startsWith(query.toLowerCase())
              )
              .slice(0, 5);
            setMentionItems(filtered);
            return filtered;
          },
          render: () => {
            return {
              onStart: (props: any) => {
                setMentionOpen(true);
                if (editorContainerRef.current) {
                  const editorRect = editorContainerRef.current.getBoundingClientRect();
                  const coords = props.clientRect();
                  setMentionPosition({
                    top: coords.bottom - editorRect.top,
                    left: coords.left - editorRect.left,
                  });
                }
              },

              onUpdate: (props: any) => {
                const filtered = membersRef.current
                  .filter((user) =>
                    user.name.toLowerCase().startsWith(props.query.toLowerCase())
                  )
                  .slice(0, 5);
                setMentionItems(filtered);
                
                if (editorContainerRef.current) {
                  const editorRect = editorContainerRef.current.getBoundingClientRect();
                  const coords = props.clientRect();
                  setMentionPosition({
                    top: coords.bottom - editorRect.top,
                    left: coords.left - editorRect.left,
                  });
                }
              },

              onKeyDown: (props: any) => {
                if (props.event.key === "Escape") {
                  setMentionOpen(false);
                  return true;
                }
                return false;
              },

              onExit: () => {
                setMentionOpen(false);
              },
            };
          },
        },
      }),
    ],
    content: value,
    editorProps: {
      handleKeyDown: (_, event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
          return false;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (!isUpdatingRef.current) {
        onChange(editor.getHTML());
      }
    },
  });

  // Update editor content when value prop changes (external updates)
  useEffect(() => {
    if (editor && !isUpdatingRef.current) {
      const currentContent = editor.getHTML();
      if (value !== currentContent) {
        isUpdatingRef.current = true;
        if (value === "") {
          editor.commands.clearContent();
        } else {
          editor.commands.setContent(value);
        }
        isUpdatingRef.current = false;
      }
    }
  }, [value, editor]);

  // Clear editor on mount if value is empty
  useEffect(() => {
    if (editor && value === "") {
      editor.commands.clearContent();
    }
  }, [editor]);

  // Handle mention dropdown close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mentionRef.current && !mentionRef.current.contains(e.target as Node)) {
        if (editorContainerRef.current && !editorContainerRef.current.contains(e.target as Node)) {
          setMentionOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!editor) {
    return null;
  }

  const handleLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handleMentionSelect = (user: { id: string; name: string }) => {
    editor
      .chain()
      .focus()
      .command(({ commands }) => {
        return commands.deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from });
      })
      .insertContent(`<a href="/profile/${user.id}" class="bg-blue-100 text-blue-600 px-1 rounded hover:bg-blue-200 cursor-pointer">@${user.name}</a> `)
      .run();
    setMentionOpen(false);
  };

  return (
    <div className="relative z-10 h-full flex flex-col" ref={editorContainerRef}>
      <div className="border border-input rounded-lg overflow-hidden bg-card flex flex-col flex-1">
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1 p-2 border-b border-border flex-wrap bg-muted/50">
          {/* Format Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn("h-8 px-2", (editor.isActive("heading", { level: 1 }) || editor.isActive("blockquote") || editor.isActive("codeBlock")) && "bg-blue-500 text-white hover:bg-blue-600")}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" align="start">
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm"
                onClick={() => editor.chain().focus().setParagraph().run()}
              >
                Normal text
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm italic"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
              >
                Quote
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm font-mono"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              >
                Code
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted rounded text-lg font-bold"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              >
                Header
              </button>
            </PopoverContent>
          </Popover>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Font Size Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <text x="4" y="18" fontSize="16" fontWeight="bold" fill="currentColor">A</text>
                </svg>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              {["16px", "18px", "24px", "32px", "36px", "48px"].map((size) => (
                <button
                  key={size}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm"
                  onClick={() => {
                    editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
                  }}
                >
                  {size}
                </button>
              ))}
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm"
                onClick={() => editor.chain().focus().unsetMark('textStyle').run()}
              >
                Reset font size
              </button>
            </PopoverContent>
          </Popover>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", editor.isActive("bold") && "bg-blue-500 text-white hover:bg-blue-600")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", editor.isActive("italic") && "bg-blue-500 text-white hover:bg-blue-600")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", editor.isActive("underline") && "bg-blue-500 text-white hover:bg-blue-600")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", editor.isActive("strike") && "bg-blue-500 text-white hover:bg-blue-600")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Text Color Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Type className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-3" align="start">
              <div className="grid grid-cols-10 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform cursor-pointer"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                    }}
                    title={color}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", editor.isActive("bulletList") && "bg-blue-500 text-white hover:bg-blue-600")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", editor.isActive("orderedList") && "bg-blue-500 text-white hover:bg-blue-600")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", editor.isActive("textAlign", { align: "left" }) && "bg-blue-500 text-white hover:bg-blue-600")}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", editor.isActive("textAlign", { align: "center" }) && "bg-blue-500 text-white hover:bg-blue-600")}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", editor.isActive("textAlign", { align: "right" }) && "bg-blue-500 text-white hover:bg-blue-600")}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", editor.isActive("link") && "bg-blue-500 text-white hover:bg-blue-600")}
            onClick={handleLink}
          >
            <Link2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().insertContent("@").run()}
            title="Mention someone"
          >
            <AtSign className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", editor.isActive("taskList") && "bg-blue-500 text-white hover:bg-blue-600")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Add checklist"
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>

        {/* Mention Dropdown */}
        {mentionOpen && mentionItems.length > 0 && (
          <div
            ref={mentionRef}
            className="absolute z-[9999] bg-card border border-border rounded-lg shadow-2xl w-56"
            style={{ top: `${mentionPosition.top}px`, left: `${mentionPosition.left}px` }}
          >
            <div className="text-[11px] px-3 py-2 text-muted-foreground uppercase tracking-wider border-b border-border bg-card">
              Mention
            </div>
            <div className="flex flex-col max-h-64 overflow-y-auto bg-card">
              {mentionItems.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleMentionSelect(user)}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-accent transition-colors text-sm text-foreground"
                >
                  <span className="w-6 h-6 rounded bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                    {user.name
                      .split(" ")
                      .map((n) => n.charAt(0).toUpperCase())
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <span className="truncate">{user.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Editor Area */}
        <EditorContent
          editor={editor}
          className={cn(
            "flex-1 min-h-[100px] p-3 focus:outline-none text-sm text-foreground bg-card relative z-20 overflow-auto",
            "[&_.ProseMirror]:outline-none [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:min-h-[100px]",
            "[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2",
            "[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2",
            "[&_li]:my-1",
            "[&_ul_ul]:list-circle [&_ul_ul]:ml-6",
            "[&_ol_ol]:ml-6",
            "[&_blockquote]:border-l-4 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-2 [&_blockquote]:text-muted-foreground",
            "[&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded [&_pre]:font-mono [&_pre]:text-sm [&_pre]:my-2 [&_pre]:overflow-x-auto",
            "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-2",
            "[&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-sm",
            "[&_a]:text-primary [&_a]:hover:underline [&_a]:cursor-pointer",
            "[&_.ProseMirror.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror.is-editor-empty:first-child::before]:pointer-events-none",
            "[&_input[type='checkbox']]:cursor-pointer [&_input[type='checkbox']]:accent-primary"
          )}
          data-placeholder={placeholder}
        />
      </div>
    </div>
  );
}
