import { ref, shallowRef, reactive, watch } from 'vue'
import type { Ref, ShallowRef } from 'vue'
import type { OptimizeEventTableRow, BoostSelectedState, SelectionPosition } from '../types/optimize'
import { unproxify } from '@/utils/object'

/**
 * Optimize Selection Composable
 * Manages row selection logic with shift-click support
 * Following Single Responsibility Principle
 */
export function useOptimizeSelection(detailList: Ref<OptimizeEventTableRow[]>) {
  // Selection state
  const selectedRows = ref<OptimizeEventTableRow[]>([])
  const selectedRowSet = shallowRef<Set<string>>(new Set())
  const isShiftPressed = ref(false)

  const selectionStates = reactive<BoostSelectedState>({
    lastChecked: null,
    firstChecked: null,
    selectedOptimizeCategories: {},
    selectAllOptimizeCategories: false,
    selectedDriver: '',
  })

  // Flag to prevent watcher loop
  let isUpdatingFromTableRowSelect = false

  /**
   * Find row position in flat list
   */
  function findRowPosition(targetId: string): {
    parentIndex: number
    childIndex: number
    flatIndex: number
    row: OptimizeEventTableRow
  } | null {
    let flatIndex = 0
    for (let i = 0; i < detailList.value.length; i++) {
      if (detailList.value[i].id === targetId) {
        return {
          parentIndex: i,
          childIndex: i,
          flatIndex,
          row: detailList.value[i],
        }
      }
      flatIndex++
    }
    return null
  }

  /**
   * Get rows between two positions
   */
  function getRowsBetweenPositions(startPos: SelectionPosition, endPos: SelectionPosition) {
    const rows: Array<{
      row: OptimizeEventTableRow
      parentIndex: number
      childIndex: number
      flatIndex: number
    }> = []
    let currentFlatIndex = 0

    for (let i = 0; i < detailList.value.length; i++) {
      if (currentFlatIndex >= startPos.flatIndex && currentFlatIndex <= endPos.flatIndex) {
        rows.push({
          row: detailList.value[i],
          parentIndex: i,
          childIndex: i,
          flatIndex: currentFlatIndex,
        })
      }
      currentFlatIndex++
    }
    return rows
  }

  /**
   * Handle row selection with shift-click support
   */
  function tableRowSelect(row: OptimizeEventTableRow) {
    // Archived events cannot be selected
    if (row.status === 4) {
      return
    }

    const currentPos = findRowPosition(row.id)
    if (!currentPos) return

    // Case 1: Normal click (no shift)
    if (!isShiftPressed.value) {
      // Toggle current row
      if (selectedRowSet.value.has(row.id)) {
        selectedRowSet.value.delete(row.id)
      } else {
        selectedRowSet.value.add(row.id)
      }

      // Update selection state
      selectionStates.lastChecked = {
        parentIndex: currentPos.parentIndex,
        childIndex: currentPos.childIndex,
        flatIndex: currentPos.flatIndex,
      }

      // First checked or only one selected
      if (!selectionStates.firstChecked || selectedRowSet.value.size === 1) {
        selectionStates.firstChecked = {
          parentIndex: currentPos.parentIndex,
          childIndex: currentPos.childIndex,
          flatIndex: currentPos.flatIndex,
        }
      }
    }
    // Case 2: Shift+click with previous selection
    else if (isShiftPressed.value && selectionStates.lastChecked) {
      const lastPos = selectionStates.lastChecked

      // Determine range
      const minFlatIndex = Math.min(lastPos.flatIndex, currentPos.flatIndex)
      const maxFlatIndex = Math.max(lastPos.flatIndex, currentPos.flatIndex)

      const minPos = minFlatIndex === lastPos.flatIndex ? lastPos : currentPos
      const maxPos = maxFlatIndex === lastPos.flatIndex ? lastPos : currentPos

      // Get rows in range
      const rowsInRange = getRowsBetweenPositions(minPos, maxPos)

      // Check if all new rows are already selected
      const rowsToCheck = rowsInRange.filter((item) => item.flatIndex !== lastPos.flatIndex)
      const allNewRowsSelected =
        rowsToCheck.length > 0 && rowsToCheck.every((item) => selectedRowSet.value.has(item.row.id))

      // MinMax principle: If all new rows are selected, deselect them
      const shouldSelect = !allNewRowsSelected

      rowsInRange.forEach((item) => {
        if (item.row.status !== 4) {
          // Don't select archived
          if (shouldSelect) {
            selectedRowSet.value.add(item.row.id)
          } else {
            selectedRowSet.value.delete(item.row.id)
          }
        }
      })

      // Update last checked
      selectionStates.lastChecked = {
        parentIndex: currentPos.parentIndex,
        childIndex: currentPos.childIndex,
        flatIndex: currentPos.flatIndex,
      }

      // Update first checked if not set
      if (!selectionStates.firstChecked) {
        selectionStates.firstChecked = {
          parentIndex: minPos.parentIndex,
          childIndex: minPos.childIndex,
          flatIndex: minPos.flatIndex,
        }
      }
    }
    // Case 3: First shift+click (no previous selection)
    else if (isShiftPressed.value && !selectionStates.lastChecked) {
      // Act as normal click
      if (selectedRowSet.value.has(row.id)) {
        selectedRowSet.value.delete(row.id)
      } else {
        selectedRowSet.value.add(row.id)
      }

      selectionStates.lastChecked = {
        parentIndex: currentPos.parentIndex,
        childIndex: currentPos.childIndex,
        flatIndex: currentPos.flatIndex,
      }
      selectionStates.firstChecked = {
        parentIndex: currentPos.parentIndex,
        childIndex: currentPos.childIndex,
        flatIndex: currentPos.flatIndex,
      }
    }

    // Sync selectedRows array with selectedRowSet
    syncSelectedRows()
  }

  /**
   * Sync selectedRows with selectedRowSet
   */
  function syncSelectedRows() {
    const newSelectedRows: OptimizeEventTableRow[] = []
    for (let i = 0; i < detailList.value.length; i++) {
      const event = detailList.value[i]
      if (selectedRowSet.value.has(event.id)) {
        newSelectedRows.push(unproxify ? unproxify(event) : event)
      }
    }

    isUpdatingFromTableRowSelect = true
    selectedRows.value = newSelectedRows
  }

  /**
   * Clear all selections
   */
  function clearSelection() {
    selectedRowSet.value.clear()
    selectedRows.value = []
    selectionStates.lastChecked = null
    selectionStates.firstChecked = null
  }

  /**
   * Select all rows
   */
  function selectAll() {
    selectedRowSet.value.clear()
    detailList.value.forEach((event) => {
      if (event.status !== 4) {
        // Skip archived
        selectedRowSet.value.add(event.id)
      }
    })
    syncSelectedRows()
  }

  // Keyboard event handlers
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Shift') {
      isShiftPressed.value = true
    }
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Shift') {
      isShiftPressed.value = false
    }
  }

  // Watch for external changes to selectedRows
  watch(
    selectedRows,
    (newRows, oldRows) => {
      // Skip if update came from tableRowSelect
      if (isUpdatingFromTableRowSelect) {
        isUpdatingFromTableRowSelect = false
        return
      }

      // Sync selectedRowSet with new selectedRows
      const newSelectedIds = new Set(newRows.map((row) => row.id))
      selectedRowSet.value.clear()
      newSelectedIds.forEach((id) => {
        selectedRowSet.value.add(id)
      })

      // Reset selection states if all cleared
      if (newRows.length === 0) {
        selectionStates.lastChecked = null
        selectionStates.firstChecked = null
      } else {
        // Update last checked to the last selected row
        const lastRow = newRows[newRows.length - 1]
        const lastPos = findRowPosition(lastRow.id)
        if (lastPos) {
          selectionStates.lastChecked = {
            parentIndex: lastPos.parentIndex,
            childIndex: lastPos.childIndex,
            flatIndex: lastPos.flatIndex,
          }
        }
      }
    },
    { deep: true }
  )

  return {
    // State
    selectedRows,
    selectedRowSet,
    isShiftPressed,
    selectionStates,

    // Methods
    tableRowSelect,
    clearSelection,
    selectAll,
    handleKeyDown,
    handleKeyUp,
  }
}
