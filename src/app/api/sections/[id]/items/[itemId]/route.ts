import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteSectionItem, getD1Database } from '@/lib/d1'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params

    const db = getD1Database()
    
    const sectionStmt = db.prepare('SELECT * FROM Section WHERE id = ? AND userId = ?')
    const section = await sectionStmt.bind(resolvedParams.id, session.user.id).first()

    if (!section) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }

    await deleteSectionItem(resolvedParams.itemId, resolvedParams.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting section item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}