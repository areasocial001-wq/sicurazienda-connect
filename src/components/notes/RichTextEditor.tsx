import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, CheckSquare, Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight, Highlighter, Undo, Redo,
  Quote, Code, Minus, ImageIcon,
} from 'lucide-react';
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  noteId?: string;
}

const MenuButton = ({ 
  onClick, isActive, children, title 
}: { 
  onClick: () => void; isActive?: boolean; children: React.ReactNode; title?: string 
}) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className={`h-7 w-7 ${isActive ? 'bg-accent text-accent-foreground' : ''}`}
    onClick={onClick}
    title={title}
  >
    {children}
  </Button>
);

const RichTextEditor = ({ content, onChange, placeholder, noteId }: RichTextEditorProps) => {
  const { user } = useAuth();

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!user || !noteId) return null;
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `${user.id}/${noteId}/img_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('note-attachments').upload(filePath, file);
    if (error) { console.error('Upload error:', error); return null; }
    const { data } = await supabase.storage.from('note-attachments').createSignedUrl(filePath, 60 * 60 * 24 * 365);
    return data?.signedUrl || null;
  }, [user, noteId]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder || 'Scrivi qui la tua nota...' }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-4 py-3',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return false;
            // First insert as base64 for instant preview, then replace with uploaded URL
            const reader = new FileReader();
            reader.onload = async (e) => {
              const base64 = e.target?.result as string;
              view.dispatch(view.state.tr.replaceSelectionWith(
                view.state.schema.nodes.image.create({ src: base64 })
              ));
              // Upload in background and replace
              const url = await uploadImage(file);
              if (url) {
                const { doc } = view.state;
                doc.descendants((node, pos) => {
                  if (node.type.name === 'image' && node.attrs.src === base64) {
                    view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: url }));
                    return false;
                  }
                });
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const file = files[0];
        if (!file.type.startsWith('image/')) return false;
        event.preventDefault();
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (pos) {
            view.dispatch(view.state.tr.insert(pos.pos,
              view.state.schema.nodes.image.create({ src: base64 })
            ));
          }
          const url = await uploadImage(file);
          if (url) {
            const { doc } = view.state;
            doc.descendants((node, nodePos) => {
              if (node.type.name === 'image' && node.attrs.src === base64) {
                view.dispatch(view.state.tr.setNodeMarkup(nodePos, undefined, { ...node.attrs, src: url }));
                return false;
              }
            });
          }
        };
        reader.readAsDataURL(file);
        return true;
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const handleImageButton = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !editor) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        editor.chain().focus().setImage({ src: base64 }).run();
        const url = await uploadImage(file);
        if (url) {
          const { doc } = editor.state;
          doc.descendants((node, pos) => {
            if (node.type.name === 'image' && node.attrs.src === base64) {
              editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: url }));
              return false;
            }
          });
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [editor, uploadImage]);

  if (!editor) return null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30 shrink-0">
        <MenuButton onClick={() => editor.chain().focus().undo().run()} title="Annulla">
          <Undo className="h-3.5 w-3.5" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().redo().run()} title="Ripeti">
          <Redo className="h-3.5 w-3.5" />
        </MenuButton>
        
        <Separator orientation="vertical" className="h-5 mx-1" />
        
        <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Titolo 1">
          <Heading1 className="h-3.5 w-3.5" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Titolo 2">
          <Heading2 className="h-3.5 w-3.5" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Titolo 3">
          <Heading3 className="h-3.5 w-3.5" />
        </MenuButton>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Grassetto">
          <Bold className="h-3.5 w-3.5" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Corsivo">
          <Italic className="h-3.5 w-3.5" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Sottolineato">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Barrato">
          <Strikethrough className="h-3.5 w-3.5" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive('highlight')} title="Evidenzia">
          <Highlighter className="h-3.5 w-3.5" />
        </MenuButton>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Elenco puntato">
          <List className="h-3.5 w-3.5" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Elenco numerato">
          <ListOrdered className="h-3.5 w-3.5" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')} title="Lista attività">
          <CheckSquare className="h-3.5 w-3.5" />
        </MenuButton>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <MenuButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Citazione">
          <Quote className="h-3.5 w-3.5" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} title="Blocco codice">
          <Code className="h-3.5 w-3.5" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linea orizzontale">
          <Minus className="h-3.5 w-3.5" />
        </MenuButton>
        <MenuButton onClick={handleImageButton} title="Inserisci immagine">
          <ImageIcon className="h-3.5 w-3.5" />
        </MenuButton>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <MenuButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Allinea a sinistra">
          <AlignLeft className="h-3.5 w-3.5" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Allinea al centro">
          <AlignCenter className="h-3.5 w-3.5" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Allinea a destra">
          <AlignRight className="h-3.5 w-3.5" />
        </MenuButton>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} className="h-full [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:my-2" />
      </div>
    </div>
  );
};

export default RichTextEditor;
