import { Fragment, useState, useEffect } from 'react';
import { Dialog, Combobox, Transition } from '@headlessui/react';
import { Search, FileText, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CommandPalette({ posts, isOpen, setIsOpen, initialSearch }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (initialSearch) setQuery(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    const onKeydown = (event) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [isOpen, setIsOpen]);

  // FONCTION INTELLIGENTE : Génère un extrait avec le mot surligné
  const getSnippet = (content, searchTerm) => {
    if (!content || !searchTerm) return null;

    const lowerContent = content.toLowerCase();
    const lowerSearch = searchTerm.toLowerCase();
    const index = lowerContent.indexOf(lowerSearch);

    if (index === -1) return null;

    // On prend 30 caractères avant et 50 après
    const start = Math.max(0, index - 30);
    const end = Math.min(content.length, index + searchTerm.length + 50);

    let snippet = content.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return (
      <span>
        {snippet.split(new RegExp(`(${searchTerm})`, 'gi')).map((part, i) =>
          part.toLowerCase() === lowerSearch ? (
            <span key={i} className="bg-yellow-500/30 text-yellow-200 font-bold px-0.5 rounded border-b border-yellow-500/50">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // LOGIQUE DE FILTRAGE (Titre + Contenu)
  const filteredPosts = query === ''
    ? []
    : posts.filter((post) => {
      return (
        post.title.toLowerCase().includes(query.toLowerCase()) ||
        post.content?.toLowerCase().includes(query.toLowerCase()) ||
        post.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
    }).slice(0, 10); // On limite à 10 résultats pour la performance

  const handleSelect = (post) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/wiki/${post.slug}`);
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={setIsOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-xl transform divide-y divide-wiki-border overflow-hidden rounded-xl bg-wiki-surface border border-wiki-border shadow-2xl transition-all">
              <Combobox onChange={handleSelect}>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-wiki-muted"
                    aria-hidden="true"
                  />
                  <Combobox.Input
                    className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-wiki-text placeholder-wiki-muted focus:ring-0 sm:text-sm outline-none"
                    placeholder="Rechercher dans le Wiki..."
                    onChange={(event) => setQuery(event.target.value)}
                    value={query}
                    autoComplete="off"
                  />
                </div>

                {filteredPosts.length > 0 && (
                  <Combobox.Options static className="max-h-96 scroll-py-3 overflow-y-auto p-3 custom-scrollbar">
                    {filteredPosts.map((post) => {
                      // On calcule l'extrait ici
                      const snippet = getSnippet(post.content, query);
                      const isTitleMatch = post.title.toLowerCase().includes(query.toLowerCase());

                      return (
                        <Combobox.Option
                          key={post.id}
                          value={post}
                          className={({ active }) =>
                            `flex cursor-pointer select-none rounded-xl p-3 transition-colors ${active ? 'bg-wiki-accent/10' : ''
                            }`
                          }
                        >
                          {({ active }) => (
                            <div className="flex items-start gap-3 w-full overflow-hidden">
                              <div className={`mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-lg border ${active ? 'border-wiki-accent/30 bg-wiki-accent/20' : 'border-wiki-border bg-wiki-bg'}`}>
                                <FileText className={`h-4 w-4 ${active ? 'text-wiki-accent' : 'text-wiki-muted'}`} />
                              </div>

                              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                {/* TITRE */}
                                <span className={`truncate text-sm font-bold ${active ? 'text-wiki-text' : 'text-wiki-text/80'}`}>
                                  {isTitleMatch ? (
                                    /* Surlignage dans le titre aussi */
                                    <span>
                                      {post.title.split(new RegExp(`(${query})`, 'gi')).map((part, i) =>
                                        part.toLowerCase() === query.toLowerCase() ? <span key={i} className="text-wiki-accent">{part}</span> : part
                                      )}
                                    </span>
                                  ) : post.title}
                                </span>

                                {/* CHEMIN DU DOSSIER */}
                                <span className="text-[10px] text-wiki-muted font-mono flex items-center gap-1">
                                  {post.folder}
                                  {post.tags && post.tags.length > 0 && (
                                    <>
                                      <span className="text-wiki-border mx-1">|</span>
                                      <Hash size={8} /> {post.tags.slice(0, 2).join(', ')}
                                    </>
                                  )}
                                </span>

                                {/* EXTRAIT DE CONTENU (SNIPPET) */}
                                {snippet && !isTitleMatch && (
                                  <div className="mt-1 text-xs text-wiki-muted/70 italic truncate border-l-2 border-wiki-border pl-2">
                                    {snippet}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Combobox.Option>
                      );
                    })}
                  </Combobox.Options>
                )}

                {query !== '' && filteredPosts.length === 0 && (
                  <div className="py-14 px-6 text-center text-sm sm:px-14">
                    <FileText className="mx-auto h-6 w-6 text-wiki-muted mb-2 opacity-50" />
                    <p className="font-semibold text-wiki-text">Aucun résultat.</p>
                    <p className="text-wiki-muted mt-1">Essayez un autre mot-clé ou créez un nouvel article.</p>
                  </div>
                )}

                {query === '' && (
                  <div className="py-10 px-6 text-center text-xs text-wiki-muted">
                    <div className="inline-flex items-center gap-1 border border-wiki-border px-2 py-1 rounded mx-1 bg-wiki-bg"><span className="text-xs">CTRL</span><span>K</span></div>
                    pour ouvrir,
                    <div className="inline-flex items-center gap-1 border border-wiki-border px-2 py-1 rounded mx-1 bg-wiki-bg"><span>↑</span><span>↓</span></div>
                    pour naviguer.
                  </div>
                )}
              </Combobox>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}