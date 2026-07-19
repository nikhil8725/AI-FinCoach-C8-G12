import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { UploadDropzone } from '../components/onboarding/UploadDropzone'
import { UploadedFilesList } from '../components/onboarding/UploadedFilesList'
import { AgentIntroCards } from '../components/onboarding/AgentIntroCards'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { api } from '../lib/api'
import type { DocumentOut, DocumentUploadResponse } from '../types/api'

export function OnboardingPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const { data: documents, refetch } = useApi<DocumentOut[]>(() => api.get('/documents'), [])

  const handleFiles = async (files: File[]) => {
    setBusy(true)
    try {
      for (const file of files) {
        await api.upload<DocumentUploadResponse>('/documents', file)
      }
      refetch()
    } catch {
      showToast('Upload failed. Please try a different file.')
    } finally {
      setBusy(false)
    }
  }

  const handleSample = async () => {
    setBusy(true)
    try {
      await api.post('/documents/sample')
      navigate('/orchestration', { state: { autostart: true } })
    } catch {
      showToast('Could not load sample data.')
      setBusy(false)
    }
  }

  const hasDocuments = (documents?.length ?? 0) > 0

  return (
    <section className="animate-fc-in flex flex-col gap-6">
      <Card className="bg-gradient-to-br from-white to-[#FBFBFC] !p-11">
        <div className="mb-4 inline-flex items-center gap-2 rounded-xl bg-brand/10 px-3.5 py-1.5 text-xs font-semibold text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Multi-agent financial coach
        </div>
        <h2 className="m-0 text-3xl font-bold leading-tight tracking-tight sm:text-[42px]">
          Meet your AI money team.
        </h2>
        <p className="mt-3.5 max-w-xl text-base font-medium text-ink-soft sm:text-[17px]">
          Upload your statements. Four specialist agents build your plan — a live dashboard, a
          debt payoff strategy, a savings roadmap, and a budget review.
        </p>

        <div className="mt-8 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1.3fr_1fr]">
          <UploadDropzone onFiles={handleFiles} onSample={handleSample} busy={busy} />
          <UploadedFilesList documents={documents ?? []} />
        </div>

        {hasDocuments && (
          <div className="mt-6 flex justify-end">
            <Button variant="dark" onClick={() => navigate('/orchestration', { state: { autostart: true } })}>
              <Sparkles size={16} className="text-brand-light" />
              Run analysis
            </Button>
          </div>
        )}
      </Card>

      <AgentIntroCards />
    </section>
  )
}
