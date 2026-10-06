declare module 'html2pdf.js' {
  interface Html2PdfWorker {
    set(options: {
      margin: number
      image: { type: string; quality: number }
      html2canvas: { scale: number; useCORS: boolean; backgroundColor: string }
      jsPDF: { unit: string; format: string; orientation: string }
    }): Html2PdfWorker
    from(element: HTMLElement): Html2PdfWorker
    outputPdf(type: 'blob'): Promise<Blob>
  }
  export default function html2pdf(): Html2PdfWorker
}
