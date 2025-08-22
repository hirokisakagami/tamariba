import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { addVideoToSection, updateSectionItems, getD1Database } from '@/lib/d1'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { videoId, isFeatured = false } = await request.json()

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    const db = getD1Database()
    
    const sectionStmt = db.prepare('SELECT * FROM Section WHERE id = ? AND userId = ?')
    const section = await sectionStmt.bind(resolvedParams.id, session.user.id).first()

    if (!section) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }

    const videoStmt = db.prepare('SELECT * FROM Video WHERE id = ? AND userId = ?')
    const video = await videoStmt.bind(videoId, session.user.id).first()

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    const existingStmt = db.prepare('SELECT * FROM SectionItem WHERE sectionId = ? AND videoId = ?')
    const existingItem = await existingStmt.bind(resolvedParams.id, videoId).first()

    if (existingItem) {
      return NextResponse.json(
        { error: 'Video already exists in this section' },
        { status: 400 }
      )
    }

    const itemId = await addVideoToSection(resolvedParams.id, videoId, isFeatured)

    const sectionItem = { id: itemId, sectionId: resolvedParams.id, videoId, isFeatured }

    return NextResponse.json(sectionItem)
  } catch (error) {
    console.error('Error adding video to section:', error)
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
    const { items } = await request.json()

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items must be an array' },
        { status: 400 }
      )
    }

    const db = getD1Database()
    
    const sectionStmt = db.prepare('SELECT * FROM Section WHERE id = ? AND userId = ?')
    const section = await sectionStmt.bind(resolvedParams.id, session.user.id).first()

    if (!section) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }

    await updateSectionItems(resolvedParams.id, items.map((item: { id: string; isFeatured?: boolean }, index: number) => ({
      id: item.id,
      order: index,
      isFeatured: item.isFeatured || false
    })))

    const updatedItemsStmt = db.prepare(`
      SELECT si.*, v.title, v.cloudflareVideoId, v.thumbnailUrl
      FROM SectionItem si
      JOIN Video v ON si.videoId = v.id
      WHERE si.sectionId = ?
      ORDER BY si."order" ASC
    `)
    const result = await updatedItemsStmt.bind(resolvedParams.id).all()
    const updatedItems = result.results

    return NextResponse.json(updatedItems)
  } catch (error) {
    console.error('Error updating section items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}