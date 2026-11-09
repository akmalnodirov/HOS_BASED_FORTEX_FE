import { computed, ref, watch, type Ref } from 'vue'

export function useReportTablePage<T>(rows: Ref<T[]>) {
  const pageSizeSelection = ref('all')
  const tablePage = ref(1)
  const tablePageCount = computed(() => pageSizeSelection.value === 'all'
    ? 1
    : Math.max(1, Math.ceil(rows.value.length / Number(pageSizeSelection.value))))
  const visibleRows = computed(() => pageSizeSelection.value === 'all'
    ? rows.value
    : rows.value.slice((tablePage.value - 1) * Number(pageSizeSelection.value), tablePage.value * Number(pageSizeSelection.value)))

  watch(pageSizeSelection, () => { tablePage.value = 1 })
  watch(rows, () => { tablePage.value = Math.min(tablePage.value, tablePageCount.value) })

  return { pageSizeSelection, tablePage, tablePageCount, visibleRows }
}
