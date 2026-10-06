import type { IftaReport } from '../types'
import { IFTA_STATE_OPTIONS } from '../constants/iftaStates'

const US_STATE_CODES = new Set(IFTA_STATE_OPTIONS.map((option) => option.value))

export interface IftaStateMiles {
  state: string
  miles: number
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
    } else current += char
  }
  cells.push(current)
  return cells.map((cell) => cell.trim())
}

export function parseStateMiles(csvText: string): IftaStateMiles[] {
  const rows: IftaStateMiles[] = []
  const seen = new Set<string>()
  for (const line of csvText.split(/\r?\n/)) {
    if (!line.trim()) continue
    const cells = splitCsvLine(line)
    const stateIndex = cells.findIndex((cell) => US_STATE_CODES.has(cell.toUpperCase()))
    if (stateIndex === -1) continue
    const state = cells[stateIndex].toUpperCase()
    let miles = NaN
    for (let i = cells.length - 1; i > stateIndex; i -= 1) {
      const value = Number(cells[i].replace(/[^0-9.-]/g, ''))
      if (cells[i] !== '' && Number.isFinite(value)) {
        miles = value
        break
      }
    }
    if (!Number.isFinite(miles) || seen.has(state)) continue
    seen.add(state)
    rows.push({ state, miles })
  }
  return rows.sort((a, b) => a.state.localeCompare(b.state))
}

export function applyStateFilter(rows: IftaStateMiles[], states: string[]): IftaStateMiles[] {
  if (!states.length) return rows
  const wanted = new Set(states.map((state) => state.toUpperCase()))
  return rows.filter((row) => wanted.has(row.state))
}

function totalMiles(rows: IftaStateMiles[]): number {
  return Math.round(rows.reduce((sum, row) => sum + row.miles, 0) * 100) / 100
}

