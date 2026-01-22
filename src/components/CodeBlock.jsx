import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';

export default function CodeBlock({ language, value }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group my-4 rounded-xl overflow-hidden border border-wiki-border bg-[#0b101b]">
            {/* Header du bloc de code (Mac Style) */}
            <div className="flex items-center justify-between px-4 py-2 bg-wiki-surface/50 border-b border-wiki-border/50">
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
                <div className="text-[10px] uppercase font-bold text-wiki-muted tracking-wider">
                    {language || 'text'}
                </div>
                <button
                    onClick={handleCopy}
                    className="text-wiki-muted hover:text-wiki-accent transition-colors"
                    title="Copier le code"
                >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
            </div>

            <SyntaxHighlighter
                language={language}
                style={oneDark}
                customStyle={{ margin: 0, background: 'transparent', padding: '1.5rem', fontSize: '0.85rem' }}
                wrapLongLines={true}
            >
                {value}
            </SyntaxHighlighter>
        </div>
    );
}