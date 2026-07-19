import { agentColors, agentLabels, tint } from '../../theme/tokens'
import { Pill } from './Pill'

interface AgentTagProps {
  agent: keyof typeof agentColors
}

export function AgentTag({ agent }: AgentTagProps) {
  const color = agentColors[agent]
  return (
    <Pill color={color} tint={tint(color, 0.1)}>
      {agentLabels[agent]}
    </Pill>
  )
}
