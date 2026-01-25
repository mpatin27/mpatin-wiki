import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

export default function Mermaid({ chart }) {
  const containerRef = useRef(null);
  const [svg, setSvg] = useState('');

  useEffect(() => {
    mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart)
      .then(({ svg }) => setSvg(svg))
      .catch((error) => console.error("Erreur Mermaid:", error));
  }, [chart]);

  return (
    <div className="flex justify-center my-6 bg-wiki-surface/30 p-4 rounded-xl border border-wiki-border overflow-x-auto">
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}