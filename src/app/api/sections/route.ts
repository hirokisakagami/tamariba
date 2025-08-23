import { NextRequest, NextResponse } from 'next/server'
import { getSectionsByUserId, createSection, getD1Database } from '@/lib/d1'
import { toD1Like } from "@/lib/d1-adapter"

// Fixed user ID for no-auth mode
const ADMIN_USER_ID = 'admin-user'

export async function GET() {
  try {
    const sections = await getSectionsByUserId(ADMIN_USER_ID)

    return NextResponse.json(sections)
  } catch (error) {
    console.error('Error fetching sections:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, slug, description } = await request.json()

    if (!title || !slug) {
      return NextResponse.json(
        { error: 'Title and slug are required' },
        { status: 400 }
      )
    }

    const db = toD1Like(getD1Database() as any)
    const existingStmt = db.prepare('SELECT * FROM Section WHERE slug = ?')
    const existingSection = await existingStmt.bind(slug).first()

    if (existingSection) {
      return NextResponse.json(
        { error: 'Section with this slug already exists' },
        { status: 400 }
      )
    }

    const sectionId = await createSection({
      title,
      slug,
      description,
      userId: ADMIN_USER_ID,
    })

    const section = { id: sectionId, title, slug, description }

    return NextResponse.json(section)
  } catch (error) {
    console.error('Error creating section:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}