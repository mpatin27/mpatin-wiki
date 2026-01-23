import { useState } from 'react';
import { Folder, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const TreeNode = ({ node, level = 0, onNavigate }) => {
  // Par défaut, on ouvre les dossiers au premier niveau (level 0), on ferme les autres
  const [isOpen, setIsOpen] = useState(level === 0);
  const location = useLocation();
  
  // Si children est null ou vide, c'est un fichier
  const isFolder = node.children && Object.keys(node.children).length > 0;
  const isActive = !isFolder && location.pathname === `/wiki/${node.slug}`;

  const handleClick = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    } else {
      if (onNavigate) onNavigate();
    }
  };

  return (
    <div className="select-none font-sans text-sm">
      <div 
        className={`
          flex items-center cursor-pointer py-1.5 pr-2 mx-2 rounded-md transition-all duration-200
          ${isActive 
            ? 'bg-wiki-accent/10 text-wiki-accent font-medium' 
            : 'text-wiki-muted hover:bg-wiki-surface hover:text-wiki-text'
          }
        `}
        // On réduit un peu le padding vu qu'on a plus le dossier racine "Library"
        style={{ paddingLeft: `${level * 12 + 4}px` }} 
        onClick={handleClick}
      >
        <span className="mr-1.5 opacity-50 w-4 transition-transform flex justify-center">
          {isFolder && (isOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>)}
        </span>
        <span className="mr-2 opacity-80 shrink-0">
          {isFolder ? <Folder size={15} className="text-blue-400"/> : <FileText size={15} />}
        </span>
        {isFolder ? (
          <span className="font-medium tracking-tight truncate">{node.name}</span>
        ) : (
          <Link to={`/wiki/${node.slug}`} className="block w-full truncate">
            {node.name}
          </Link>
        )}
      </div>
      {isFolder && isOpen && (
        <div className="border-l border-wiki-border ml-[15px] my-1">
          {/* On trie : Dossiers d'abord, puis fichiers par ordre alphabétique */}
          {Object.values(node.children)
            .sort((a, b) => {
              const aIsFolder = a.children && Object.keys(a.children).length > 0;
              const bIsFolder = b.children && Object.keys(b.children).length > 0;
              if (aIsFolder === bIsFolder) return a.name.localeCompare(b.name);
              return aIsFolder ? -1 : 1;
            })
            .map((child) => (
              <TreeNode key={child.name} node={child} level={level + 1} onNavigate={onNavigate} />
            ))}
        </div>
      )}
    </div>
  );
};

export default function FileTree({ posts, onNavigate }) {
  const buildTree = (posts) => {
    // On appelle la racine "root" (nom interne, ne sera pas affiché)
    const tree = { name: 'root', children: {} };
    if(!posts) return tree;
    
    posts.forEach(post => {
      // Si pas de dossier, on met dans "General"
      const parts = (post.folder || 'General').split('/');
      let current = tree;
      
      parts.forEach(part => {
        if (!current.children[part]) current.children[part] = { name: part, children: {} };
        current = current.children[part];
      });
      
      current.children[post.slug] = { ...post, name: post.title, children: null };
    });
    return tree;
  };

  const rootNode = buildTree(posts);

  // MODIFICATION ICI : Au lieu d'afficher rootNode, on affiche ses enfants directs
  return (
    <div className="mt-2">
      {Object.values(rootNode.children)
        .sort((a, b) => a.name.localeCompare(b.name)) // Tri alphabétique des dossiers racines
        .map((child) => (
          <TreeNode key={child.name} node={child} level={0} onNavigate={onNavigate} />
        ))}
    </div>
  );
}