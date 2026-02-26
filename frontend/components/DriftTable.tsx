"use client";

import { useState } from "react";
import { AllocationItem, formatCurrency } from "@/lib/api";

function DriftBadge({ drift, flagged }: { drift: number; flagged: boolean }) {
  const pct = drift * 100;
  const sign = pct > 0 ? "+" : "";
  const abs = Math.abs(pct);

  if (!flagged && abs < 3) {
    return (
      <span className="text-xs font-medium text-[#9CA3AF]">
        {sign}{pct.toFixed(1)}%
      </span>
    );
  }
  if (flagged) {
    const color = abs > 15 ? "text-red-400 bg-red-900/20" : "text-[#F59E0B] bg-[#F59E0B]/10";
    return (
      <span className={`text-xs font-semibold rounded px-1.5 py-0.5 ${color}`}>
        {sign}{pct.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-[#9CA3AF]">
      {sign}{pct.toFixed(1)}%
    </span>
  );
}

interface DriftTableProps {
  allocations: AllocationItem[];
}

export default function DriftTable({ allocations }: DriftTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-[#2A2A2A]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2A2A2A] bg-[#111111]">
            <th className="text-left px-4 py-3 text-xs font-medium text-[#9CA3AF] uppercase tracking-wide">Asset Class</th>
            <th className="text-right px-3 py-3 text-xs font-medium text-[#9CA3AF] uppercase tracking-wide">Target</th>
            <th className="text-right px-3 py-3 text-xs font-medium text-[#9CA3AF] uppercase tracking-wide">Actual</th>
            <th className="text-right px-3 py-3 text-xs font-medium text-[#9CA3AF] uppercase tracking-wide">Drift</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-[#9CA3AF] uppercase tracking-wide hidden sm:table-cell">Value</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((row) => {
            const isHovered = hoveredRow === row.asset_class;
            return (
              <tr
                key={row.asset_class}
                onMouseEnter={() => setHoveredRow(row.asset_class)}
                onMouseLeave={() => setHoveredRow(null)}
                className={`border-b border-[#2A2A2A] last:border-0 transition-colors ${
                  isHovered ? "bg-[#1A1A1A]" : ""
                } ${row.flagged ? "bg-[#F59E0B]/5" : ""}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {row.flagged && <span className="text-[#F59E0B] text-xs">⚑</span>}
                    <span className={`font-medium ${row.flagged ? "text-white" : "text-[#9CA3AF]"}`}>
                      {row.display_name}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-[#9CA3AF] text-xs">
                  {row.target_pct > 0 ? `${(row.target_pct * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="px-3 py-3 text-right text-white text-xs font-medium">
                  {(row.actual_pct * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <DriftBadge drift={row.drift_pct} flagged={row.flagged} />
                    {isHovered && row.flagged && (
                      <span className="text-xs text-[#9CA3AF] whitespace-nowrap">
                        ~{formatCurrency(Math.abs(row.trade_estimate))} to rebalance
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-[#9CA3AF] text-xs hidden sm:table-cell">
                  {formatCurrency(row.actual_value)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
