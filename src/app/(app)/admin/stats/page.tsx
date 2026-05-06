import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import StatsClient from './StatsClient'

export default async function StatsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: appUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if ((appUser as any)?.role !== 'developer') redirect('/')

  const admin = createAdminClient()

  const [incidentsRes, aiLogsRes, aiTrainingRes] = await Promise.all([
    (admin as any).from('incidents').select('status, category, device, created_at').limit(50000),
    (admin as any).from('ai_usage_logs').select('input_tokens, output_tokens, created_at').order('created_at', { ascending: false }),
    (admin as any).from('shared_documents').select('id', { count: 'exact', head: true }).eq('ai_training', true),
  ])

  const incidents = (incidentsRes.data ?? []) as any[]
  const aiLogs = (aiLogsRes.data ?? []) as any[]
  const aiTrainingDocs = aiTrainingRes.count ?? 0

  // ---- 統計集計 ----
  const statusCounts = { open: 0, in_progress: 0, closed: 0 }
  const systemMap: Record<string, number> = {}
  const categoryMap: Record<string, number> = {}
  const monthMap: Record<string, number> = {}

  for (const inc of incidents) {
    if (inc.status in statusCounts) statusCounts[inc.status as keyof typeof statusCounts]++
    if (inc.device) systemMap[inc.device] = (systemMap[inc.device] ?? 0) + 1
    if (inc.category) categoryMap[inc.category] = (categoryMap[inc.category] ?? 0) + 1
    const d = new Date(inc.created_at)
    const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap[key] = (monthMap[key] ?? 0) + 1
  }

  const now = new Date()
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`
    return { month: key, count: monthMap[key] ?? 0 }
  })

  const systemData = Object.entries(systemMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  const categoryData = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  // ---- AI集計 ----
  const nowMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  let monthCalls = 0, monthInput = 0, monthOutput = 0
  const dailyMap: Record<string, number> = {}

  for (const log of aiLogs) {
    const d = new Date(log.created_at)
    const logMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (logMonth === nowMonthKey) {
      monthCalls++
      monthInput += log.input_tokens
      monthOutput += log.output_tokens
    }
    const dayKey = d.toISOString().split('T')[0]
    dailyMap[dayKey] = (dailyMap[dayKey] ?? 0) + 1
  }

  const aiDailyData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (13 - i))
    const key = d.toISOString().split('T')[0]
    return { date: key.slice(5), calls: dailyMap[key] ?? 0 }
  })

  const estimatedCostUsd = (monthInput / 1_000_000 * 0.80) + (monthOutput / 1_000_000 * 4.00)

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">統計・AI管理</h1>
      <StatsClient
        totalIncidents={incidents.length}
        statusCounts={statusCounts}
        monthlyData={monthlyData}
        systemData={systemData}
        categoryData={categoryData}
        aiMonthStats={{ calls: monthCalls, inputTokens: monthInput, outputTokens: monthOutput, estimatedCostUsd }}
        aiDailyData={aiDailyData}
        aiTrainingDocs={aiTrainingDocs}
        totalAiCalls={aiLogs.length}
      />
    </div>
  )
}
