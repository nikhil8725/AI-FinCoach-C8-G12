import { Modal } from '../ui/Modal'
import { BottomSheet } from '../ui/BottomSheet'
import { AddGoalForm } from './AddGoalForm'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import type { GoalCreate } from '../../types/api'

interface AddGoalPanelProps {
  open: boolean
  onClose: () => void
  onCreate: (goal: GoalCreate) => void
  submitting: boolean
}

export function AddGoalPanel({ open, onClose, onCreate, submitting }: AddGoalPanelProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const content = <AddGoalForm onCancel={onClose} onCreate={onCreate} submitting={submitting} />

  if (isDesktop) {
    return (
      <Modal open={open} onClose={onClose}>
        {content}
      </Modal>
    )
  }
  return (
    <BottomSheet open={open} onClose={onClose}>
      {content}
    </BottomSheet>
  )
}
