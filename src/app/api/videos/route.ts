import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getVideosByUserId, createVideo } from '@/lib/d1'
import { uploadVideoToStream, getThumbnailUrl } from '@/lib/cloudflare'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const videos = await getVideosByUserId(session.user.id)

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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const cloudflareVideo = await uploadVideoToStream(file, title)

    const videoId = await createVideo({
      title: title || file.name,
      description: description || undefined,
      cloudflareVideoId: cloudflareVideo.uid,
      thumbnailUrl: getThumbnailUrl(cloudflareVideo.uid),
      duration: cloudflareVideo.duration || undefined,
      userId: session.user.id,
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