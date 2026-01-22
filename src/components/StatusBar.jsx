import { GitBranch, Check, Bell } from 'lucide-react';

export default function StatusBar({ postCount }) {
  return (
    <div className="h-6 bg-wiki-accent/10 border-t border-wiki-accent/20 flex items-center justify-between px-3 text-[10px] font-sans text-wiki-accent select-none z-30">
      
      {/* Partie Gauche */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
          <GitBranch size={10} />
          <span className="font-bold">main*</span>
        </div>
        <div className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
          <Check size={10} />
          <span>0 Errors</span>
        </div>
        <div className="hidden sm:block opacity-70">
          {postCount} Articles Indexed
        </div>
      </div>

      {/* Partie Droite */}
      <div className="flex items-center gap-4 opacity-80">
        <span className="hover:text-white cursor-pointer">Ln 12, Col 34</span>
        <span className="hover:text-white cursor-pointer">UTF-8</span>
        <span className="hover:text-white cursor-pointer">React</span>
        <div className="flex items-center gap-1 hover:text-white cursor-pointer">
          <Bell size={10} />
        </div>
      </div>
    </div>
  );
}