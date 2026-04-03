import { useRef, useCallback } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readonly?: boolean;
  className?: string;
}

type RteCommand = 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList';

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Text eingeben...',
  readonly = false,
  className = '',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const exec = useCallback((cmd: RteCommand) => {
    document.execCommand(cmd, false);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertHr = useCallback(() => {
    document.execCommand('insertHTML', false, '<hr>');
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  if (readonly) {
    return (
      <div
        className={`text-[13px] text-gray-900 leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <ToolbarBtn onClick={() => exec('bold')} title="Fett">
          <strong>B</strong>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec('italic')} title="Kursiv">
          <em>I</em>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec('underline')} title="Unterstrichen">
          <u>U</u>
        </ToolbarBtn>
        <span className="w-px h-4 bg-gray-300 mx-1" />
        <ToolbarBtn onClick={() => exec('insertUnorderedList')} title="Aufzählung">
          &bull;
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec('insertOrderedList')} title="Nummerierung">
          1.
        </ToolbarBtn>
        <span className="w-px h-4 bg-gray-300 mx-1" />
        <ToolbarBtn onClick={insertHr} title="Trennlinie">
          &mdash;
        </ToolbarBtn>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="min-h-[80px] max-h-[240px] overflow-y-auto px-3 py-2 text-[13px] text-gray-900 leading-relaxed outline-none focus:ring-2 focus:ring-indigo-100"
        dangerouslySetInnerHTML={{ __html: value }}
        data-placeholder={placeholder}
      />
    </div>
  );
}

function ToolbarBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded flex items-center justify-center text-xs text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
    >
      {children}
    </button>
  );
}
