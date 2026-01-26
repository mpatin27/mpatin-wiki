// Petit composant de base : un bloc gris qui pulse
export function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse bg-wiki-border/30 rounded-lg ${className}`} />
  );
}

// Le squelette complet d'un article
export function ArticleSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10">
      
      {/* HEADER SKELETON */}
      <div className="mb-8 pb-6 border-b border-wiki-border space-y-4">
        
        {/* Breadcrumb et Badge */}
        <div className="flex gap-2">
           <Skeleton className="h-6 w-24" />
           <Skeleton className="h-6 w-32" />
        </div>

        {/* Titre (Gros bloc) */}
        <div className="flex justify-between items-start">
            <div className="space-y-2 w-full max-w-2xl">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-10 w-1/2" />
            </div>
            {/* Boutons d'actions */}
            <div className="flex gap-2">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-24 hidden sm:block" />
            </div>
        </div>

        {/* Métadonnées (Date, Temps lecture...) */}
        <div className="flex gap-4 pt-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
        </div>
      </div>

      {/* CONTENU SKELETON (Simulation de paragraphes) */}
      <div className="space-y-6 max-w-4xl">
        {/* Paragraphe 1 */}
        <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[95%]" />
            <Skeleton className="h-4 w-[80%]" />
        </div>

        {/* Fausse Image ou Code Block */}
        <Skeleton className="h-48 w-full rounded-xl" />

        {/* Paragraphe 2 */}
        <div className="space-y-3">
            <Skeleton className="h-4 w-[85%]" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[92%]" />
        </div>
      </div>

    </div>
  );
}