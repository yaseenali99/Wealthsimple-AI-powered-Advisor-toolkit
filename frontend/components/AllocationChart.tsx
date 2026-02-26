"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { AllocationItem } from "@/lib/api";

const ASSET_CLASS_COLORS: Record<string, string> = {
  us_equity:        "#3B82F6",  // blue
  canadian_equity:  "#00C05A",  // ws-green
  intl_equity:      "#A855F7",  // purple
  canadian_bond:    "#F59E0B",  // amber
  global_bond:      "#F97316",  // orange
  cash:             "#6B7280",  // gray
  real_estate:      "#EC4899",  // pink
  alternative:      "#6366F1",  // indigo
};

const DEFAULT_COLOR = "#4B5563";

type Mode = "current" | "target";

interface AllocationChartProps {
  allocations: AllocationItem[];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: AllocationItem }> }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const data = item.payload;
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold text-white mb-1">{data.display_name}</p>
      <p className="text-[#9CA3AF]">Current: {(data.actual_pct * 100).toFixed(1)}%</p>
      <p className="text-[#9CA3AF]">Target: {(data.target_pct * 100).toFixed(1)}%</p>
      {data.flagged && (
        <p className="text-[#F59E0B] mt-1">
          {data.drift_pct > 0 ? "+" : ""}{(data.drift_pct * 100).toFixed(1)}% drift ⚑
        </p>
      )}
    </div>
  );
};

export default function AllocationChart({ allocations }: AllocationChartProps) {
  const [mode, setMode] = useState<Mode>("current");

  const nonZeroActual = allocations.filter((a) => a.actual_pct > 0);
  const nonZeroTarget = allocations.filter((a) => a.target_pct > 0);

  const currentData = nonZeroActual.map((a) => ({
    ...a,
    value: parseFloat((a.actual_pct * 100).toFixed(1)),
    name: a.display_name,
  }));

  const targetData = nonZeroTarget.map((a) => ({
    ...a,
    value: parseFloat((a.target_pct * 100).toFixed(1)),
    name: a.display_name,
  }));

  const displayData = mode === "current" ? currentData : targetData;

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center gap-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-1 w-fit">
        {(["current", "target"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all capitalize ${
              mode === m
                ? "bg-[#2A2A2A] text-white"
                : "text-[#9CA3AF] hover:text-white"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {displayData.map((entry) => (
                <Cell
                  key={entry.asset_class}
                  fill={ASSET_CLASS_COLORS[entry.asset_class] ?? DEFAULT_COLOR}
                  opacity={entry.flagged && mode === "current" ? 1 : 0.85}
                />
              ))}
            </Pie>
            {/* Show target ring when in current mode */}
            {mode === "current" && (
              <Pie
                data={targetData}
                cx="50%"
                cy="50%"
                innerRadius={95}
                outerRadius={105}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {targetData.map((entry) => (
                  <Cell
                    key={entry.asset_class}
                    fill={ASSET_CLASS_COLORS[entry.asset_class] ?? DEFAULT_COLOR}
                    opacity={0.35}
                  />
                ))}
              </Pie>
            )}
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-1.5">
        {nonZeroActual.map((a) => (
          <div key={a.asset_class} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: ASSET_CLASS_COLORS[a.asset_class] ?? DEFAULT_COLOR }}
            />
            <span className="text-xs text-[#9CA3AF] truncate">{a.display_name}</span>
            <span className="text-xs text-white ml-auto shrink-0">
              {(a.actual_pct * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {mode === "current" && (
        <p className="text-xs text-[#9CA3AF]">
          Outer ring = target allocation
        </p>
      )}
    </div>
  );
}
