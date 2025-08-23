import { NextRequest, NextResponse } from 'next/server'
import { getVideosByUserId, createVideo } from '@/lib/d1'
import { uploadVideoToStream, getThumbnailUrls } from '@/lib/cloudflare'

// Fixed user ID for no-auth mode
const ADMIN_USER_ID = 'admin-user'

export async function GET() {
  try {
    const videos = await getVideosByUserId(ADMIN_USER_ID)

    return NextResponse.json(videos)
  } catch (error) {
    console.error('Error fetching videos:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const cloudflareVideo = await uploadVideoToStream(file, title)

    const thumbnailUrls = getThumbnailUrls(cloudflareVideo.uid)

    const videoId = await createVideo({
      title: title || file.name,
      description: description || undefined,
      cloudflareVideoId: cloudflareVideo.uid,
      thumbnailUrl: thumbnailUrls.large,
      duration: cloudflareVideo.duration || undefined,
      userId: ADMIN_USER_ID,
    })

    const video = { id: videoId, title: title || file.name, cloudflareVideoId: cloudflareVideo.uid }

    return NextResponse.json(video)
  } catch (error) {
    console.error('Error uploading video:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}