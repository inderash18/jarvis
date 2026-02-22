import React from "react";

const StatPill = ({ label, value, icon: Icon, color }) => (
    <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md shadow-inner transition-all hover:bg-white/[0.05] hover:border-white/10 group">
        <div className={`p-1.5 rounded-lg bg-current/10 ${color} group-hover:scale-110 transition-transform`}>
            <Icon size={14} />
        </div>
        <div className="flex flex-col">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter leading-none mb-1">{label}</span>
            <span className={`text-sm font-mono font-black tracking-tight ${color} leading-none`}>{value}</span>
        </div>
    </div>
);

export default StatPill;
