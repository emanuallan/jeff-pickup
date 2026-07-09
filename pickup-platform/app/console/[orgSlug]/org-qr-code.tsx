'use client'

import { useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { btnOutline } from '../_components/console-ui'
import { useConsoleToast } from '../_components/console-toast'

const QRCodeCanvas = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeCanvas),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[200px] w-[200px] animate-pulse rounded-lg bg-zinc-800/80"
        aria-hidden
      />
    ),
  },
)

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

type Props = {
  orgUrl: string
  orgHost: string
  orgName: string
}

export function OrgQrCode({ orgUrl, orgHost, orgName }: Props) {
  const toast = useConsoleToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const downloadPng = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `${orgHost}-qr.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [orgHost])

  const handlePrint = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) return

    const safeName = escapeHtml(orgName)
    const safeHost = escapeHtml(orgHost)

    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${safeName} — QR Code</title>
    <style>
      body {
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
        padding: 48px 24px;
        color: #111;
      }
      h1 {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0 0 8px;
      }
      p {
        color: #555;
        margin: 0 0 32px;
        font-size: 1rem;
      }
      img {
        width: 280px;
        height: 280px;
      }
      @media print {
        body { padding: 0; }
      }
    </style>
  </head>
  <body>
    <h1>${safeName}</h1>
    <p>${safeHost}</p>
    <img src="${dataUrl}" alt="QR code for ${safeHost}" />
    <script>
      window.onload = function () {
        window.print();
        window.onafterprint = function () { window.close(); };
      };
    <\/script>
  </body>
</html>`)
    printWindow.document.close()
  }, [orgName, orgHost])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(orgUrl)
      toast.success('Copied.')
    } catch {
      toast.error('Could not copy — try saving or printing instead.')
    }
  }, [orgUrl, toast])

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="self-center rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:self-auto">
        <QRCodeCanvas
          ref={canvasRef}
          value={orgUrl}
          size={200}
          level="M"
          marginSize={4}
          bgColor="#ffffff"
          fgColor="#000000"
          title={`QR code linking to ${orgHost}`}
        />
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <p className="font-mono text-sm text-zinc-200">{orgHost}</p>
          <p className="mt-1 text-xs text-zinc-500">
            Scan to open your group&apos;s public page. Print for flyers, posters, or signage.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={copyLink} className={btnOutline}>
            Copy link
          </button>
          <button type="button" onClick={downloadPng} className={btnOutline}>
            Save PNG
          </button>
          <button type="button" onClick={handlePrint} className={btnOutline}>
            Print
          </button>
        </div>
      </div>
    </div>
  )
}
