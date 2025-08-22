import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteVideo, updateVideo, getD1Database } from '@/lib/d1'
import { deleteStreamVideo } from '@/lib/cloudflare'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params

    const db = getD1Database()
    const videoResult = await db.query('SELECT * FROM Video WHERE id = ? AND userId = ?', [resolvedParams.id, session.user.id])
    const video = videoResult.results[0] as any

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    await deleteStreamVideo(video.cloudflareVideoId)

    await deleteVideo(resolvedParams.id, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting video:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { title, description, status } = await request.json()

    await updateVideo(resolvedParams.id, session.user.id, {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
    })

    const video = { id: resolvedParams.id, title, description, status }

    return NextResponse.json(video)
  } catch (error) {
    console.error('Error updating video:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}