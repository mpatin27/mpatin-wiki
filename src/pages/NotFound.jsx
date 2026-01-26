import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Terminal, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  
  // État pour les lignes affichées
  const [lines, setLines] = useState([]);
  // État pour afficher le contenu final (boutons)
  const [showContent, setShowContent] = useState(false);

  // Les logs à afficher
  const logsData = [
    { text: "> initializing_search_protocol...", color: "text-wiki-muted" },
    { text: "> scanning_database_sectors...", color: "text-wiki-muted" },
    { text: "> error: target_object_not_found", color: "text-red-400" },
    { text: "> status: 404_CRITICAL_FAILURE", color: "text-red-500 font-bold" },
    { text: "> suggestion: return_to_base", color: "text-wiki-accent" },
  ];

  useEffect(() => {
    let isMounted = true;

    const typeWriter = async () => {
      // Pour chaque ligne de log...
      for (const log of logsData) {
        if (!isMounted) break;

        // 1. On ajoute la ligne vide
        setLines(prev => [...prev, { ...log, text: '' }]);

        // 2. On tape lettre par lettre
        const fullText = log.text;
        for (let i = 0; i < fullText.length; i++) {
          if (!isMounted) break;
          
          // Petite pause aléatoire pour faire "humain/machine" (entre 10ms et 30ms) -> TRÈS RAPIDE
          await new Promise(r => setTimeout(r, Math.random() * 20 + 10));

          setLines(prev => {
            const newLines = [...prev];
            const lastIndex = newLines.length - 1;
            // On met à jour seulement la dernière ligne
            newLines[lastIndex] = { 
              ...newLines[lastIndex], 
              text: fullText.slice(0, i + 1) 
            };
            return newLines;
          });
        }
        
        // Pause entre les lignes (100ms) -> RAPIDE
        await new Promise(r => setTimeout(r, 100));
      }

      // Une fois tout fini, on affiche les boutons
      if (isMounted) setShowContent(true);
    };

    typeWriter();

    return () => { isMounted = false; };
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 relative overflow-hidden animate-enter">
      
      {/* 404 EN FOND */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 select-none">
        <span className="text-[20rem] font-black text-wiki-text">404</span>
      </div>

      <div className="relative z-10 max-w-lg w-full">
        
        {/* BOITE TERMINAL */}
        <div className="bg-[#0f172a] border border-wiki-border rounded-xl shadow-2xl overflow-hidden font-mono text-sm mb-8">
          
          {/* HEADER */}
          <div className="bg-wiki-surface border-b border-wiki-border p-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            <div className="flex-1 text-center text-xs text-wiki-muted flex items-center justify-center gap-1">
              <Terminal size={12} /> system_error.log
            </div>
          </div>

          {/* CONTENU */}
          <div className="p-6 h-48 flex flex-col justify-end"> {/* 'justify-end' garde le texte en bas */}
            <div className="space-y-1">
              {lines.map((line, i) => (
                <div key={i} className={`${line.color} break-words`}>
                  {line.text}
                  {/* Curseur uniquement sur la dernière ligne active si l'animation n'est pas finie */}
                  {i === lines.length - 1 && !showContent && (
                    <span className="inline-block w-2 h-4 bg-wiki-accent animate-pulse align-middle ml-1"/>
                  )}
                </div>
              ))}
              {/* Curseur final stable */}
              {showContent && (
                 <div className="text-wiki-muted animate-pulse">_</div>
              )}
            </div>
          </div>
        </div>

        {/* MESSAGE HUMAIN + BOUTONS (Apparition conditionnelle) */}
        {showContent && (
          <div className="text-center space-y-6 animate-enter">
            <h2 className="text-2xl font-bold text-wiki-text flex items-center justify-center gap-2">
              <AlertTriangle className="text-orange-500" /> Page introuvable
            </h2>
            <p className="text-wiki-muted">
              L'article que vous cherchez a peut-être été supprimé, déplacé, ou n'a jamais existé.
            </p>

            <div className="flex items-center justify-center gap-4">
              <button 
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 rounded-lg border border-wiki-border text-wiki-text hover:bg-wiki-surface transition-colors flex items-center gap-2 font-medium"
              >
                <ArrowLeft size={18} /> Retour
              </button>

              <Link 
                to="/"
                className="px-5 py-2.5 rounded-lg bg-wiki-accent text-white hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2 font-bold"
              >
                <Home size={18} /> Accueil
              </Link>
            </div>
            
            <div className="pt-4">
              <p className="text-xs text-wiki-muted">
                Ou essayez de rechercher avec <kbd className="bg-wiki-surface border border-wiki-border px-1.5 py-0.5 rounded text-wiki-text font-mono mx-1">CTRL+K</kbd>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}