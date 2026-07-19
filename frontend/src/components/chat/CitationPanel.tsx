import { SlideOver } from '../ui/SlideOver'
import { BottomSheet } from '../ui/BottomSheet'
import { CitationDetail } from './CitationDetail'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import type { Citation } from '../../types/api'

interface CitationPanelProps {
  citation: Citation | null
  onClose: () => void
}

export function CitationPanel({ citation, onClose }: CitationPanelProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const open = citation !== null

  if (isDesktop) {
    return (
      <SlideOver open={open} onClose={onClose}>
        {citation && <CitationDetail citation={citation} onClose={onClose} />}
      </SlideOver>
    )
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      {citation && <CitationDetail citation={citation} onClose={onClose} />}
    </BottomSheet>
  )
}
