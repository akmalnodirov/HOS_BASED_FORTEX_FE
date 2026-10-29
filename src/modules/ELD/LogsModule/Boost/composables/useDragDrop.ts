import { ref } from 'vue'

export interface LocationTransfer {
  positioning?: string | null
  locationOrigin?: number | null
  calculatedLocation?: string | null
  manualLocation?: string | null
  latitude?: number | null
  longitude?: number | null
}

export type DragColumnType = 'location' | 'odometer' | 'engine_hours' | 'trailer' | 'doc'

type ActiveDrag = { column: DragColumnType; sourceEventId: string }

export function useDragDrop(
  onDropCallback: (column: DragColumnType, targetEventId: string, sourceEventId: string) => void
) {
  const isDragging = ref(false)
  let activeDrag: ActiveDrag | null = null
  let sourceCell: HTMLElement | null = null
  let currentTargetCell: HTMLElement | null = null
  let currentTargetCanDrop = false
  let suppressClickUntil = 0

  function getCell(event: DragEvent): HTMLElement | null {
    return event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-drag-field]')
      : null
  }

  function getEventId(cell: HTMLElement) {
    return cell.dataset.eventId ?? null
  }

  function canDrop(cell: HTMLElement) {
    return !!activeDrag &&
      cell.dataset.dropEnabled === 'true' &&
      cell.dataset.dragField === activeDrag.column &&
      getEventId(cell) !== activeDrag.sourceEventId
  }

  function canDropOnTarget(cell: HTMLElement) {
    if (cell !== currentTargetCell) {
      currentTargetCell = cell
      currentTargetCanDrop = canDrop(cell)
    }
    return currentTargetCanDrop
  }

  function clearTargetCell(cell?: HTMLElement) {
    if (cell && currentTargetCell !== cell) return
    currentTargetCell = null
    currentTargetCanDrop = false
  }

  function clearDrag() {
    if (activeDrag) suppressClickUntil = Date.now() + 350
    sourceCell?.classList.remove('dd-dragging')
    sourceCell = null
    clearTargetCell()
    document.querySelectorAll('.dd-over, .dd-not-allowed').forEach((element) => {
      element.classList.remove('dd-over', 'dd-not-allowed')
    })
    activeDrag = null
    isDragging.value = false
  }

  function handleDragStart(event: DragEvent) {
    const cell = getCell(event)
    if (!cell || cell.draggable !== true) return
    const column = cell.dataset.dragField as DragColumnType | undefined
    const sourceEventId = getEventId(cell)
    if (!column || !sourceEventId || !event.dataTransfer) return
    activeDrag = { column, sourceEventId }
    sourceCell = cell
    event.dataTransfer.setData('text/plain', `${column}:${sourceEventId}`)
    event.dataTransfer.effectAllowed = 'copy'
    isDragging.value = true
    cell.classList.add('dd-dragging')
  }

  function handleDragOver(event: DragEvent) {
    const cell = getCell(event)
    if (!cell || !canDropOnTarget(cell)) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  }

  function handleDragEnter(event: DragEvent) {
    const cell = getCell(event)
    if (!cell || !activeDrag || !canDropOnTarget(cell)) return
    event.preventDefault()
    cell.classList.add('dd-over')
  }

  function handleDragLeave(event: DragEvent) {
    const cell = getCell(event)
    if (!cell) return
    if (!(event.relatedTarget instanceof Node) || !cell.contains(event.relatedTarget)) {
      cell.classList.remove('dd-over')
      clearTargetCell(cell)
    }
  }

  function handleDrop(event: DragEvent) {
    const cell = getCell(event)
    if (!cell || !canDropOnTarget(cell) || !activeDrag) return
    const targetEventId = getEventId(cell)
    if (!targetEventId) return
    event.preventDefault()
    event.stopPropagation()
    const { column, sourceEventId } = activeDrag
    clearDrag()
    onDropCallback(column, targetEventId, sourceEventId)
  }

  function setup(container: HTMLElement) {
    container.addEventListener('dragstart', handleDragStart)
    container.addEventListener('dragend', clearDrag)
    container.addEventListener('dragover', handleDragOver)
    container.addEventListener('dragenter', handleDragEnter)
    container.addEventListener('dragleave', handleDragLeave)
    container.addEventListener('drop', handleDrop)
  }

  function cleanup(container: HTMLElement) {
    container.removeEventListener('dragstart', handleDragStart)
    container.removeEventListener('dragend', clearDrag)
    container.removeEventListener('dragover', handleDragOver)
    container.removeEventListener('dragenter', handleDragEnter)
    container.removeEventListener('dragleave', handleDragLeave)
    container.removeEventListener('drop', handleDrop)
    clearDrag()
  }

  function suppressClick(event: MouseEvent) {
    if (Date.now() > suppressClickUntil) return false
    event.preventDefault()
    event.stopPropagation()
    return true
  }

  return { isDragging, setup, cleanup, suppressClick }
}
