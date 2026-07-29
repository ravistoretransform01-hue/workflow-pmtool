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
import Image from "@tiptap/extension-image";
import { Extension, Node as TiptapNode, mergeAttributes } from "@tiptap/core";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { GiphySelector } from "@/features/workload/components/texteditor/GiphySelector";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { toast } from "sonner";
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
  Image as ImageIcon,
} from "lucide-react";
import { attachmentsApi } from "@/features/tasks/api/attachmentsApi";
import { cn, isClientRole } from "@/utils/utils";
import { FilePreviewModal } from "@/features/workload/components/texteditor/FilePreviewModal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";

interface TiptapEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  boardId?: number;
  autoFocus?: boolean | "start" | "end" | "all";
  onSubmit?: () => void;
  isClient?: boolean;
  isClientUpdatesTab?: boolean;
}

const colors = [
  // Row 1
  "#000000",
  "#ffffff",
  "#66d9a8",
  "#52c880",
  "#41b86a",
  "#2d8d52",
  "#ff7044",
  "#ff8a6d",
  "#ff5c8d",
  "#ff69b4",
  // Row 2
  "#ff4757",
  "#ff6b81",
  "#fc5c9c",
  "#ff6bcb",
  "#ffa0d2",
  "#e64dff",
  "#b84dff",
  "#9945ff",
  "#7d3cff",
  "#5865f2",
  // Row 3
  "#4a90e2",
  "#5da9e9",
  "#74c0fc",
  "#3bc9db",
  "#38bdf8",
  "#0ea5e9",
  "#0284c7",
  "#5c7cfa",
  "#7c3aed",
  "#9ca3af",
  // Row 4
  "#6b7280",
  "#71717a",
  "#d4d4d8",
  "#fbbf24",
  "#fb923c",
  "#f59e0b",
  "#f97316",
  "#fde047",
];

function getStorageKey(boardId: number): string {
  return `cms_data_board_${boardId}`;
}

function getMembersFromLocalStorage(
  boardId?: number,
): Array<{ id: string; name: string; email: string; role?: string }> {
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
          role: member.board_role_label || member.role || "",
        }));
      }
    }
  } catch (error) {
    console.error("Error reading members from localStorage:", error);
  }

  return [];
}

const filterMembersByRoleRules = (
  members: Array<{ id: string; name: string; email?: string; role?: string }>,
  isCurrentUserClient: boolean,
  isClientUpdatesTabActive: boolean,
) => {
  if (isCurrentUserClient) {
    return members;
  }
  const isMemberClient = (member: { role?: string }) => {
    return !!(member.role && member.role.toLowerCase().includes("client"));
  };
  if (isClientUpdatesTabActive) {
    return members.filter((m) => isMemberClient(m));
  } else {
    return members.filter((m) => !isMemberClient(m));
  }
};

