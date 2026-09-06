import React from "react";

export function DashboardSkeleton() {
  return (
    <div className="w-full space-y-6 font-space-grotesk animate-pulse">
      {/* Top Bar Header Placeholder */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-800 rounded-lg" />
          <div className="h-4 w-64 bg-slate-800/60 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-slate-800 rounded-xl" />
          <div className="h-9 w-24 bg-slate-800 rounded-xl" />
          <div className="h-9 w-24 bg-slate-800 rounded-xl" />
        </div>
      </div>

      {/* KPI Ribbon (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((idx) => (
          <div 
            key={idx} 
            className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 bg-slate-800 rounded" />
              <div className="w-8 h-8 rounded-full bg-slate-800" />
            </div>
            <div className="space-y-2">
              <div className="h-8 w-36 bg-slate-800 rounded-lg" />
              <div className="h-3 w-20 bg-slate-800/60 rounded" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <div className="w-10 h-10 rounded-full border-2 border-slate-800 border-t-slate-700 animate-spin" />
              <div className="h-3 w-24 bg-slate-800/60 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Analytical Grid (Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-5 w-40 bg-slate-800 rounded" />
            <div className="h-8 w-32 bg-slate-800 rounded-xl" />
          </div>
          <div className="h-72 w-full bg-slate-800/40 rounded-xl flex items-end p-4 gap-2">
            {[40, 65, 30, 85, 50, 95, 70, 60, 45, 80].map((h, i) => (
              <div key={i} className="flex-1 bg-slate-800 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        {/* Secondary Chart (1 col) */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="h-5 w-36 bg-slate-800 rounded" />
          <div className="h-72 w-full bg-slate-800/40 rounded-xl flex items-end justify-between p-4 gap-3">
            {[50, 70, 40, 90, 60, 80, 55].map((h, i) => (
              <div key={i} className="w-full bg-slate-800 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Operations Summary (3 Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((idx) => (
          <div key={idx} className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4">
            <div className="h-5 w-36 bg-slate-800 rounded" />
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-10 bg-slate-800/40 rounded-xl w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
