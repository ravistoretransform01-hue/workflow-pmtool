import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Bold, Italic, Underline, Strikethrough, Type, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Link2, Minus, Check, AtSign, FileText, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { cn } from "@/utils/utils";

interface MentionRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onMention?: (person: string) => void;
  availablePeople?: Person[];
  files?: Array<{ name: string; size: number; type: string; url: string }>;
  onFilesChange?: (files: Array<{ name: string; size: number; type: string; url: string }>) => void;
}

export interface MentionRichTextEditorRef {
  showMentionDropdown: () => void;
}

interface Person {
  id: string;
  name: string;
  initials: string;
  avatarColor?: string;
}

interface Team {
  id: string;
  name: string;
  icon: string;
}

// const mockPeople: Person[] = [
//   { id: "1", name: "Kyle Newton", initials: "KN" },
//   { id: "2", name: "Tari Newton", initials: "TN" },
//   { id: "3", name: "Blake Newton", initials: "BN" },
//   { id: "4", name: "Brooklyn Newton", initials: "BN" },
//   { id: "5", name: "Lea Serfaty", initials: "LS" },
// ];

const mockTeams: Team[] = [
  { id: "board", name: "Everyone on this board", icon: "👥" },
  { id: "item", name: "Everyone on this Item", icon: "👥" },
];

