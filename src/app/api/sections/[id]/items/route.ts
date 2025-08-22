import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const section = await prisma.section.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id,
      },
    })

    if (!section) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }

    const video = await prisma.video.findFirst({
      where: {
        id: videoId,
        userId: session.user.id,
      },
    })

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    const existingItem = await prisma.sectionItem.findUnique({
      where: {
        sectionId_videoId: {
          sectionId: resolvedParams.id,
          videoId: videoId,
        },
      },
    })

    if (existingItem) {
      return NextResponse.json(
        { error: 'Video already exists in this section' },
        { status: 400 }
      )
    }

    const maxOrder = await prisma.sectionItem.findFirst({
      where: { sectionId: resolvedParams.id },
      orderBy: { order: 'desc' },
      select: { order: true }
    })

    const sectionItem = await prisma.sectionItem.create({
      data: {
        sectionId: resolvedParams.id,
        videoId: videoId,
        order: (maxOrder?.order || 0) + 1,
        isFeatured,
      },
      include: {
        video: true,
        section: true,
      },
    })

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

    const section = await prisma.section.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id,
      },
    })

    if (!section) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }

    const updatePromises = items.map((item: { id: string; isFeatured?: boolean }, index: number) =>
      prisma.sectionItem.update({
        where: { id: item.id },
        data: { order: index, isFeatured: item.isFeatured || false },
      })
    )

    await Promise.all(updatePromises)

    const updatedItems = await prisma.sectionItem.findMany({
      where: { sectionId: resolvedParams.id },
      orderBy: { order: 'asc' },
      include: { video: true },
    })

    return NextResponse.json(updatedItems)
  } catch (error) {
    console.error('Error updating section items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}