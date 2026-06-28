'use client'

import { useCallback, useEffect, useState } from 'react'
import { BottomSheet } from '@/app/_components/bottom-sheet'

type Props = {
  title: string
  text: string
  imagePath: string
}

type Step = 'choose' | 'image'

function LinkIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

async function fetchShareImageBlob(imagePath: string): Promise<Blob> {
  const res = await fetch(imagePath)
  if (!res.ok) {
    throw new Error('Could not load share image')
  }
  return res.blob()
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function ShareButton({ title, text, imagePath }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('choose')
  const [copied, setCopied] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [sharingImage, setSharingImage] = useState(false)

  useEffect(() => {
    if (!imageBlob) {
      setImagePreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(imageBlob)
    setImagePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageBlob])

  const closeSheet = useCallback(() => {
    setOpen(false)
    setStep('choose')
    setCopied(false)
    setImageLoading(false)
    setImageError(null)
    setImageBlob(null)
    setSharingImage(false)
  }, [])

  async function handleShareLink() {
    const url = window.location.href
    const shareText = `${text}\n${url}`

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        closeSheet()
        return
      } catch {
        // user cancelled or unsupported — fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  async function handleShareImageStep() {
    setStep('image')
    setImageError(null)
    setImageBlob(null)
    setImageLoading(true)

    try {
      const blob = await fetchShareImageBlob(imagePath)
      setImageBlob(blob)
    } catch {
      setImageError('Could not load image. Try again.')
    } finally {
      setImageLoading(false)
    }
  }

  async function handleShareImageFile() {
    if (!imageBlob) return

    setSharingImage(true)
    try {
      const file = new File([imageBlob], 'organizr-session.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
        closeSheet()
        return
      }
      downloadBlob(imageBlob, 'organizr-session.png')
    } catch {
      // user cancelled share — stay on preview
    } finally {
      setSharingImage(false)
    }
  }

  function handleSaveImage() {
    if (!imageBlob) return
    downloadBlob(imageBlob, 'organizr-session.png')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Share"
        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:text-zinc-50"
      >
        <ShareIcon />
        Share
      </button>

      <BottomSheet
        open={open}
        onClose={closeSheet}
        variant="fixed"
        ariaLabelledby="share-sheet-title"
      >
        {step === 'choose' ? (
          <>
            <h2 id="share-sheet-title" className="text-lg font-semibold tracking-tight text-zinc-50">
              Share
            </h2>
            <p className="mt-1 text-sm text-zinc-500">Spread the word about this session.</p>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => void handleShareLink()}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3.5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-200">
                  {copied ? <CheckIcon /> : <LinkIcon />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-zinc-100">
                    {copied ? 'Link copied!' : 'Share link'}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {copied ? 'Paste it anywhere.' : 'Send the page URL via message or email.'}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => void handleShareImageStep()}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3.5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-200">
                  <ImageIcon />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-zinc-100">Share as image</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    Post on Instagram, Facebook, or save to photos.
                  </span>
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setStep('choose')
                setImageError(null)
                setImageBlob(null)
              }}
              className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
            >
              <ChevronLeftIcon />
              Back
            </button>

            <h2 id="share-sheet-title" className="text-lg font-semibold tracking-tight text-zinc-50">
              Share as image
            </h2>
            <p className="mt-1 text-sm text-zinc-500">Square post ready for social media.</p>

            <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
              {imageLoading ? (
                <div className="flex aspect-square items-center justify-center">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-800" />
                </div>
              ) : imageError ? (
                <div className="flex aspect-square items-center justify-center px-6 text-center text-sm text-red-300">
                  {imageError}
                </div>
              ) : imagePreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreviewUrl}
                  alt="Share preview"
                  className="aspect-square w-full object-cover"
                />
              ) : null}
            </div>

            {!imageLoading && !imageError ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={!imageBlob || sharingImage}
                  onClick={() => void handleShareImageFile()}
                  className="rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60 disabled:opacity-50"
                >
                  {sharingImage ? 'Sharing…' : 'Share'}
                </button>
                <button
                  type="button"
                  disabled={!imageBlob}
                  onClick={handleSaveImage}
                  className="rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60 disabled:opacity-50"
                >
                  Save image
                </button>
              </div>
            ) : null}

            {imageError ? (
              <button
                type="button"
                onClick={() => void handleShareImageStep()}
                className="mt-4 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
              >
                Try again
              </button>
            ) : null}
          </>
        )}
      </BottomSheet>
    </>
  )
}
