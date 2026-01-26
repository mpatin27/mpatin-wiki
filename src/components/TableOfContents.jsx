import { useEffect, useState } from 'react';
import { List } from 'lucide-react';

export default function TableOfContents({ content }) {
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState('');

  // 1. Extraire les titres du Markdown
  useEffect(() => {
    const lines = content.split('\n');
    const extracted = lines
      .filter(line => line.startsWith('#') && !line.startsWith('# ')) // On ignore le H1 (Titre principal)
      .map(line => {
        const level = line.match(/^#+/)[0].length;
        const text = line.replace(/^#+\s+/, '').replace(/\*\*/g, '').replace(/\*/g, ''); // Nettoyage gras/italique
        // Création d'un ID compatible (slugify simple)
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        
        return { text, level, id };
      });
    setHeadings(extracted);
  }, [content]);

  // 2. Détecter le scroll (Scroll Spy)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        root: document.getElementById('main-content'), // IMPORTANT: On observe le scroll du conteneur principal
        rootMargin: '0px 0px -80% 0px', // On active quand le titre est en haut de page
        threshold: 0.1,
      }
    );

    // On observe tous les titres H2 et H3
    const elements = document.querySelectorAll('h2, h3');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [headings]);

  const handleClick = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    const container = document.getElementById('main-content');
    
    if (element && container) {
      // Calculer la position relative pour scroller dans le conteneur
      const topPos = element.offsetTop - 100; // -100 pour laisser de la marge
      container.scrollTo({
        top: topPos,
        behavior: 'smooth'
      });
      // Fallback pour mise à jour immédiate
      setActiveId(id);
    }
  };

  if (headings.length === 0) return null;

  return (
    <div className="hidden xl:block w-64 shrink-0 pl-8 sticky top-6 max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar">
      <div className="text-xs font-bold text-wiki-muted uppercase tracking-wider mb-4 flex items-center gap-2">
        <List size={14} /> Sommaire
      </div>
      <nav className="space-y-1 relative border-l border-wiki-border/50">
        {headings.map((heading, index) => (
          <a
            key={index}
            href={`#${heading.id}`}
            onClick={(e) => handleClick(e, heading.id)}
            className={`
              block text-sm py-1 pl-4 border-l-2 transition-all duration-300
              ${activeId === heading.id 
                ? 'border-wiki-accent text-wiki-accent font-bold translate-x-1' 
                : 'border-transparent text-wiki-muted hover:text-wiki-text hover:border-wiki-border'}
            `}
            style={{ 
              marginLeft: heading.level === 3 ? '1rem' : '0',
              fontSize: heading.level === 3 ? '0.8rem' : '0.875rem'
            }}
          >
            {heading.text}
          </a>
        ))}
      </nav>
    </div>
  );
}