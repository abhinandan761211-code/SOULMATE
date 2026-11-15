import { supabase } from './supabase'
import { isPreviewMode } from './api'

/** Bucket holding journal photos — created by database/migration-qol.sql. */
const BUCKET = 'journal-photos'

/** Max side of a stored photo (px). Phone cameras dwarf this, so we downscale. */
const MAX_SIDE = 1600
const QUALITY = 0.82

/**
 * Downscale + re-encode an image in the browser before upload, so a 6 MB phone
 * photo becomes a few hundred kB and still looks fine on a laptop screen.
 */
async function compress(file: File): Promise<Blob> {
  if (file.type === 'image/gif' || file.size < 400 * 1024) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    )
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

const extOf = (file: File) => {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName
  return file.type === 'image/png' ? 'png' : 'jpg'
}

/** Upload one photo and return its public URL. */
export async function uploadJournalPhoto(userId: string, file: File): Promise<string> {
  if (isPreviewMode()) return URL.createObjectURL(file)

  const blob = await compress(file)
  const path = `${userId}/${crypto.randomUUID()}.${extOf(file)}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type || file.type, upsert: false, cacheControl: '31536000' })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadJournalPhotos(userId: string, files: File[]) {
  return Promise.all(files.map((f) => uploadJournalPhoto(userId, f)))
}
