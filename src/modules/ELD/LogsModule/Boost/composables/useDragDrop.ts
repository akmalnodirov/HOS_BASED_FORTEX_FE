import { ref } from 'vue'

export interface LocationTransfer {
  locationOrigin?: number | null
  calculatedLocation?: string | null
  manualLocation?: string | null
  latitude?: number | null
  longitude?: number | null
}

export type DragColumnType = 'location' | 'odometer' | 'engine_hours' | 'trailer' | 'doc'

export interface DragPayload {
  column: DragColumnType
  sourceEventId: string
  data: LocationTransfer | number | string | null
}

export function useDragDrop(
  onDropCallback: (column: DragColumnType, targetEventId: string, data: DragPayload['data']) => void
) {
  const isDragging = ref(false)
  let activeDrag: DragPayload | null = null

  function getCell(event: DragEvent): HTMLElement | null {
    const el = event.target
    if (!(el instanceof Element)) return null
    return el.closest<HTMLElement>('[data-draggable="true"]')
  }

  function getEventId(cell: HTMLElement) {
    return cell.closest<HTMLElement>('[data-event-id]')?.dataset.eventId ?? null
  }

  function handleDragStart(event: DragEvent) {
    const cell = getCell(event)
    if (!cell) return

    const column = cell.dataset.column as DragColumnType
    const sourceEventId = getEventId(cell)
    if (!column || !sourceEventId) return

    const data = JSON.parse(cell.dataset.payload ?? 'null') as DragPayload['data']

    activeDrag = { column, sourceEventId, data }
    event.dataTransfer!.setData('application/json', JSON.stringify(activeDrag))
    event.dataTransfer!.effectAllowed = 'copy'

    isDragging.value = true
    cell.classList.add('dd-dragging')
  }

  function handleDragEnd(event: DragEvent) {
    const cell = getCell(event)
    cell?.classList.remove('dd-dragging')
    document.querySelectorAll('.dd-over').forEach((el) => el.classList.remove('dd-over'))
    isDragging.value = false
    activeDrag = null
  }

  function handleDragOver(event: DragEvent) {
    const cell = getCell(event)
    if (!cell || !activeDrag) return
    if (cell.dataset.column !== activeDrag.column) return

    event.preventDefault()
    event.dataTransfer!.dropEffect = 'copy'
  }

  function handleDragEnter(event: DragEvent) {
    const cell = getCell(event)
    if (!cell || !activeDrag) return

    if (cell.dataset.column !== activeDrag.column) {
      cell.classList.add('dd-not-allowed')
      return
    }

    event.preventDefault()
    cell.classList.remove('dd-not-allowed')
    cell.classList.add('dd-over')
  }

  function handleDragLeave(event: DragEvent) {
    const cell = getCell(event)
    if (!cell) return

    if (!cell.contains(event.relatedTarget as Node)) {
      cell.classList.remove('dd-over', 'dd-not-allowed')
    }
  }

  function handleDrop(event: DragEvent) {
    const cell = getCell(event)
    if (!cell || !activeDrag) return

    const targetColumn = cell.dataset.column as DragColumnType
    const targetEventId = getEventId(cell)
    cell.classList.remove('dd-over', 'dd-not-allowed')

    if (!targetEventId || targetColumn !== activeDrag.column) return
    if (targetEventId === activeDrag.sourceEventId) return

    event.preventDefault()

    let payload = activeDrag
    try {
      const raw = event.dataTransfer!.getData('application/json')
      if (raw) payload = JSON.parse(raw)
    } catch {}

    onDropCallback(payload.column, targetEventId, payload.data)
  }

  function setup(container: HTMLElement) {
    container.addEventListener('dragstart', handleDragStart)
    container.addEventListener('dragend', handleDragEnd)
    container.addEventListener('dragover', handleDragOver)
    container.addEventListener('dragenter', handleDragEnter)
    container.addEventListener('dragleave', handleDragLeave)
    container.addEventListener('drop', handleDrop)
  }

  function cleanup(container: HTMLElement) {
    container.removeEventListener('dragstart', handleDragStart)
    container.removeEventListener('dragend', handleDragEnd)
    container.removeEventListener('dragover', handleDragOver)
    container.removeEventListener('dragenter', handleDragEnter)
    container.removeEventListener('dragleave', handleDragLeave)
    container.removeEventListener('drop', handleDrop)
  }

  return { isDragging, setup, cleanup }
}
