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
    
    const sectionResult = await db.query('SELECT * FROM Section WHERE id = ? AND userId = ?', [resolvedParams.id, session.user.id])
    const section = sectionResult.results[0]

    if (!section) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }

    const videoResult = await db.query('SELECT * FROM Video WHERE id = ? AND userId = ?', [videoId, session.user.id])
    const video = videoResult.results[0]

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    const existingResult = await db.query('SELECT * FROM SectionItem WHERE sectionId = ? AND videoId = ?', [resolvedParams.id, videoId])
    const existingItem = existingResult.results[0]

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
    
    const sectionResult = await db.query('SELECT * FROM Section WHERE id = ? AND userId = ?', [resolvedParams.id, session.user.id])
    const section = sectionResult.results[0]

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

    const updatedItemsResult = await db.query(`
      SELECT si.*, v.title, v.cloudflareVideoId, v.thumbnailUrl
      FROM SectionItem si
      JOIN Video v ON si.videoId = v.id
      WHERE si.sectionId = ?
      ORDER BY si."order" ASC
    `, [resolvedParams.id])
    const updatedItems = updatedItemsResult.results

    return NextResponse.json(updatedItems)
  } catch (error) {
    console.error('Error updating section items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}