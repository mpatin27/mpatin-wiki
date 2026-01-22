import { useState, useEffect } from 'react';

export default function TerminalFooter() {
  const [logs, setLogs] = useState([{ time: 'INIT', msg: 'System mounting...' }]);

  useEffect(() => {
    const timer = setInterval(() => {
      if(Math.random() > 0.9) setLogs(prev => [...prev.slice(-3), { time: 'SYS', msg: 'Idle check OK' }]);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-24 bg-black border-t border-green-900 p-2 font-mono text-[10px] flex flex-col opacity-80">
      <div className="flex-1 overflow-y-auto">
        {logs.map((l, i) => (
          <div key={i}><span className="text-blue-500">[{l.time}]</span> <span className="text-green-600">{l.msg}</span></div>
        ))}
        <div className="animate-pulse text-green-500">root@wiki:~$ _</div>
      </div>
    </div>
  );
}