export const MentionRichTextEditor = forwardRef<MentionRichTextEditorRef, MentionRichTextEditorProps>(
  ({ value, onChange, placeholder, onMention, availablePeople, files = [], onFilesChange }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showFormatDropdown, setShowFormatDropdown] = useState(false);
    const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
    const [colorPickerTab, setColorPickerTab] = useState<'text' | 'highlight'>('text');
    const [colorPickerPosition, setColorPickerPosition] = useState({ top: 0, left: 0 });
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionSearchQuery, setMentionSearchQuery] = useState("");
    const isUpdatingRef = useRef(false);
    const colorButtonRef = useRef<HTMLButtonElement>(null);

    // Use provided people or fall back to empty array
    const people = availablePeople || [];

    // Expose method to parent to show mention dropdown
    useImperativeHandle(ref, () => ({
      showMentionDropdown: () => {
        if (editorRef.current) {
          editorRef.current.focus();
          // Insert @ at cursor position
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const atNode = document.createTextNode("@");
            range.insertNode(atNode);
            range.setStartAfter(atNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);

            // Trigger input event to show dropdown
            const event = new Event('input', { bubbles: true });
            editorRef.current.dispatchEvent(event);
          }

          setMentionSearchQuery("");
          setShowMentionDropdown(true);
        }
      }
    }));

    useEffect(() => {
      if (editorRef.current && !isUpdatingRef.current) {
        if (value !== editorRef.current.innerHTML) {
          editorRef.current.innerHTML = value || '';
        }
      }
      isUpdatingRef.current = false;
    }, [value]);

    const execCommand = (command: string, value?: string) => {
      document.execCommand(command, false, value);
      editorRef.current?.focus();
    };

    const handleInput = () => {
      if (editorRef.current) {
        isUpdatingRef.current = true;
        const content = editorRef.current.innerHTML;
        onChange(content);

        // Check for @ mention trigger
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const textBeforeCursor = range.startContainer.textContent?.slice(0, range.startOffset) || "";
          const lastAtIndex = textBeforeCursor.lastIndexOf("@");

          if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
            // Show dropdown if @ was just typed or if typing after @
            if (textAfterAt.length === 0 || /^[a-zA-Z\s]*$/.test(textAfterAt)) {
              setMentionSearchQuery(textAfterAt);
              setShowMentionDropdown(true);
            } else {
              setShowMentionDropdown(false);
            }
          } else {
            setShowMentionDropdown(false);
          }
        }
      }
    };

    const insertMention = (name: string, personId?: string) => {
      if (editorRef.current) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);

          // Get the text node and position
          let textNode = range.startContainer;
          let cursorPosition = range.startOffset;

          // If we're not in a text node, get the text node
          if (textNode.nodeType !== Node.TEXT_NODE) {
            textNode = textNode.childNodes[cursorPosition] || textNode;
            cursorPosition = 0;
          }

          const textContent = textNode.textContent || "";
          const lastAtIndex = textContent.lastIndexOf("@", cursorPosition);

          if (lastAtIndex !== -1) {
            // Split the text node at the @ symbol
            const textBefore = textContent.slice(0, lastAtIndex);
            const textAfter = textContent.slice(cursorPosition);

            // Create mention link
            const mentionLink = document.createElement("a");
            mentionLink.className = "bg-primary/10 text-primary px-1 rounded hover:underline cursor-pointer";
            mentionLink.contentEditable = "false";
            mentionLink.textContent = `@${name}`;
            mentionLink.setAttribute("data-user-id", personId || "");
            mentionLink.href = "#";
            mentionLink.onclick = (e) => {
              e.preventDefault();
            };

            // Create a document fragment to replace the content
            const fragment = document.createDocumentFragment();
            if (textBefore) {
              fragment.appendChild(document.createTextNode(textBefore));
            }
            fragment.appendChild(mentionLink);
            fragment.appendChild(document.createTextNode(" " + textAfter));

            // Replace the text node with our fragment
            const parent = textNode.parentNode;
            if (parent) {
              parent.replaceChild(fragment, textNode);

              // Set cursor after the mention link and space
              const newRange = document.createRange();
              const spaceNode = mentionLink.nextSibling;
              if (spaceNode) {
                newRange.setStart(spaceNode, 1); // After the space
                newRange.collapse(true);
              }
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          }
        }

        // Update the content
        isUpdatingRef.current = true;
        onChange(editorRef.current.innerHTML);
        setShowMentionDropdown(false);
        onMention?.(name);
        editorRef.current.focus();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          execCommand('bold');
          return;
        }
        if (e.key.toLowerCase() === 'i') {
          e.preventDefault();
          execCommand('italic');
          return;
        }
        if (e.key.toLowerCase() === 'u') {
          e.preventDefault();
          execCommand('underline');
          return;
        }
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          execCommand('outdent');
        } else {
          execCommand('indent');
        }
      }

      // Handle deletion of selected content including checklist items
      if ((e.key === 'Backspace' || e.key === 'Delete') && window.getSelection()) {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
          const range = selection.getRangeAt(0);
          const fragment = range.cloneContents();

          // Check if any checklist items are in the selection
          const checklistItems = fragment.querySelectorAll('div.flex.items-center.gap-2');

          if (checklistItems.length > 0) {
            e.preventDefault();

            // Get all checklist items within the selection range in the actual DOM
            const container = range.commonAncestorContainer;
            const parent = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as Element;

            if (parent) {
              const allChecklistItems = editorRef.current?.querySelectorAll('div.flex.items-center.gap-2') || [];

              allChecklistItems.forEach((item) => {
                if (selection.containsNode(item, true)) {
                  item.remove();
                }
              });
            }

            // Delete the range content
            range.deleteContents();

            if (editorRef.current) {
              isUpdatingRef.current = true;
              onChange(editorRef.current.innerHTML);
            }

            return;
          }
        }
      }

      if (showMentionDropdown && (e.key === 'Escape' || e.key === 'Backspace')) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const textBeforeCursor = range.startContainer.textContent?.slice(0, range.startOffset) || "";
          const lastAtIndex = textBeforeCursor.lastIndexOf("@");

          if (lastAtIndex !== -1 && textBeforeCursor.slice(lastAtIndex + 1).length === 0 && e.key === 'Backspace') {
            setShowMentionDropdown(false);
          }
          if (e.key === 'Escape') {
            setShowMentionDropdown(false);
          }
        }
      }
    };

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

    const applyFormat = (format: string) => {
      if (format === "p") {
        execCommand("formatBlock", "<p>");
      } else if (format === "blockquote") {
        execCommand("formatBlock", "<blockquote>");
      } else if (format === "pre") {
        execCommand("formatBlock", "<pre>");
      } else if (format === "h1") {
        execCommand("formatBlock", "<h1>");
      }
      setShowFormatDropdown(false);
    };

    const applyFontSize = (size: string) => {
      if (size === "remove") {
        execCommand("removeFormat");
      } else {
        execCommand("fontSize", "7");
        const fontElements = editorRef.current?.querySelectorAll('font[size="7"]');
        fontElements?.forEach((element) => {
          const span = document.createElement('span');
          span.style.fontSize = size;
          span.innerHTML = element.innerHTML;
          element.parentNode?.replaceChild(span, element);
        });
      }
      setShowFontSizeDropdown(false);
      editorRef.current?.focus();
    };

    const createChecklistItem = () => {
      const checklistItem = document.createElement("div");
      checklistItem.className = "flex items-center gap-2 my-1 group";
      checklistItem.contentEditable = "false";
      checklistItem.setAttribute("data-checklist-item", "true");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "h-4 w-4 rounded border-border cursor-pointer";
      checkbox.onclick = (e) => {
        const target = e.target as HTMLInputElement;
        const textSpan = target.nextElementSibling as HTMLSpanElement;
        if (textSpan) {
          if (target.checked) {
            textSpan.style.textDecoration = "line-through";
            textSpan.style.opacity = "0.6";
          } else {
            textSpan.style.textDecoration = "none";
            textSpan.style.opacity = "1";
          }
        }
        if (editorRef.current) {
          isUpdatingRef.current = true;
          onChange(editorRef.current.innerHTML);
        }
      };

      const textSpan = document.createElement("span");
      textSpan.contentEditable = "true";
      textSpan.className = "flex-1 outline-none";
      textSpan.textContent = "";

      // Handle Enter key to create new checklist item
      textSpan.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const newItem = createChecklistItem();
          checklistItem.parentNode?.insertBefore(newItem, checklistItem.nextSibling);
          const newTextSpan = newItem.querySelector('span[contenteditable="true"]');
          if (newTextSpan) {
            (newTextSpan as HTMLElement).focus();
          }
          if (editorRef.current) {
            isUpdatingRef.current = true;
            onChange(editorRef.current.innerHTML);
          }
        } else if (e.key === 'Backspace') {
          const selection = window.getSelection();
          const cursorAtStart = selection && selection.rangeCount > 0 &&
            selection.getRangeAt(0).startOffset === 0 &&
            selection.isCollapsed;

          if (textSpan.textContent === '' || cursorAtStart) {
            e.preventDefault();

            // Find the previous focusable element
            let prevElement: HTMLElement | null = null;
            const prevSibling = checklistItem.previousElementSibling;

            if (prevSibling && prevSibling.querySelector('span[contenteditable="true"]')) {
              // Previous checklist item
              prevElement = prevSibling.querySelector('span[contenteditable="true"]') as HTMLElement;
            } else if (prevSibling) {
              // Previous regular content
              prevElement = prevSibling as HTMLElement;
            }

            // Save the text content if cursor is at start (merge with previous)
            const textToMerge = cursorAtStart ? textSpan.textContent : '';

            // Remove the checklist item
            checklistItem.remove();

            // Set focus and merge text if needed
            if (prevElement) {
              prevElement.focus();

              if (textToMerge && cursorAtStart) {
                // Append text to previous element
                prevElement.textContent = (prevElement.textContent || '') + textToMerge;
              }

              // Move cursor to end of previous element
              const range = document.createRange();
              const sel = window.getSelection();
              if (prevElement.childNodes.length > 0) {
                const lastNode = prevElement.childNodes[prevElement.childNodes.length - 1];
                const offset = textToMerge ? lastNode.textContent!.length - textToMerge.length : lastNode.textContent!.length;
                range.setStart(lastNode, offset);
                range.collapse(true);
              } else {
                range.selectNodeContents(prevElement);
                range.collapse(false);
              }
              sel?.removeAllRanges();
              sel?.addRange(range);
            } else if (editorRef.current) {
              // If no previous element, focus the editor
              editorRef.current.focus();
            }

            if (editorRef.current) {
              isUpdatingRef.current = true;
              onChange(editorRef.current.innerHTML);
            }
          }
        }
      };

      textSpan.oninput = () => {
        if (editorRef.current) {
          isUpdatingRef.current = true;
          onChange(editorRef.current.innerHTML);
        }
      };

      checklistItem.appendChild(checkbox);
      checklistItem.appendChild(textSpan);

      return checklistItem;
    };

    const insertChecklist = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        const checklistItem = createChecklistItem();

        range.deleteContents();
        range.insertNode(checklistItem);

        const lineBreak = document.createElement("br");
        range.setStartAfter(checklistItem);
        range.insertNode(lineBreak);
        range.setStartAfter(lineBreak);
        range.collapse(true);

        selection.removeAllRanges();
        selection.addRange(range);

        // Focus the text span
        const textSpan = checklistItem.querySelector('span[contenteditable="true"]');
        if (textSpan) {
          setTimeout(() => {
            (textSpan as HTMLElement).focus();
          }, 0);
        }
      }

      if (editorRef.current) {
        isUpdatingRef.current = true;
        onChange(editorRef.current.innerHTML);
      }
    };

    const filteredPeople = people.filter(person =>
      person.name.toLowerCase().includes(mentionSearchQuery.toLowerCase())
    );

    const filteredTeams = mockTeams.filter(team =>
      team.name.toLowerCase().includes(mentionSearchQuery.toLowerCase())
    );

    return (
      <div className="relative z-10 h-full flex flex-col">
        <div className="border border-input rounded-lg overflow-hidden bg-card flex flex-col flex-1">
          {/* Formatting Toolbar */}
          <div className="flex items-center gap-1 p-2 border-b border-border flex-wrap bg-muted/50">
            {/* Format Dropdown */}
            <Popover open={showFormatDropdown} onOpenChange={setShowFormatDropdown}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
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
                  onClick={() => applyFormat("p")}
                >
                  Normal text
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm italic"
                  onClick={() => applyFormat("blockquote")}
                >
                  Quote
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm font-mono"
                  onClick={() => applyFormat("pre")}
                >
                  Code
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded text-lg font-bold"
                  onClick={() => applyFormat("h1")}
                >
                  Header
                </button>
              </PopoverContent>
            </Popover>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Font Size Dropdown */}
            <Popover open={showFontSizeDropdown} onOpenChange={setShowFontSizeDropdown}>
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
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm"
                  onClick={() => applyFontSize("16px")}
                >
                  16px
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm"
                  onClick={() => applyFontSize("18px")}
                >
                  18px
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm"
                  onClick={() => applyFontSize("24px")}
                >
                  24px
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm"
                  onClick={() => applyFontSize("32px")}
                >
                  32px
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm"
                  onClick={() => applyFontSize("36px")}
                >
                  36px
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm"
                  onClick={() => applyFontSize("48px")}
                >
                  48px
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm"
                  onClick={() => applyFontSize("remove")}
                >
                  Remove font size
                </button>
              </PopoverContent>
            </Popover>

            <div className="w-px h-6 bg-border mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => execCommand("bold")}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => execCommand("italic")}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => execCommand("underline")}
            >
              <Underline className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => execCommand("strikeThrough")}
            >
              <Strikethrough className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            <div className="relative">
              <Button
                ref={colorButtonRef}
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setColorPickerPosition({
                    top: rect.bottom + window.scrollY + 8,
                    left: rect.left + window.scrollX
                  });
                  setShowColorPicker(!showColorPicker);
                  setColorPickerTab('text');
                }}
              >
                <Type className="h-4 w-4" />
              </Button>
            </div>

            <div className="w-px h-6 bg-border mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => execCommand("insertUnorderedList")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => execCommand("insertOrderedList")}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => execCommand("justifyLeft")}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => execCommand("justifyCenter")}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => execCommand("justifyRight")}
            >
              <AlignRight className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                const url = prompt("Enter URL:");
                if (url) execCommand("createLink", url);
              }}
            >
              <Link2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => execCommand("insertHorizontalRule")}
            >
              <Minus className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={insertChecklist}
              title="Add checklist"
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>

          {/* Editor Area */}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex-1 min-h-[100px] p-3 focus:outline-none text-sm text-foreground bg-card relative z-20",
              "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none",
              "[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2",
              "[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2",
              "[&_li]:my-1",
              "[&_ul_ul]:list-circle [&_ul_ul]:ml-6",
              "[&_ol_ol]:ml-6",
              "[&_blockquote]:border-l-4 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-2 [&_blockquote]:text-muted-foreground",
              "[&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded [&_pre]:font-mono [&_pre]:text-sm [&_pre]:my-2 [&_pre]:overflow-x-auto",
              "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-2",
              "[&_input[type='checkbox']]:cursor-pointer"
            )}
            data-placeholder={placeholder}
            suppressContentEditableWarning
          />
        </div>

        {/* Attached Files Display */}
        {files.length > 0 && (
          <div className="px-3 pb-3 space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-muted/50 rounded border border-border"
              >
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm text-primary hover:underline truncate"
                >
                  {file.name}
                </a>
                <span className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
                {onFilesChange && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      const newFiles = files.filter((_, i) => i !== index);
                      onFilesChange(newFiles);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Color Picker Popup - Outside the editor container */}
        {showColorPicker && (
          <div
            className="fixed z-[200] bg-popover border border-border rounded-lg shadow-lg w-[280px]"
            style={{
              top: `${colorPickerPosition.top}px`,
              left: `${colorPickerPosition.left}px`
            }}
          >
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                type="button"
                className={cn(
                  "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                  colorPickerTab === 'text'
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => setColorPickerTab('text')}
              >
                Text
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                  colorPickerTab === 'highlight'
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => setColorPickerTab('highlight')}
              >
                Highlight
              </button>
            </div>

            {/* Color Grid */}
            <div className="p-3">
              <div className="grid grid-cols-10 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      if (colorPickerTab === 'text') {
                        execCommand("foreColor", color);
                      } else {
                        execCommand("backColor", color);
                      }
                      setShowColorPicker(false);
                    }}
                  />
                ))}
              </div>

              {/* None option for highlight */}
              {colorPickerTab === 'highlight' && (
                <button
                  type="button"
                  className="w-full mt-2 px-3 py-2 text-sm hover:bg-muted rounded transition-colors text-left"
                  onClick={() => {
                    execCommand("removeFormat");
                    setShowColorPicker(false);
                  }}
                >
                  None
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mention Dropdown */}
        {showMentionDropdown && (
          <div className="absolute z-[100] mt-1 w-80 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            <div className="p-2 border-b border-border bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AtSign className="h-4 w-4" />
                <span>Mention someone</span>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredPeople.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30">
                    People
                  </div>
                  {filteredPeople.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors"
                      onClick={() => insertMention(person.name, person.id)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className="text-white text-xs font-semibold"
                          style={{ backgroundColor: person.avatarColor }}
                        >
                          {person.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{person.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {filteredTeams.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30">
                    Teams
                  </div>
                  {filteredTeams.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors"
                      onClick={() => insertMention(team.name)}
                    >
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-lg">
                        {team.icon}
                      </div>
                      <span className="text-sm">{team.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {filteredPeople.length === 0 && filteredTeams.length === 0 && (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No matches found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  });

MentionRichTextEditor.displayName = "MentionRichTextEditor";
