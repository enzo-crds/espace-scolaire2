import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import TextAlign from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Link as LinkIcon, Image as ImageIcon, Table as TableIcon,
  AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, Minus, Highlighter, Search, IndentIncrease,
} from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const TEXT_COLORS = ["#0f172a", "#dc2626", "#d97706", "#16a34a", "#2563eb", "#7c3aed", "#db2777"];
const HIGHLIGHT_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa"];

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        active
          ? "bg-[var(--accent)]/15 text-[var(--accent)]"
          : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInfo, setSearchInfo] = useState("");
  const searchHit = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      // Tiptap v3 : StarterKit embarque déjà Underline et Link. On les configure ici plutôt que
      // de les ré-enregistrer (sinon extensions en double, comportement imprévisible).
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      ImageExt.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: placeholder || "Commencez à écrire…" }),
      CharacterCount,
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[300px] prose-sm sm:prose-base",
      },
    },
  });

  // Resynchronise l'éditeur si le contenu change depuis l'extérieur (synchro Drive, autre appareil).
  // On ne le fait PAS pendant que l'utilisateur tape : le contenu du parent est alors déjà identique.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if ((content || "") !== editor.getHTML() && (content || "") !== "") {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  const addImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      // Les images sont intégrées au texte (base64) : au-delà de 3 Mo, la sauvegarde et la synchro deviennent lentes
      if (file.size > 3 * 1024 * 1024) {
        window.alert("Image trop lourde (3 Mo maximum). Réduisez-la avant de l'insérer.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result as string }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const addLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const input = window.prompt("URL du lien (laisser vide pour retirer) :", previous || "https://");
    if (input === null) return; // annulé
    const url = input.trim();
    if (url === "" || url === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    // Refuse les schémas dangereux (javascript:, data:...) ; ajoute https:// si absent
    if (/^\s*(javascript|data|vbscript):/i.test(url)) return;
    const href = /^(https?:|mailto:|tel:|#|\/)/i.test(url) ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };

  const runSearch = (dir: "next" | "prev") => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return;

    // Recherche implémentée avec l'API de sélection ProseMirror plutôt que window.find()
    // (non standard : absent de Firefox mobile et de Safari iOS).
    const matches: number[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;
      const text = node.text.toLowerCase();
      let idx = text.indexOf(term);
      while (idx !== -1) {
        matches.push(pos + idx);
        idx = text.indexOf(term, idx + term.length);
      }
    });
    if (matches.length === 0) {
      setSearchInfo("Aucun résultat");
      return;
    }
    const cursor = editor.state.selection.from;
    let target: number;
    if (dir === "next") {
      target = matches.find((m) => m >= cursor + (searchHit.current ? 1 : 0)) ?? matches[0];
    } else {
      target = [...matches].reverse().find((m) => m < cursor) ?? matches[matches.length - 1];
    }
    searchHit.current = true;
    editor.chain().focus().setTextSelection({ from: target, to: target + term.length }).scrollIntoView().run();
    setSearchInfo(`${matches.indexOf(target) + 1} / ${matches.length}`);
  };

  const words = editor.storage.characterCount?.words?.() ?? 0;
  const characters = editor.storage.characterCount?.characters?.() ?? 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 p-1.5 dark:border-slate-700">
        <ToolbarButton title="Titre 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Titre 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Titre 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />
        <ToolbarButton title="Gras (Ctrl+B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Italique (Ctrl+I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Souligné (Ctrl+U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Barré" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />

        {/* Couleur du texte */}
        <div className="group relative">
          <ToolbarButton title="Couleur du texte" onClick={() => {}}>
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold" style={{ color: editor.getAttributes("textStyle").color || undefined }}>A</span>
          </ToolbarButton>
          <div className="invisible absolute left-0 top-full z-20 mt-1 flex gap-1 rounded-lg border border-slate-200 bg-white p-1.5 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 dark:border-slate-600 dark:bg-slate-700">
            {TEXT_COLORS.map((c) => (
              <button key={c} type="button" aria-label={`Couleur ${c}`} className="h-5 w-5 rounded-full border border-black/5" style={{ background: c }} onClick={() => editor.chain().focus().setColor(c).run()} />
            ))}
            <button type="button" title="Couleur par défaut" className="h-5 w-5 rounded-full border border-slate-300 text-[10px] leading-none text-slate-500" onClick={() => editor.chain().focus().unsetColor().run()}>×</button>
          </div>
        </div>

        {/* Surlignage */}
        <div className="group relative">
          <ToolbarButton title="Surligner" active={editor.isActive("highlight")} onClick={() => {}}>
            <Highlighter className="h-4 w-4" />
          </ToolbarButton>
          <div className="invisible absolute left-0 top-full z-20 mt-1 flex gap-1 rounded-lg border border-slate-200 bg-white p-1.5 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 dark:border-slate-600 dark:bg-slate-700">
            {HIGHLIGHT_COLORS.map((c) => (
              <button key={c} type="button" aria-label={`Surlignage ${c}`} className="h-5 w-5 rounded-full border border-black/5" style={{ background: c }} onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()} />
            ))}
            <button type="button" title="Retirer le surlignage" className="h-5 w-5 rounded-full border border-slate-300 text-[10px] leading-none text-slate-500" onClick={() => editor.chain().focus().unsetHighlight().run()}>×</button>
          </div>
        </div>
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />

        <ToolbarButton title="Liste à puces" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Liste numérotée" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Indenter la liste" onClick={() => editor.chain().focus().sinkListItem("listItem").run()}><IndentIncrease className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Citation" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />

        <ToolbarButton title="Aligner à gauche" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Centrer" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Aligner à droite" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />

        <ToolbarButton title="Lien" active={editor.isActive("link")} onClick={addLink}><LinkIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Image" onClick={addImage}><ImageIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Tableau" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Séparateur" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />

        <ToolbarButton title="Annuler (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Rétablir (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Rechercher dans le document" active={showSearch} onClick={() => setShowSearch((s) => !s)}><Search className="h-4 w-4" /></ToolbarButton>
      </div>

      {showSearch && (
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-700">
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSearchInfo("");
              searchHit.current = false;
            }}
            onKeyDown={(e) => e.key === "Enter" && runSearch(e.shiftKey ? "prev" : "next")}
            placeholder="Rechercher un mot dans le document…"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)] dark:border-slate-600 dark:bg-slate-700"
          />
          <button onClick={() => runSearch("prev")} className="rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-600">◀</button>
          <button onClick={() => runSearch("next")} className="rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-600">▶</button>
          {searchInfo && <span className="text-xs text-slate-400">{searchInfo}</span>}
        </div>
      )}

      <div ref={contentRef} className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-400 dark:border-slate-700">
        <span>{words} mots · {characters} caractères</span>
      </div>
    </div>
  );
}