function formatMiles(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(ms: number | null): string {
  if (!ms) return '—'
  return new Date(ms).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function fileStamp(report: IftaReport): string {
  const clean = (value: string) => value.replace(/[^0-9]/g, '')
  const name = (report.vehicleName || report.vehicleId).replace(/[^A-Za-z0-9]/g, '')
  return `IFTA-${name}-${clean(report.fromDate)}-${clean(report.toDate)}`
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function reportInfoRows(report: IftaReport, companyName: string): [string, string][] {
  return [
    ['Carrier', companyName],
    ['Period', `${report.fromDate} - ${report.toDate}`],
    ['Report Generated', formatDateTime(report.timeGenerated)],
    ['Vehicle', report.vehicleName ?? ''],
    ['VIN', report.vehicleVin ?? ''],
    ['Make', report.vehicleMake ?? ''],
    ['Model', report.vehicleModel ?? ''],
    ['Year', report.vehicleYear != null ? String(report.vehicleYear) : ''],
  ]
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function buildCsv(report: IftaReport, companyName: string, rows: IftaStateMiles[]): string {
  const lines: string[] = [
    'IFTA Mileage By State',
    'Total mileage by state for the selected period.',
  ]
  for (const [label, value] of reportInfoRows(report, companyName))
    lines.push(`${csvCell(label)},${csvCell(value || '—')}`)
  lines.push('')
  lines.push('State,Miles')
  for (const row of rows) lines.push(`${row.state},${row.miles.toFixed(2)}`)
  lines.push(`Total Miles,${totalMiles(rows).toFixed(2)}`)
  return lines.join('\n')
}

function buildPdfHtml(report: IftaReport, companyName: string, rows: IftaStateMiles[]): string {
  const total = totalMiles(rows)
  const stateRows = rows
    .map(
      (row, index) => `
        <tr style="background:${index % 2 === 0 ? '#ffffff' : '#f0f0f0'}">
          <td style="padding:7px 10px;border:1px solid #DBDBDB;color:#111827">${row.state}</td>
          <td style="padding:7px 10px;border:1px solid #DBDBDB;color:#111827;text-align:right">${formatMiles(row.miles)}</td>
        </tr>`
    )
    .join('')
  const vehicleMeta =
    [report.vehicleMake, report.vehicleModel, report.vehicleYear]
      .filter((value) => value !== null && value !== undefined && `${value}`.length > 0)
      .join(' · ') || '—'
  const label = (text: string) =>
    `<div style="margin-top:10px;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:#666666">${text}</div>`

  return `
    <div style="padding:28px;background:#ffffff;color:#111827;font-family:ui-sans-serif,system-ui,sans-serif;width:760px">
      <div style="font-size:22px;font-weight:700">IFTA Mileage By State</div>
      <div style="font-size:13px;color:#666666;margin-top:4px">Total mileage by state for the selected period.</div>
      <div style="margin-top:16px;display:flex;justify-content:space-between;gap:32px;border:1px solid #DBDBDB;border-radius:10px;background:#f0f0f0;padding:18px 20px">
        <div>
          <div style="font-size:16px;font-weight:700">${escapeHtml(companyName || '—')}</div>
          ${label('Period')}
          <div style="font-size:13px">${escapeHtml(report.fromDate)} - ${escapeHtml(report.toDate)}</div>
          ${label('Report Generated')}
          <div style="font-size:13px">${formatDateTime(report.timeGenerated)}</div>
        </div>
        <div style="text-align:right">
          ${label('Vehicle')}
          <div style="font-size:16px;font-weight:700">${escapeHtml(report.vehicleName ?? '—')}</div>
          ${label('VIN')}
          <div style="font-size:13px">${escapeHtml(report.vehicleVin ?? '—')}</div>
          ${label('Make · Model · Year')}
          <div style="font-size:13px;color:#666666">${escapeHtml(vehicleMeta)}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:18px">
        <thead>
          <tr>
            <th style="padding:8px 10px;background:#111827;color:#ffffff;text-align:left">State</th>
            <th style="padding:8px 10px;background:#111827;color:#ffffff;text-align:right">Miles</th>
          </tr>
        </thead>
        <tbody>
          ${stateRows}
          <tr>
            <td style="padding:9px 10px;border:1px solid #111827;background:#f0f0f0;color:#111827;font-weight:700">Total Miles</td>
            <td style="padding:9px 10px;border:1px solid #111827;background:#f0f0f0;color:#111827;font-weight:700;text-align:right">${formatMiles(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>`
}

function csvBlob(report: IftaReport, companyName: string, rows: IftaStateMiles[]): Blob {
  return new Blob([buildCsv(report, companyName, rows)], { type: 'text/csv;charset=utf-8;' })
}

async function pdfBlob(
  report: IftaReport,
  companyName: string,
  rows: IftaStateMiles[]
): Promise<Blob> {
  const html2pdf = (await import('html2pdf.js')).default
  const holder = document.createElement('div')
  holder.style.position = 'fixed'
  holder.style.left = '-10000px'
  holder.style.top = '0'
  holder.innerHTML = buildPdfHtml(report, companyName, rows)
  document.body.appendChild(holder)
  try {
    return await html2pdf()
      .set({
        margin: 8,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(holder.firstElementChild as HTMLElement)
      .outputPdf('blob')
  } finally {
    holder.remove()
  }
}

async function reportRows(
  report: IftaReport,
  states: string[],
  fetchCsv: (url: string) => Promise<string>
): Promise<IftaStateMiles[]> {
  if (!report.csvUrl) throw new Error('This report has no source file yet.')
  return applyStateFilter(parseStateMiles(await fetchCsv(report.csvUrl)), states)
}

export async function downloadIftaReport(options: {
  report: IftaReport
  companyName: string
  states: string[]
  format: 'pdf' | 'csv'
  fetchCsv: (url: string) => Promise<string>
  shouldDownload?: () => boolean
}): Promise<void> {
  const save = (blob: Blob, filename: string) => {
    if (options.shouldDownload?.() === false) return
    triggerDownload(blob, filename)
  }

  const { report, companyName, states, format, fetchCsv } = options
  const rows = await reportRows(report, states, fetchCsv)
  const stamp = fileStamp(report)
  if (format === 'csv') save(csvBlob(report, companyName, rows), `${stamp}.csv`)
  else save(await pdfBlob(report, companyName, rows), `${stamp}.pdf`)
}

interface IftaVehicleMatrixRow {
  vehicleId: string
  vehicleName: string
  vehicleVin: string
  milesByState: Map<string, number>
}

interface IftaVehicleMatrix {
  states: string[]
  vehicles: IftaVehicleMatrixRow[]
}

const stateOrder = new Map(
  IFTA_STATE_OPTIONS.map((option, index) => [option.value, index] as const)
)

function sortStates(states: Iterable<string>): string[] {
  return [...new Set([...states].map((state) => state.toUpperCase()))]
    .filter((state) => US_STATE_CODES.has(state))
    .sort(
      (first, second) =>
        (stateOrder.get(first) ?? Number.MAX_SAFE_INTEGER) -
          (stateOrder.get(second) ?? Number.MAX_SAFE_INTEGER) || first.localeCompare(second)
    )
}

function matrixRowTotal(row: IftaVehicleMatrixRow, states: string[]): number {
  return states.reduce((total, state) => total + (row.milesByState.get(state) ?? 0), 0)
}

function matrixStateTotal(matrix: IftaVehicleMatrix, state: string): number {
  return matrix.vehicles.reduce(
    (total, vehicle) => total + (vehicle.milesByState.get(state) ?? 0),
    0
  )
}

function matrixTotal(matrix: IftaVehicleMatrix): number {
  return matrix.vehicles.reduce(
    (total, vehicle) => total + matrixRowTotal(vehicle, matrix.states),
    0
  )
}

async function vehicleMatrix(
  reports: IftaReport[],
  selectedStates: string[],
  fetchCsv: (url: string) => Promise<string>
): Promise<IftaVehicleMatrix> {
  const rowsByVehicle = new Map<string, IftaVehicleMatrixRow>()
  const availableStates = new Set<string>()

  for (const report of reports) {
    if (!report.csvUrl) continue
    const parsedRows = parseStateMiles(await fetchCsv(report.csvUrl))
    const vehicleKey = report.vehicleId || report.vehicleVin || report.vehicleName || report.id
    let vehicle = rowsByVehicle.get(vehicleKey)
    if (!vehicle) {
      vehicle = {
        vehicleId: report.vehicleId,
        vehicleName: report.vehicleName || report.vehicleId || 'Unknown vehicle',
        vehicleVin: report.vehicleVin || '',
        milesByState: new Map<string, number>(),
      }
      rowsByVehicle.set(vehicleKey, vehicle)
    }
    for (const row of parsedRows) {
      availableStates.add(row.state)
      vehicle.milesByState.set(row.state, (vehicle.milesByState.get(row.state) ?? 0) + row.miles)
    }
  }

  const states = sortStates(selectedStates.length ? selectedStates : availableStates)
  return {
    states,
    vehicles: [...rowsByVehicle.values()].sort((first, second) =>
      first.vehicleName.localeCompare(second.vehicleName, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    ),
  }
}

function selectedPeriods(reports: IftaReport[]): string {
  const periods = [...new Set(reports.map((report) => `${report.fromDate} - ${report.toDate}`))]
  if (periods.length <= 3) return periods.join('; ')
  return `${periods.slice(0, 2).join('; ')}; and ${periods.length - 2} more`
}

function mergedFileStamp(reports: IftaReport[]): string {
  const periods = [...new Set(reports.map((report) => `${report.fromDate}|${report.toDate}`))]
  if (periods.length === 1) {
    const [fromDate, toDate] = periods[0].split('|')
    const clean = (value: string) => value.replace(/[^0-9]/g, '')
    return `IFTA-Vehicles-${clean(fromDate)}-${clean(toDate)}`
  }
  return `IFTA-Vehicles-${Date.now()}`
}

function mergedCsv(reports: IftaReport[], companyName: string, matrix: IftaVehicleMatrix): Blob {
  const lines = [
    'IFTA Mileage By Vehicle',
    'Mileage traveled by selected vehicles within the selected states.',
    `Carrier,${csvCell(companyName || '—')}`,
    `Period,${csvCell(selectedPeriods(reports))}`,
    `Report Generated,${csvCell(new Date().toLocaleString('en-US'))}`,
    `Vehicles,${matrix.vehicles.length}`,
    '',
  ]
  lines.push(
    ['Vehicle', 'VIN', ...matrix.states, 'Total Miles'].map((value) => csvCell(value)).join(',')
  )
  for (const vehicle of matrix.vehicles) {
    lines.push(
      [
        vehicle.vehicleName,
        vehicle.vehicleVin || '—',
        ...matrix.states.map((state) => (vehicle.milesByState.get(state) ?? 0).toFixed(2)),
        matrixRowTotal(vehicle, matrix.states).toFixed(2),
      ]
        .map((value) => csvCell(value))
        .join(',')
    )
  }
  lines.push(
    [
      'All Vehicles',
      '',
      ...matrix.states.map((state) => matrixStateTotal(matrix, state).toFixed(2)),
      matrixTotal(matrix).toFixed(2),
    ]
      .map((value) => csvCell(value))
      .join(',')
  )
  return new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function chunks<T>(values: T[], size: number): T[][] {
  if (!values.length) return [[]]
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size)
    result.push(values.slice(index, index + size))
  return result
}

function mergedPdfHtml(
  reports: IftaReport[],
  companyName: string,
  matrix: IftaVehicleMatrix
): string {
  const stateGroups = chunks(matrix.states, 9)
  const tables = stateGroups
    .map((states, groupIndex) => {
      const stateHeaders = states
        .map(
          (state) =>
            `<th style="padding:8px 7px;background:#111827;color:#fff;text-align:right">${state}</th>`
        )
        .join('')
      const vehicleRows = matrix.vehicles
        .map(
          (vehicle, index) => `
            <tr style="background:${index % 2 === 0 ? '#fff' : '#f0f0f0'}">
              <td style="padding:7px 9px;border:1px solid #DBDBDB;font-weight:600">${escapeHtml(vehicle.vehicleName)}</td>
              <td style="padding:7px 9px;border:1px solid #DBDBDB;color:#666666">${escapeHtml(vehicle.vehicleVin || '—')}</td>
              ${states
                .map(
                  (state) =>
                    `<td style="padding:7px;border:1px solid #DBDBDB;text-align:right">${formatMiles(vehicle.milesByState.get(state) ?? 0)}</td>`
                )
                .join('')}
              <td style="padding:7px 9px;border:1px solid #DBDBDB;text-align:right;font-weight:700">${formatMiles(matrixRowTotal(vehicle, matrix.states))}</td>
            </tr>`
        )
        .join('')
      const stateTotals = states
        .map(
          (state) =>
            `<td style="padding:8px 7px;border:1px solid #111827;text-align:right;font-weight:700">${formatMiles(matrixStateTotal(matrix, state))}</td>`
        )
        .join('')
      const rangeLabel = matrix.states.length
        ? `States ${groupIndex * 9 + 1}-${Math.min((groupIndex + 1) * 9, matrix.states.length)} of ${matrix.states.length}`
        : 'No state mileage found'
      return `
        <section style="${groupIndex ? 'page-break-before:always;' : ''}">
          <div style="margin:18px 0 7px;font-size:11px;font-weight:700;color:#666666;text-transform:uppercase;letter-spacing:.05em">${rangeLabel}</div>
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead><tr>
              <th style="padding:8px 9px;background:#111827;color:#fff;text-align:left">Vehicle</th>
              <th style="padding:8px 9px;background:#111827;color:#fff;text-align:left">VIN</th>
              ${stateHeaders}
              <th style="padding:8px 9px;background:#111827;color:#fff;text-align:right">Report Total</th>
            </tr></thead>
            <tbody>
              ${vehicleRows}
              <tr style="background:#f0f0f0">
                <td style="padding:8px 9px;border:1px solid #111827;font-weight:700">All Vehicles</td>
                <td style="padding:8px 9px;border:1px solid #111827"></td>
                ${stateTotals}
                <td style="padding:8px 9px;border:1px solid #111827;text-align:right;font-weight:700">${formatMiles(matrixTotal(matrix))}</td>
              </tr>
            </tbody>
          </table>
        </section>`
    })
    .join('')

  return `
    <div style="padding:28px;background:#fff;color:#111827;font-family:ui-sans-serif,system-ui,sans-serif;width:1040px">
      <div style="font-size:22px;font-weight:700">IFTA Mileage By Vehicle</div>
      <div style="font-size:13px;color:#666666;margin-top:4px">Mileage traveled by selected vehicles within the selected states.</div>
      <div style="margin-top:16px;border:1px solid #DBDBDB;border-radius:10px;background:#f0f0f0;padding:16px 18px;display:grid;grid-template-columns:1fr 1fr;gap:12px 28px">
        <div><div style="font-size:10px;text-transform:uppercase;color:#666666">Carrier</div><div style="font-size:15px;font-weight:700">${escapeHtml(companyName || '—')}</div></div>
        <div><div style="font-size:10px;text-transform:uppercase;color:#666666">Vehicles</div><div style="font-size:15px;font-weight:700">${matrix.vehicles.length}</div></div>
        <div><div style="font-size:10px;text-transform:uppercase;color:#666666">Period</div><div style="font-size:12px">${escapeHtml(selectedPeriods(reports))}</div></div>
        <div><div style="font-size:10px;text-transform:uppercase;color:#666666">Report Generated</div><div style="font-size:12px">${escapeHtml(new Date().toLocaleString('en-US'))}</div></div>
      </div>
      ${tables}
    </div>`
}

async function mergedPdfBlob(
  reports: IftaReport[],
  companyName: string,
  matrix: IftaVehicleMatrix
): Promise<Blob> {
  const html2pdf = (await import('html2pdf.js')).default
  const holder = document.createElement('div')
  holder.style.position = 'fixed'
  holder.style.left = '-10000px'
  holder.style.top = '0'
  holder.innerHTML = mergedPdfHtml(reports, companyName, matrix)
  document.body.appendChild(holder)
  try {
    return await html2pdf()
      .set({
        margin: 7,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      })
      .from(holder.firstElementChild as HTMLElement)
      .outputPdf('blob')
  } finally {
    holder.remove()
  }
}

export async function downloadIftaReportsZip(options: {
  reports: IftaReport[]
  companyName: string
  states: string[]
  mergeByVehicles: boolean
  format: 'pdf' | 'csv' | 'all'
  fetchCsv: (url: string) => Promise<string>
  shouldDownload?: () => boolean
}): Promise<void> {
  const save = (blob: Blob, filename: string) => {
    if (options.shouldDownload?.() === false) return
    triggerDownload(blob, filename)
  }

  const { reports, companyName, states, mergeByVehicles, format, fetchCsv } = options

  if (mergeByVehicles) {
    const matrix = await vehicleMatrix(reports, states, fetchCsv)
    const stamp = mergedFileStamp(reports)
    const csv = () => mergedCsv(reports, companyName, matrix)
    const pdf = () => mergedPdfBlob(reports, companyName, matrix)
    if (format === 'csv') {
      save(csv(), `${stamp}.csv`)
      return
    }
    if (format === 'pdf') {
      save(await pdf(), `${stamp}.pdf`)
      return
    }
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    zip.file(`${stamp}.csv`, csv())
    zip.file(`${stamp}.pdf`, await pdf())
    save(await zip.generateAsync({ type: 'blob' }), `${stamp}.zip`)
    return
  }

  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  const used = new Set<string>()

  const nameFor = (base: string, extension: string) => {
    let name = `${base}.${extension}`
    let counter = 2
    while (used.has(name)) name = `${base}-${counter++}.${extension}`
    used.add(name)
    return name
  }

  for (const report of reports) {
    if (!report.csvUrl) continue
    const rows = await reportRows(report, states, fetchCsv)
    const stamp = fileStamp(report)
    if (format === 'csv' || format === 'all')
      zip.file(nameFor(stamp, 'csv'), csvBlob(report, companyName, rows))
    if (format === 'pdf' || format === 'all')
      zip.file(nameFor(stamp, 'pdf'), await pdfBlob(report, companyName, rows))
  }

  const archive = await zip.generateAsync({ type: 'blob' })
  save(archive, `ifta-reports-${Date.now()}.zip`)
}
