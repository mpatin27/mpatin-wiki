import { Bold, Italic, Heading1, Heading2, Code, Link as LinkIcon, List, Quote } from 'lucide-react';

export default function EditorToolbar({ onInsert }) {
  
  const tools = [
    { icon: <Heading1 size={18} />, label: 'H1', action: () => onInsert('# ', '') },
    { icon: <Heading2 size={18} />, label: 'H2', action: () => onInsert('## ', '') },
    { icon: <Bold size={18} />, label: 'Gras', action: () => onInsert('**', '**') },
    { icon: <Italic size={18} />, label: 'Italique', action: () => onInsert('*', '*') },
    { icon: <Code size={18} />, label: 'Code', action: () => onInsert('`', '`') },
    { icon: <div className="font-mono text-xs font-bold">{}</div>, label: 'Bloc Code', action: () => onInsert('\n```language\n', '\n```\n') },
    { icon: <LinkIcon size={18} />, label: 'Lien', action: () => onInsert('[', '](url)') },
    { icon: <List size={18} />, label: 'Liste', action: () => onInsert('- ', '') },
    { icon: <Quote size={18} />, label: 'Citation', action: () => onInsert('> ', '') },
  ];

  return (
    <div className="flex items-center gap-1 p-2 border-b border-wiki-border bg-wiki-surface/50 overflow-x-auto">
      {tools.map((tool, i) => (
        <button
          key={i}
          onClick={(e) => { e.preventDefault(); tool.action(); }}
          className="p-1.5 text-wiki-muted hover:text-wiki-accent hover:bg-wiki-accent/10 rounded transition-colors"
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
}