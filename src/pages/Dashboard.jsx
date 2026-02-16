import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, FileText, Users, MessageSquare, Eye, TrendingUp, Loader2, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalViews: 0,
    totalUsers: 0,
    totalComments: 0
  });
  const [topPosts, setTopPosts] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Récupérer les articles (pour stats + graph)
    const { data: posts } = await supabase
      .from('wiki_posts')
      .select('id, title, views, created_at')
      .order('views', { ascending: false });

    // 2. Récupérer nombre utilisateurs
    const { count: userCount, data: users } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);

    // 3. Récupérer nombre commentaires
    const { count: commentCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact' });

    if (posts) {
      const totalViews = posts.reduce((acc, curr) => acc + (curr.views || 0), 0);
      
      setStats({
        totalPosts: posts.length,
        totalViews: totalViews,
        totalUsers: userCount || 0,
        totalComments: commentCount || 0
      });

      // Top 5 pour le graph
      setTopPosts(posts.slice(0, 5).map(p => ({
        name: p.title.length > 15 ? p.title.substring(0, 15) + '...' : p.title,
        fullTitle: p.title,
        views: p.views || 0
      })));

      setRecentUsers(users || []);
    }
    setLoading(false);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-wiki-accent" size={40}/></div>;

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 animate-enter pb-20">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-wiki-text flex items-center gap-3">
          <Activity className="text-wiki-accent" /> Tableau de Bord
        </h1>
        <p className="text-wiki-muted text-sm mt-1">Vue d'ensemble des performances du Wiki OS.</p>
      </div>

      {/* 1. CARTES DE STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link to="/manager"><StatCard icon={<FileText size={20}/>} label="Articles" value={stats.totalPosts} color="text-blue-400" bg="bg-blue-500/10" border="border-blue-500/20"/></Link>
        <StatCard icon={<Eye size={20}/>} label="Vues Totales" value={stats.totalViews} color="text-green-400" bg="bg-green-500/10" border="border-green-500/20" />
        <Link to="/users"><StatCard icon={<Users size={20}/>} label="Utilisateurs" value={stats.totalUsers} color="text-purple-400" bg="bg-purple-500/10" border="border-purple-500/20" /></Link>
        <StatCard icon={<MessageSquare size={20}/>} label="Commentaires" value={stats.totalComments} color="text-orange-400" bg="bg-orange-500/10" border="border-orange-500/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 2. GRAPHIQUE (2/3 largeur) */}
        <div className="lg:col-span-2 bg-wiki-surface border border-wiki-border rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-wiki-text flex items-center gap-2">
              <TrendingUp size={18} className="text-wiki-accent"/> Top 5 Articles Populaires
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPosts}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                  itemStyle={{ color: '#60a5fa' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                  {topPosts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#1e40af'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. DERNIERS INSCRITS (1/3 largeur) */}
        <div className="bg-wiki-surface border border-wiki-border rounded-xl p-6 shadow-lg flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-wiki-text flex items-center gap-2"><Users size={18} className="text-purple-400"/> Derniers Membres</h3>
             <Link to="/users" className="text-xs text-wiki-accent hover:underline flex items-center">Voir tout <ArrowRight size={10} className="ml-1"/></Link>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
             {recentUsers.map(u => (
               <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-wiki-bg transition-colors">
                 <div className="w-8 h-8 rounded-full bg-wiki-bg border border-wiki-border flex items-center justify-center overflow-hidden shrink-0 font-bold text-xs uppercase text-wiki-muted">
                    {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : u.username?.[0]}
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="text-sm font-bold text-wiki-text truncate">{u.username}</div>
                   <div className="text-[10px] text-wiki-muted">Inscrit le {new Date(u.created_at).toLocaleDateString()}</div>
                 </div>
               </div>
             ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// Composant Carte Statistique
function StatCard({ icon, label, value, color, bg, border }) {
  return (
    <div className={`bg-wiki-surface border ${border} p-4 rounded-xl shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
      <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
        {icon}
      </div>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${bg} ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold text-wiki-muted uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-black text-wiki-text">{value}</p>
        </div>
      </div>
    </div>
  );
}