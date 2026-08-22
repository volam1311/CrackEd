export type VideoMeta = {
  duration: number
  thumbnail: string | null
}

export async function readVideoMeta(file: File): Promise<VideoMeta> {
  const url = URL.createObjectURL(file)

  try {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = url

    const duration = await new Promise<number>((resolve, reject) => {
      video.onloadedmetadata = () => resolve(video.duration)
      video.onerror = () => reject(new Error('Could not read video metadata'))
    })

    const seekTo = Number.isFinite(duration)
      ? Math.min(1, Math.max(0.1, duration * 0.08))
      : 0.1

    const thumbnail = await new Promise<string | null>((resolve) => {
      const finish = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = 320
          canvas.height = 180
          const ctx = canvas.getContext('2d')
          if (!ctx || video.videoWidth === 0) {
            resolve(null)
            return
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        } catch {
          resolve(null)
        }
      }

      video.onseeked = finish
      video.onerror = () => resolve(null)
      try {
        video.currentTime = seekTo
      } catch {
        resolve(null)
      }
    })

    return {
      duration: Number.isFinite(duration) ? duration : 0,
      thumbnail,
    }
  } catch {
    return { duration: 0, thumbnail: null }
  } finally {
    URL.revokeObjectURL(url)
  }
}
