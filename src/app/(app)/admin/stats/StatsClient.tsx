'use client'

import { useState } from 'react'

type Props = {
  totalIncidents: number
  statusCounts: { open: number; in_progress: number; closed: number }
  monthlyData: { month: string; count: number }[]
  systemData: { name: string; count: number }[]
  categoryData: { name: string; count: number }[]
  aiMonthStats: { calls: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number }
  aiDailyData: { date: string; calls: number }[]
  aiTrainingDocs: number
  totalAiCalls: number
}

function Card({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function CssBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(value > 0 ? 2 : 0, Math.round((value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-32 truncate shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded h-5 relative overflow-hidden">
        <div className={`h-5 ${color} rounded transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-700 font-medium w-8 text-right shrink-0">{value}</span>
    </div>
  )
}

export default function StatsClient({
  totalIncidents, statusCounts, monthlyData, systemData, categoryData,
  aiMonthStats, aiDailyData, aiTrainingDocs, totalAiCalls,
}: Props) {
  const [tab, setTab] = useState<'stats' | 'ai'>('stats')

  const resolutionRate = totalIncidents > 0
    ? Math.round((statusCounts.closed / totalIncidents) * 100) : 0

  const monthlyMax = Math.max(...monthlyData.map((m) => m.count), 1)
  const systemMax = systemData[0]?.count ?? 1
  const categoryMax = categoryData[0]?.count ?? 1
  const dailyMax = Math.max(...aiDailyData.map((d) => d.calls), 1)

  return (
    <div>
      {/* タブ切り替え */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {(['stats', 'ai'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm rounded-md font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'stats' ? '統計' : 'AI管理'}
          </button>
        ))}
      </div>

      {/* ===== 統計タブ ===== */}
      {tab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card label="総案件数" value={totalIncidents.toLocaleString()} />
            <Card label="未対応" value={statusCounts.open} sub="open" />
            <Card label="対応中" value={statusCounts.in_progress} sub="in_progress" />
            <Card label="解決率" value={`${resolutionRate}%`} sub={`${statusCounts.closed.toLocaleString()} 件解決`} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-700 mb-4">月別案件数（直近6ヶ月）</p>
            <div className="space-y-2">
              {monthlyData.map((m) => (
                <CssBar key={m.month} label={m.month} value={m.count} max={monthlyMax} color="bg-blue-400" />
              ))}
            </div>
          </div>

          {systemData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-700 mb-4">システム別トラブル件数（上位10件）</p>
              <div className="space-y-2">
                {systemData.map((s) => (
                  <CssBar key={s.name} label={s.name} value={s.count} max={systemMax} color="bg-orange-400" />
                ))}
              </div>
            </div>
          )}

          {categoryData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-700 mb-4">ジャンル別件数（上位10件）</p>
              <div className="space-y-2">
                {categoryData.map((c) => (
                  <CssBar key={c.name} label={c.name} value={c.count} max={categoryMax} color="bg-green-400" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== AI管理タブ ===== */}
      {tab === 'ai' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card label="今月の診断回数" value={aiMonthStats.calls} />
            <Card label="入力トークン（今月）" value={aiMonthStats.inputTokens.toLocaleString()} />
            <Card label="出力トークン（今月）" value={aiMonthStats.outputTokens.toLocaleString()} />
            <Card
              label="推定コスト（今月）"
              value={`$${aiMonthStats.estimatedCostUsd.toFixed(3)}`}
              sub="Haiku 料金"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card label="累計診断回数" value={totalAiCalls.toLocaleString()} />
            <Card label="AI診断候補データ" value={`${aiTrainingDocs} 件`} sub="共有書類（候補指定 ON）" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-700 mb-4">日別診断数（直近14日）</p>
            {aiDailyData.every((d) => d.calls === 0) ? (
              <p className="text-xs text-gray-400 text-center py-6">まだAI診断の履歴がありません</p>
            ) : (
              <div className="space-y-2">
                {aiDailyData.map((d) => (
                  <CssBar key={d.date} label={d.date} value={d.calls} max={dailyMax} color="bg-purple-400" />
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-600 mb-1">料金の目安（claude-haiku-4-5）</p>
            <p className="text-xs text-gray-500">入力: $0.80 / 1M トークン　出力: $4.00 / 1M トークン</p>
            <p className="text-xs text-gray-400 mt-1">実際の請求額は Anthropic コンソールで確認してください。</p>
          </div>
        </div>
      )}
    </div>
  )
}
