import { useEffect, useState } from 'react';

export default function TableOfContents({ content }) {
  const [headings, setHeadings] = useState([]);

  useEffect(() => {
    // Regex pour trouver les lignes commençant par ## ou ###
    const regex = /^(#{2,3})\s+(.*)$/gm;
    const found = [];
    let match;
    
    // On extrait tous les titres
    while ((match = regex.exec(content)) !== null) {
      const level = match[1].length; // 2 pour h2, 3 pour h3
      const text = match[2];
      // On génère un ID simple (ex: "Mon Titre" -> "mon-titre")
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      found.push({ text, id, level });
    }
    setHeadings(found);
  }, [content]);

  if (headings.length === 0) return null;

  return (
    <div className="hidden xl:block w-64 shrink-0 order-last ml-8">
      <div className="sticky top-24 border-l border-wiki-border pl-4">
        <h4 className="text-xs font-bold text-wiki-muted uppercase mb-3 tracking-wider">
          Sur cette page
        </h4>
        <ul className="space-y-2 text-sm">
          {headings.map((heading, index) => (
            <li key={index} style={{ marginLeft: (heading.level - 2) * 12 }}>
              <a 
                href={`#${heading.id}`} 
                className="text-wiki-muted hover:text-wiki-accent transition-colors block py-0.5 truncate"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}