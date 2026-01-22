import { useState } from 'react';
import { Folder, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const TreeNode = ({ node, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();
  const isFolder = node.children && Object.keys(node.children).length > 0;
  const isActive = !isFolder && location.pathname === `/wiki/${node.slug}`;

  return (
    <div className="select-none font-sans text-sm"> {/* Police Sans-serif ici aussi */}
      <div 
        className={`
          flex items-center cursor-pointer py-1.5 pr-2 mx-2 rounded-md transition-all duration-200
          ${isActive 
            ? 'bg-wiki-accent/10 text-wiki-accent font-medium' 
            : 'text-wiki-muted hover:bg-wiki-surface hover:text-wiki-text'
          }
        `}
        style={{ paddingLeft: `${level * 12 + 8}px` }} // indentation ajustée
        onClick={() => isFolder && setIsOpen(!isOpen)}
      >
        <span className="mr-1.5 opacity-50 w-4 transition-transform">
          {isFolder && (isOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>)}
        </span>
        <span className="mr-2 opacity-80">
          {isFolder ? <Folder size={15} className="text-blue-400"/> : <FileText size={15} />}
        </span>
        {isFolder ? (
          <span className="font-medium tracking-tight">{node.name}</span>
        ) : (
          <Link to={`/wiki/${node.slug}`} className="block w-full truncate">{node.name}</Link>
        )}
      </div>
      {isFolder && isOpen && (
        <div className="border-l border-wiki-border ml-[19px] my-1">
          {Object.values(node.children).map((child) => (
            <TreeNode key={child.name} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function FileTree({ posts }) {
  // ... (Garder la même fonction buildTree que précédemment)
  // Je la remets brièvement pour que le copier-coller fonctionne direct :
  const buildTree = (posts) => {
    const tree = { name: 'Library', children: {} };
    if(!posts) return tree;
    posts.forEach(post => {
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

  return <TreeNode node={buildTree(posts)} />;
}