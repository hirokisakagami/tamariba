export const CLOUDFLARE_CONFIG = {
  streamApiToken: process.env.CLOUDFLARE_STREAM_API_TOKEN!,
  globalApiKey: process.env.CLOUDFLARE_GLOBAL_API_KEY!,
  email: process.env.CLOUDFLARE_EMAIL!,
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  streamApiEndpoint: process.env.CLOUDFLARE_STREAM_ENDPOINT!,
  customerSubdomain: process.env.CLOUDFLARE_CUSTOMER_SUBDOMAIN!,
}

export interface CloudflareVideo {
  uid: string
  status: {
    state: 'ready' | 'processing' | 'error'
    pctComplete: number
    errorReasonCode?: string
    errorReasonText?: string
  }
  meta: {
    name?: string
    description?: string
  }
  duration?: number
  created: string
  filename?: string
  size?: number
}

export const getStreamUrl = (videoId: string) => {
  return `https://stream.cloudflare.com/${videoId}/manifest/video.m3u8`
}

export const getThumbnailUrl = (videoId: string, time = 0, width = 320, height = 180) => {
  return `https://stream.cloudflare.com/${videoId}/thumbnails/thumbnail.jpg?time=${time}s&width=${width}&height=${height}`
}

// Get multiple thumbnail options
export const getThumbnailUrls = (videoId: string) => {
  return {
    small: getThumbnailUrl(videoId, 0, 320, 180),    // 小サムネイル
    large: getThumbnailUrl(videoId, 0, 640, 360),    // 大サムネイル
    featured: getThumbnailUrl(videoId, 0, 800, 450), // フィーチャー用
  }
}

export const uploadVideoToStream = async (
  videoFile: File,
  title?: string
): Promise<CloudflareVideo> => {
  const url = `${CLOUDFLARE_CONFIG.streamApiEndpoint}/${CLOUDFLARE_CONFIG.accountId}/stream`

  const formData = new FormData()
  formData.append('file', videoFile)

  // Enhanced metadata with thumbnail settings
  const metadata = {
    name: title || videoFile.name,
    // Request thumbnail generation at upload time
    thumbnailTimestamp: 0, // Generate thumbnail at 0 seconds
  }
  
  formData.append('meta', JSON.stringify(metadata))

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_CONFIG.streamApiToken}`,
    },
    body: formData,
  })

  const result = await response.json()
  
  if (!result.success) {
    throw new Error(result.errors?.[0]?.message || 'アップロードに失敗しました')
  }

  return result.result
}

export const getStreamVideos = async (): Promise<CloudflareVideo[]> => {
  const url = `${CLOUDFLARE_CONFIG.streamApiEndpoint}/${CLOUDFLARE_CONFIG.accountId}/stream`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_CONFIG.streamApiToken}`,
      'Content-Type': 'application/json',
    },
  })

  const result = await response.json()
  return result.result || []
}

export const deleteStreamVideo = async (videoId: string): Promise<void> => {
  const url = `${CLOUDFLARE_CONFIG.streamApiEndpoint}/${CLOUDFLARE_CONFIG.accountId}/stream/${videoId}`

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_CONFIG.streamApiToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('動画の削除に失敗しました')
  }
}