export function TiptapEditor({
  value,
  onChange,
  placeholder,
  boardId,
  autoFocus,
  onSubmit,
  isClient,
  isClientUpdatesTab,
}: TiptapEditorProps) {
  const [isClientUser, setIsClientUser] = useState(false);

  useEffect(() => {
    if (boardId) {
      const checkClient = () => {
        try {
          const userDataRaw = localStorage.getItem("user_data");
          if (!userDataRaw) return false;
          const userData = JSON.parse(userDataRaw);
          const currentUserId = userData?.user_id;
          if (!currentUserId) return false;

          const cached = localStorage.getItem(`cms_data_board_${boardId}`);
          if (!cached) return false;

          const cmsData = JSON.parse(cached);
          const members = cmsData?.members;
          if (!Array.isArray(members)) return false;

          const currentMember = members.find(
            (m: any) => String(m.user_id) === String(currentUserId)
          );
          const roleLabel = currentMember?.board_role_label;
          return !!(roleLabel && roleLabel.toLowerCase().includes("client"));
        } catch (error) {
          console.error("Error checking client role:", error);
          return false;
        }
      };
      setIsClientUser(checkClient());
    }
  }, [boardId]);

  const effectiveIsClient = isClient ?? isClientUser;
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionItems, setMentionItems] = useState<
    Array<{ id: string; name: string; email?: string; role?: string }>
  >([]);
  const [mentionPosition, setMentionPosition] = useState<{
    top: number;
    left: number;
    isAbove: boolean;
  }>({ top: 0, left: 0, isAbove: false });
  const [mentionPortalTarget, setMentionPortalTarget] =
    useState<HTMLElement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedIndexRef = useRef(0);
  const mentionItemsRef = useRef<Array<{ id: string; name: string; email?: string; role?: string }>>([]);
  const [mentionCommand, setMentionCommand] = useState<
    ((item: any) => void) | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUpdatingRef = useRef(false);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | undefined>(
    undefined,
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const mentionRef = useRef<HTMLDivElement | null>(null);
  const mentionScrollRef = useRef<HTMLDivElement | null>(null);
  const membersRef = useRef<Array<{ id: string; name: string; email?: string; role?: string }>>([]);
  const mentionCommandRef = useRef<((item: any) => void) | null>(null);

  const [linkUrl, setLinkUrl] = useState("");
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [, setUpdateCount] = useState(0);


  // Load members from localStorage
  useEffect(() => {
    if (boardId) {
      const loadedMembers = getMembersFromLocalStorage(boardId);
      membersRef.current = loadedMembers;
    }
  }, [boardId]);

  // Custom extension for font size
  const FontSize = Extension.create({
    name: "fontSize",
    addGlobalAttributes() {
      return [
        {
          types: ["textStyle"],
          attributes: {
            fontSize: {
              default: null,
              parseHTML: (element) => element.style.fontSize || null,
              renderHTML: (attributes) => {
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

  // Custom extension for File Attachment Card (PDF, Docx, etc.)
  const FileCard = TiptapNode.create({
    name: "fileCard",
    group: "block",
    atom: true,
    draggable: true,

    addAttributes() {
      return {
        href: { default: null },
        fileName: { default: "Document" },
        fileType: { default: "pdf" }, // 'pdf' or 'docx'
      };
    },

    parseHTML() {
      return [
        {
          tag: 'div[data-type="file-card"]',
          getAttrs: (element) => ({
            href: (element as HTMLElement).getAttribute("data-href"),
            fileName: (element as HTMLElement).getAttribute("data-filename"),
            fileType: (element as HTMLElement).getAttribute("data-filetype") || "pdf",
          }),
        },
        // Backward compatibility for old pdf-card tags
        {
          tag: 'div[data-type="pdf-card"]',
          getAttrs: (element) => ({
            href: (element as HTMLElement).getAttribute("data-href"),
            fileName: (element as HTMLElement).getAttribute("data-filename"),
            fileType: "pdf",
          }),
        },
      ];
    },

    renderHTML({ node, HTMLAttributes }) {
      const isDocx = node.attrs.fileType === "docx" || 
                    node.attrs.fileName.toLowerCase().endsWith(".docx") || 
                    node.attrs.fileName.toLowerCase().endsWith(".doc");
      
      const icon = isDocx ? "📝" : "📄";
      const typeLabel = isDocx ? "Word Document" : "PDF Document";
      const themeClass = isDocx ? "docx-card" : "pdf-card";

      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-type": "file-card",
          "data-href": node.attrs.href,
          "data-filename": node.attrs.fileName,
          "data-filetype": isDocx ? "docx" : "pdf",
          class: `file-card-wrapper ${themeClass}`,
        }),
        [
          "div",
          { class: "file-card-content" },
          ["span", { class: "file-card-icon" }, icon],
          [
            "div",
            { class: "file-card-info" },
            ["span", { class: "file-card-name" }, node.attrs.fileName],
            ["span", { class: "file-card-type" }, typeLabel],
          ],
          [
            "div",
            { class: "file-card-actions" },
            [
              "button",
              {
                type: "button",
                class:
                  "file-card-preview-btn hover:bg-accent hover:text-accent-foreground",
              },
              "Preview",
            ],
            [
              "a",
              {
                href: node.attrs.href,
                target: "_blank",
                class:
                  "file-card-open-btn hover:bg-accent hover:text-accent-foreground",
                rel: "noopener noreferrer",
              },
              "Open",
            ],
          ],
        ],
      ];
    },
  });

  const editor = useEditor({
    autofocus: autoFocus,
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
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        validate: (href) => !!href, // Allow any href including blob:
        protocols: ["http", "https", "mailto", "tel", "blob"], // Explicitly support blob
        HTMLAttributes: {
          class: "text-primary hover:underline cursor-pointer",
        },
      }).extend({
        inclusive: false,
        addAttributes() {
          return {
            ...this.parent?.(),
            class: {
              default: null,
              parseHTML: (element) => element.getAttribute("class"),
              renderHTML: (attributes) => {
                // Return exactly the class provided, or fallback to default
                return {
                  class:
                    attributes.class ||
                    "text-primary hover:underline cursor-pointer",
                };
              },
            },
          };
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
        types: ["heading", "paragraph", "image"],
      }),
      FileCard,
      Mention.configure({
        HTMLAttributes: {
          class:
            "bg-blue-100 text-blue-600 px-1 rounded hover:bg-blue-200 cursor-pointer",
        },
        suggestion: {
          items: ({ query }) => {
            let filtered = membersRef.current;

            // Filter by query
            filtered = filtered.filter((user) =>
              user.name.toLowerCase().includes(query.toLowerCase()),
            );

            // Filter by role/tab rules
            filtered = filterMembersByRoleRules(filtered, effectiveIsClient, !!isClientUpdatesTab);

            setMentionItems(filtered);
            mentionItemsRef.current = filtered;
            return filtered;
          },
          render: () => {
            return {
              onStart: (props: any) => {
                setMentionOpen(true);
                setMentionCommand(() => props.command);
                mentionCommandRef.current = props.command;
                const coords = props.clientRect?.();

                // Look for common portal containers to avoid interaction blocking by Radix modal traps
                const portalTarget =
                  document.getElementById("task-card-dialog-content") ||
                  document.getElementById("comments-sheet-content") ||
                  document.querySelector('[role="dialog"]') ||
                  document.querySelector('[data-radix-portal]') ||
                  document.body;
                setMentionPortalTarget(portalTarget as HTMLElement);

                if (coords) {
                  const dropdownHeight = 300;
                  const isBody = portalTarget === document.body;

                  // Since it's appended to a potentially transformed container, calculate relative coordinates
                  const targetRect = (
                    portalTarget as HTMLElement
                  ).getBoundingClientRect();

                  let left = coords.left + (isBody ? window.scrollX : 0);
                  let top = coords.bottom + (isBody ? window.scrollY : 0);

                  if (!isBody) {
                    left -= targetRect.left;
                    top -= targetRect.top;
                  }

                  const spaceBelow = window.innerHeight - coords.bottom;
                  const spaceAbove = coords.top;
                  const isAbove =
                    spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;

                  if (isAbove) {
                    top =
                      (isAbove ? coords.top : coords.bottom) -
                      (isBody ? 0 : targetRect.top) +
                      (isBody ? window.scrollY : 0);
                  }

                  setMentionPosition({ top, left, isAbove });
                }
                setSelectedIndex(0);
                selectedIndexRef.current = 0;
              },

              onUpdate: (props: any) => {
                setMentionCommand(() => props.command);
                mentionCommandRef.current = props.command;
                const coords = props.clientRect?.();

                if (coords && mentionPortalTarget) {
                  const dropdownHeight = 300;
                  const isBody = mentionPortalTarget === document.body;
                  const targetRect = (
                    mentionPortalTarget as HTMLElement
                  ).getBoundingClientRect();

                  let left = coords.left + (isBody ? window.scrollX : 0);
                  let top = coords.bottom + (isBody ? window.scrollY : 0);

                  if (!isBody) {
                    left -= targetRect.left;
                    top -= targetRect.top;
                  }

                  const spaceBelow = window.innerHeight - coords.bottom;
                  const spaceAbove = coords.top;
                  const isAbove =
                    spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;

                  if (isAbove) {
                    top =
                      (isAbove ? coords.top : coords.bottom) -
                      (isBody ? 0 : targetRect.top) +
                      (isBody ? window.scrollY : 0);
                  }

                  setMentionPosition({ top, left, isAbove });
                }

                let filtered = membersRef.current;

                // Filter by query
                filtered = filtered.filter((user) =>
                  user.name.toLowerCase().includes(props.query.toLowerCase()),
                );

                // Filter by role/tab rules
                filtered = filterMembersByRoleRules(filtered, effectiveIsClient, !!isClientUpdatesTab);

                setMentionItems(filtered);
                mentionItemsRef.current = filtered;
                setSelectedIndex(0);
                selectedIndexRef.current = 0;
              },

              onKeyDown: (props: any) => {
                const items = mentionItemsRef.current;

                if (!items || items.length === 0) {
                  if (props.event.key === "Escape") {
                    setMentionOpen(false);
                    return true;
                  }
                  return false;
                }

                if (props.event.key === "ArrowUp") {
                  props.event.preventDefault();

                  const newIndex =
                    selectedIndexRef.current > 0
                      ? selectedIndexRef.current - 1
                      : items.length - 1;

                  selectedIndexRef.current = newIndex;
                  setSelectedIndex(newIndex);
                  return true;
                }

                if (props.event.key === "ArrowDown") {
                  props.event.preventDefault();

                  const newIndex =
                    selectedIndexRef.current < items.length - 1
                      ? selectedIndexRef.current + 1
                      : 0;

                  selectedIndexRef.current = newIndex;
                  setSelectedIndex(newIndex);
                  return true;
                }

                if (props.event.key === "Enter") {
                  props.event.preventDefault();

                  const items = mentionItemsRef.current;
                  const item = items[selectedIndexRef.current];

                  // Use the REF here instead of props.command or the state
                  if (item && mentionCommandRef.current) {
                    mentionCommandRef.current({
                      id: item.id,
                      label: item.name,
                    });

                    setMentionOpen(false);
                    setSelectedIndex(0);
                    selectedIndexRef.current = 0;
                    return true;
                  }
                  return false;
                }

                if (props.event.key === "Escape") {
                  setMentionOpen(false);
                  return true;
                }

                return false;
              },

              onExit: () => {
                setMentionOpen(false);
                setMentionCommand(null);
                setMentionPortalTarget(null);
              },
            };
          },
        },
      }),
      Image.configure({
        allowBase64: true,
        inline: false,
        HTMLAttributes: {
          class:
            "max-w-full h-auto max-h-[350px] object-contain rounded-lg my-4 cursor-zoom-in",
        },
      }),
    ],
    content: value,
    editorProps: {
      handleKeyDown: (_, event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          if (onSubmit) {
            onSubmit();
          }
          return true;
        }

        return false;
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const images = items.filter((item) => item.type.startsWith("image/"));
        const pdfs = items.filter((item) => item.type === "application/pdf");
        const docxFiles = items.filter(
          (item) =>
            item.type ===
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            item.type === "application/msword",
        );

        if (images.length > 0 || pdfs.length > 0 || docxFiles.length > 0) {
          event.preventDefault();

          images.forEach((item) => {
            const file = item.getAsFile();
            if (file) {
              const blobUrl = URL.createObjectURL(file);
              attachmentsApi.registerPendingFile(blobUrl, file);
              const { schema } = view.state;
              const node = schema.nodes.image.create({ src: blobUrl });
              const transaction = view.state.tr.replaceSelectionWith(node);
              view.dispatch(transaction);
            }
          });

          pdfs.forEach((item) => {
            const file = item.getAsFile();
            if (file) {
              const blobUrl = URL.createObjectURL(file);
              attachmentsApi.registerPendingFile(blobUrl, file);
              editor
                ?.chain()
                .insertContent({
                  type: "fileCard",
                  attrs: {
                    href: blobUrl,
                    fileName: file.name,
                    fileType: "pdf",
                  },
                })
                .run();
            }
          });

          docxFiles.forEach((item) => {
            const file = item.getAsFile();
            if (file) {
              const blobUrl = URL.createObjectURL(file);
              attachmentsApi.registerPendingFile(blobUrl, file);
              editor
                ?.chain()
                .insertContent({
                  type: "fileCard",
                  attrs: {
                    href: blobUrl,
                    fileName: file.name,
                    fileType: "docx",
                  },
                })
                .run();
            }
          });

          if (images.length > 0) toast.success("Image pasted (preview)");
          if (pdfs.length > 0) toast.success("PDF pasted (preview)");
          if (docxFiles.length > 0) toast.success("Word doc pasted (preview)");
          return true;
        }
        return false;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (
          !moved &&
          event.dataTransfer &&
          event.dataTransfer.files &&
          event.dataTransfer.files[0]
        ) {
          const files = Array.from(event.dataTransfer.files);
          const images = files.filter((file) => file.type.startsWith("image/"));
          const pdfs = files.filter((file) => file.type === "application/pdf");
          const docxFiles = files.filter(
            (file) =>
              file.type ===
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
              file.type === "application/msword" ||
              file.name.toLowerCase().endsWith(".docx") ||
              file.name.toLowerCase().endsWith(".doc"),
          );

          if (images.length > 0 || pdfs.length > 0 || docxFiles.length > 0) {
            event.preventDefault();

            images.forEach((file) => {
              const blobUrl = URL.createObjectURL(file);
              attachmentsApi.registerPendingFile(blobUrl, file);
              const { schema } = view.state;
              const node = schema.nodes.image.create({ src: blobUrl });
              const transaction = view.state.tr.replaceSelectionWith(node);
              view.dispatch(transaction);
            });

            pdfs.forEach((file) => {
              const blobUrl = URL.createObjectURL(file);
              attachmentsApi.registerPendingFile(blobUrl, file);
              editor
                ?.chain()
                .insertContent({
                  type: "fileCard",
                  attrs: {
                    href: blobUrl,
                    fileName: file.name,
                    fileType: "pdf",
                  },
                })
                .run();
            });

            docxFiles.forEach((file) => {
              const blobUrl = URL.createObjectURL(file);
              attachmentsApi.registerPendingFile(blobUrl, file);
              editor
                ?.chain()
                .insertContent({
                  type: "fileCard",
                  attrs: {
                    href: blobUrl,
                    fileName: file.name,
                    fileType: "docx",
                  },
                })
                .run();
            });

            if (images.length > 0) toast.success("Image dropped (preview)");
            if (pdfs.length > 0) toast.success("PDF dropped (preview)");
            if (docxFiles.length > 0) toast.success("Word doc dropped (preview)");
            return true;
          }
        }
        return false;
      },
      handleClick: (_, __pos, event) => {
        const { target } = event;
        const targetElement = target as HTMLElement;

        if (targetElement instanceof HTMLImageElement) {
          setPreviewSrc(targetElement.src);
          setPreviewFileName(undefined);
          setIsPreviewOpen(true);
          return true;
        }

        // Handle File Card Preview button
        const previewBtn = targetElement.closest(".file-card-preview-btn");
        if (previewBtn) {
          const wrapper = targetElement.closest("[data-type='file-card']") || 
                         targetElement.closest("[data-type='pdf-card']");
          if (wrapper) {
            const href = wrapper.getAttribute("data-href");
            const fileName = wrapper.getAttribute("data-filename");
            if (href) {
              setPreviewSrc(href);
              setPreviewFileName(fileName || "Document");
              setIsPreviewOpen(true);
              return true;
            }
          }
        }

        // Check if it's a PDF/Word link (legacy or fallback)
        const anchor = targetElement.closest("a");
        if (
          anchor &&
          !anchor.classList.contains("file-card-open-btn") &&
          !anchor.classList.contains("pdf-card-open-btn") &&
          (anchor.href.toLowerCase().endsWith(".pdf") ||
            anchor.href.toLowerCase().endsWith(".docx") ||
            anchor.href.toLowerCase().endsWith(".doc") ||
            anchor.classList.contains("pdf-link") ||
            (anchor.textContent && (anchor.textContent.includes("📄") || anchor.textContent.includes("📝"))))
        ) {
          event.preventDefault();
          setPreviewSrc(anchor.href);
          setPreviewFileName(anchor.textContent || "Document");
          setIsPreviewOpen(true);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (!isUpdatingRef.current) {
        onChange(editor.getHTML());
      }
    },
    onTransaction: () => {
      setUpdateCount((prev) => prev + 1);
    },
    onSelectionUpdate: () => {
      setUpdateCount((prev) => prev + 1);
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
      if (
        mentionRef.current &&
        !mentionRef.current.contains(e.target as Node)
      ) {
        if (
          editorContainerRef.current &&
          !editorContainerRef.current.contains(e.target as Node)
        ) {
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

  const handleLinkClick = () => {
    const previousUrl = editor.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setLinkPopoverOpen(true);
  };

  const applyLink = () => {
    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkPopoverOpen(false);
      return;
    }

    let formattedUrl = linkUrl;
    // Add protocol if missing and it's not a mailto/tel/blob
    if (
      !/^https?:\/\//i.test(formattedUrl) &&
      !/^mailto:/i.test(formattedUrl) &&
      !/^tel:/i.test(formattedUrl) &&
      !/^blob:/i.test(formattedUrl) &&
      !/^#/i.test(formattedUrl)
    ) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;

    if (hasSelection) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: formattedUrl })
        .run();
    } else {
      // If no selection, insert the URL as a link and immediately "break out"
      editor
        .chain()
        .focus()
        .insertContent(
          `<a href="${formattedUrl}" class="text-primary hover:underline cursor-pointer">${formattedUrl}</a> `,
        )
        .unsetLink()
        .run();
    }
    setLinkPopoverOpen(false);
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkUrl("");
    setLinkPopoverOpen(false);
  };

  // Close mention dropdown on scroll to prevent "sticky" floating popups,
  // but avoid closing when scrolling within the dropdown itself.
  useEffect(() => {
    const handleScroll = (event: Event) => {
      if (
        mentionOpen &&
        mentionRef.current &&
        mentionRef.current.contains(event.target as Node)
      ) {
        return;
      }
      setMentionOpen(false);
    };

    if (mentionOpen) {
      window.addEventListener("scroll", handleScroll, { capture: true });
    }

    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [mentionOpen]);

  // Sync scroll position with keyboard selection in mention list
  useEffect(() => {
    if (mentionOpen && mentionScrollRef.current) {
      const container = mentionScrollRef.current;
      const selectedItem = container.children[selectedIndex] as HTMLElement;
      if (selectedItem) {
        const containerHeight = container.offsetHeight;
        const itemTop = selectedItem.offsetTop;
        const itemHeight = selectedItem.offsetHeight;
        const scrollTop = container.scrollTop;

        if (itemTop < scrollTop) {
          container.scrollTop = itemTop;
        } else if (itemTop + itemHeight > scrollTop + containerHeight) {
          container.scrollTop = itemTop + itemHeight - containerHeight;
        }
      }
    }
  }, [selectedIndex, mentionOpen]);

  const handleMentionSelect = (user: { id: string; name: string }) => {
    if (mentionCommand) {
      editor?.commands.focus();
      mentionCommand({ id: user.id, label: user.name });
    } else {
      // Correctly insert a mention node instead of raw HTML
      editor
        ?.chain()
        .focus()
        .insertContent([
          {
            type: "mention",
            attrs: { id: user.id, label: user.name },
          },
          {
            type: "text",
            text: " ",
          },
        ])
        .run();
    }
    setMentionOpen(false);
  };

  const toggleListSplittingHardBreaks = (listType: "bulletList" | "orderedList") => {
    if (!editor) return;

    editor.chain().focus().run();

    const { state } = editor;
    const { selection, doc } = state;
    const { from, to } = selection;

    // Find all hardBreak nodes in the selection
    const positions: number[] = [];
    doc.nodesBetween(from, to, (node, pos) => {
      if (node.type.name === "hardBreak") {
        positions.push(pos);
      }
    });

    if (positions.length > 0) {
      const tr = state.tr;
      // Delete hardBreak and split in reverse order
      for (let i = positions.length - 1; i >= 0; i--) {
        const pos = positions[i];
        tr.delete(pos, pos + 1);
        tr.split(pos);
      }
      editor.view.dispatch(tr);

      // Select the new range so that the list toggle command applies to all split paragraphs
      editor.commands.setTextSelection({
        from: from,
        to: to + positions.length,
      });
    }

    // After splitting, toggle the list
    if (listType === "bulletList") {
      editor.chain().focus().toggleBulletList().run();
    } else {
      editor.chain().focus().toggleOrderedList().run();
    }
  };

  return (
    <div
      className="relative z-10 h-full flex flex-col"
      ref={editorContainerRef}
    >
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
                className={cn(
                  "h-8 px-2",
                  editor.isActive("heading", { level: 1 }) ||
                    editor.isActive("blockquote") ||
                    editor.isActive("codeBlock")
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h7"
                  />
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
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 1 }).run()
                }
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
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <text
                    x="4"
                    y="18"
                    fontSize="16"
                    fontWeight="bold"
                    fill="currentColor"
                  >
                    A
                  </text>
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
                    editor
                      .chain()
                      .focus()
                      .setMark("textStyle", { fontSize: size })
                      .run();
                  }}
                >
                  {size}
                </button>
              ))}
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm"
                onClick={() =>
                  editor.chain().focus().unsetMark("textStyle").run()
                }
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
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("bold")
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "text-foreground hover:bg-muted",
            )}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("italic")
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "text-foreground hover:bg-muted",
            )}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("underline")
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "text-foreground hover:bg-muted",
            )}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("strike")
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "text-foreground hover:bg-muted",
            )}
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
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("bulletList")
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "text-foreground hover:bg-muted",
            )}
            onClick={() => toggleListSplittingHardBreaks("bulletList")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("orderedList")
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "text-foreground hover:bg-muted",
            )}
            onClick={() => toggleListSplittingHardBreaks("orderedList")}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("textAlign", { align: "left" })
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "text-foreground hover:bg-muted",
            )}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("textAlign", { align: "center" })
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "text-foreground hover:bg-muted",
            )}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("textAlign", { align: "right" })
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "text-foreground hover:bg-muted",
            )}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0",
                  editor.isActive("link") &&
                    "bg-blue-500 text-white hover:bg-blue-600",
                )}
                onClick={handleLinkClick}
              >
                <Link2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <div className="flex flex-col gap-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Insert Link
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Enter the URL you want to link to.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="h-8 text-xs focus-visible:ring-1 focus-visible:ring-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyLink();
                      }
                      if (e.key === "Escape") {
                        setLinkPopoverOpen(false);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                    onClick={applyLink}
                  >
                    Apply
                  </Button>
                </div>
                {editor.isActive("link") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] text-red-500 hover:text-red-600 hover:bg-red-500/10 w-fit p-0"
                    onClick={removeLink}
                  >
                    Remove Link
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
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

          <Popover modal={true}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Insert GIF"
              >
                <div className="flex items-center justify-center font-bold text-[10px] border-2 border-current rounded px-0.5 leading-none">
                  GIF
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <GiphySelector
                apiKey="dEaUzNMl7ndKJ52iKH6iAHXjSJZ4revx"
                onSelect={(url) => {
                  editor.chain().focus().setImage({ src: url }).run();
                }}
              />
            </PopoverContent>
          </Popover>

          <div className="hidden w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => fileInputRef.current?.click()}
            title="Upload file (Image, PDF, or Word)"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,.pdf,.docx,.doc"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              try {
                // 1. Create a local blob URL for instant preview
                const blobUrl = URL.createObjectURL(file);

                // 2. Register the file for later upload
                attachmentsApi.registerPendingFile(blobUrl, file);

                // 3. Insert into editor immediately
                if (file.type.startsWith("image/")) {
                  editor.chain().focus("end").setImage({ src: blobUrl }).run();
                  toast.success("Image added (preview)");
                } else if (file.type === "application/pdf") {
                  editor
                    .chain()
                    .focus("end")
                    .insertContent({
                      type: "fileCard",
                      attrs: {
                        href: blobUrl,
                        fileName: file.name,
                        fileType: "pdf",
                      },
                    })
                    .run();
                  toast.success("PDF added (preview)");
                } else if (
                  file.type ===
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                  file.type === "application/msword" ||
                  file.name.toLowerCase().endsWith(".docx") ||
                  file.name.toLowerCase().endsWith(".doc")
                ) {
                  editor
                    .chain()
                    .focus("end")
                    .insertContent({
                      type: "fileCard",
                      attrs: {
                        href: blobUrl,
                        fileName: file.name,
                        fileType: "docx",
                      },
                    })
                    .run();
                  toast.success("Word doc added (preview)");
                }
              } catch (error) {
                console.error("Failed to process file:", error);
                toast.error("Failed to process file");
              } finally {
                // Reset input
                e.target.value = "";
              }
            }}
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "hidden h-8 w-8 p-0",
              editor.isActive("taskList") &&
                "bg-blue-500 text-white hover:bg-blue-600",
            )}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Add checklist"
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>

        {/* Mention Dropdown */}
        {mentionOpen &&
          createPortal(
            <div
              ref={mentionRef}
              className={cn(
                "z-[9999] bg-card border border-border rounded-lg shadow-2xl w-56 pointer-events-auto",
                mentionPortalTarget && mentionPortalTarget !== document.body
                  ? "absolute"
                  : "fixed",
              )}
              style={{
                top: `${mentionPosition.top}px`,
                left: `${mentionPosition.left}px`,
                transform: mentionPosition.isAbove
                  ? "translateY(-100%) translateY(-8px)"
                  : "translateY(4px)",
              }}
            >
              <div className="text-[11px] px-3 py-2 text-muted-foreground uppercase tracking-wider border-b border-border bg-card">
                Mention
              </div>
              <div
                ref={mentionScrollRef}
                className="flex flex-col max-h-64 overflow-y-auto bg-card overscroll-contain"
                onWheel={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {mentionItems.length > 0 ? (
                  mentionItems.map((user, index) => (
                    <button
                      key={user.id}
                      onClick={() => handleMentionSelect(user)}
                      className={cn(
                        "group flex items-center gap-2 w-full text-left px-3 py-2 transition-colors text-sm text-foreground shrink-0 overflow-hidden",
                        index === selectedIndex
                          ? "bg-accent"
                          : "hover:bg-accent",
                      )}
                    >
                      <span className="w-6 h-6 rounded bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        {user.name
                          .split(" ")
                          .map((n) => n.charAt(0).toUpperCase())
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <span className="truncate flex-1 min-w-0">
                        {user.name}
                      </span>
                      {isClientRole(user.role) && (
                        <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 py-[1px] rounded-sm select-none shrink-0 font-medium leading-none">
                          Client
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      No Member Found
                    </p>
                  </div>
                )}
              </div>
            </div>,
            mentionPortalTarget || document.body,
          )}

        {/* Editor Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <EditorContent
            editor={editor}
            className={cn(
              "flex-1 max-h-[450px] min-h-[100px] p-3 focus:outline-none text-sm text-foreground bg-card relative z-20 overflow-y-auto",
              "[&_.ProseMirror]:outline-none [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:min-h-[100px] [&_.ProseMirror]:text-foreground",
              "[&_img]:max-w-full [&_img]:h-auto [&_img]:max-h-[350px] [&_img]:object-contain [&_img]:rounded-lg [&_img]:border [&_img]:border-border [&_img]:cursor-zoom-in",
              "[&_img[style*='text-align: center']]:mx-auto [&_img[style*='text-align: center']]:block",
              "[&_img[style*='text-align: right']]:ml-auto [&_img[style*='text-align: right']]:block",
              "[&_img[style*='text-align: left']]:mr-auto [&_img[style*='text-align: left']]:block",
              "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2",
              "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2",
              "[&_li]:my-1",
              "[&_ul_ul]:list-circle [&_ul_ul]:pl-5",
              "[&_ol_ol]:pl-5",
              "[&_blockquote]:border-l-4 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-2 [&_blockquote]:text-muted-foreground",
              "[&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded [&_pre]:font-mono [&_pre]:text-sm [&_pre]:my-2 [&_pre]:overflow-x-auto",
              "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-2",
              "[&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-sm",
              "[&_p]:min-h-[1em] [&_p]:my-1",
              "[&_a]:text-primary [&_a]:hover:underline [&_a]:cursor-pointer",
              "[&_.ProseMirror.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror.is-editor-empty:first-child::before]:pointer-events-none",
              "[&_input[type='checkbox']]:cursor-pointer [&_input[type='checkbox']]:accent-primary",
            )}
            data-placeholder={placeholder}
          />
        </div>
        <FilePreviewModal
          src={previewSrc}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          fileName={previewFileName}
        />
      </div>
    </div>
  );
}
