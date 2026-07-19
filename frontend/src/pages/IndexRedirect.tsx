import { Navigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'

interface AnalyzeLatest {
  status: string | null
  health_score: number | null
  has_documents: boolean
}

/** Skips onboarding on reload once an analysis has already completed. */
export function IndexRedirect() {
  const { data, loading } = useApi<AnalyzeLatest>(() => api.get('/analyze/latest'), [])

  if (loading) return null
  if (data?.status === 'complete') return <Navigate to="/dashboard" replace />
  return <Navigate to="/onboarding" replace />
}
