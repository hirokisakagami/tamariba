import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createUser, getUserByEmail, createSection } from '@/lib/d1'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const existingUser = await getUserByEmail(email)

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const userId = await createUser(email, hashedPassword, name)

    const defaultSections = [
      {
        title: 'フィーチャー',
        slug: 'featured',
        description: '大きなサムネイルで表示される注目コンテンツ',
      },
      {
        title: 'あなたにおすすめ',
        slug: 'for_you',
        description: 'ユーザーにおすすめの動画',
      },
      {
        title: 'トレンド',
        slug: 'trending',
        description: '話題の動画',
      },
      {
        title: 'コミュニティで人気',
        slug: 'community_popular',
        description: 'コミュニティで人気の動画',
      },
    ]

    for (const section of defaultSections) {
      await createSection({
        ...section,
        userId,
      })
    }

    const userWithoutPassword = { id: userId, name, email }

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}