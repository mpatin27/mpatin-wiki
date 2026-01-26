// Fonction qui transforme un titre en slug (ex: "Mon Titre" -> "mon-titre")
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Sépare les accents
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9]+/g, '-') // Remplace les caractères spéciaux par -
    .replace(/(^-|-$)/g, ''); // Supprime les - au début et à la fin
};

// Fonction principale qui remplace [[Titre]] par [Titre](/wiki/slug)
export const parseWikiLinks = (content) => {
  if (!content) return '';

  // Regex qui cherche tout ce qui est entre [[ et ]]
  const wikiLinkRegex = /\[\[(.*?)\]\]/g;

  return content.replace(wikiLinkRegex, (match, title) => {
    // Si on a [[Titre|Alias]], on gère l'alias
    const parts = title.split('|');
    const linkText = parts.length > 1 ? parts[1] : parts[0]; // Ce qu'on affiche
    const linkTarget = parts[0]; // Le vrai titre de l'article ciblé
    const slug = slugify(linkTarget);

    // On retourne un lien Markdown standard
    return `[${linkText}](/wiki/${slug})`;
  });
};