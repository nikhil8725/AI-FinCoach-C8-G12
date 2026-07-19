import type { ReactNode } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  width?: string
}

interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>
  rows: T[]
  keyField: (row: T) => string | number
  /** Mobile row-card renderer (merchant+amount / date+status, tap → detail sheet). */
  renderCard: (row: T) => ReactNode
  onRowClick?: (row: T) => void
  emptyLabel?: string
}

/** One table component used by Recent Activities, payment schedule, documents, and budget
 * tables: a real <table> on >=768px, stacked row-cards below it — never forked per page. */
export function DataTable<T>({
  columns,
  rows,
  keyField,
  renderCard,
  onRowClick,
  emptyLabel = 'Nothing here yet.',
}: DataTableProps<T>) {
  const isTableLayout = useMediaQuery('(min-width: 768px)')

  if (rows.length === 0) {
    return <div className="py-10 text-center text-sm font-medium text-ink-faint">{emptyLabel}</div>
  }

  if (!isTableLayout) {
    // A <button> wrapper would be invalid HTML whenever a row renders its own interactive
    // content (e.g. the budget table's cap <input>), so this is a <div> — a real button role
    // only when onRowClick is actually used to open a detail sheet.
    return (
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div
            key={keyField(row)}
            role={onRowClick ? 'button' : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onClick={() => onRowClick?.(row)}
            onKeyDown={
              onRowClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onRowClick(row)
                    }
                  }
                : undefined
            }
            className="w-full min-h-11 rounded-2xl border border-border-subtle p-4 text-left"
            style={{ cursor: onRowClick ? 'pointer' : undefined }}
          >
            {renderCard(row)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <thead>
          <tr className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
            {columns.map((col) => (
              <th
                key={col.key}
                className="pb-3 px-2"
                style={{ textAlign: col.align ?? 'left', width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={keyField(row)}
              className="border-t border-border-subtle hover:bg-bg/60 transition-colors"
              onClick={() => onRowClick?.(row)}
              style={{ cursor: onRowClick ? 'pointer' : undefined }}
            >
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-2 text-[13px]" style={{ textAlign: col.align ?? 'left' }}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
