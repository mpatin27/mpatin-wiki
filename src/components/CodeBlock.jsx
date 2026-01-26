import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-wiki-border bg-[#1e1e1e] shadow-lg">
      
      {/* En-tête du bloc de code (Langage + Bouton Copier) */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#2d2d2d] border-b border-white/10 text-xs select-none">
        <span className="font-mono text-wiki-muted lowercase font-bold">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all ${
            copied 
              ? 'bg-green-500/20 text-green-400' 
              : 'text-wiki-muted hover:text-white hover:bg-white/10'
          }`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span className="font-bold">{copied ? 'Copié !' : 'Copier'}</span>
        </button>
      </div>

      {/* Le Code */}
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1.5rem',
          background: 'transparent',
          fontSize: '0.9rem',
          lineHeight: '1.5',
        }}
        wrapLines={true}
        showLineNumbers={true} // Optionnel : affiche les numéros de ligne
        lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#6c6c6c' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}