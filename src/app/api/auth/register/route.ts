import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

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

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    })

    const defaultSections = [
      {
        title: 'フィーチャー',
        slug: 'featured',
        description: '大きなサムネイルで表示される注目コンテンツ',
        order: 0,
      },
      {
        title: 'あなたにおすすめ',
        slug: 'for_you',
        description: 'ユーザーにおすすめの動画',
        order: 1,
      },
      {
        title: 'トレンド',
        slug: 'trending',
        description: '話題の動画',
        order: 2,
      },
      {
        title: 'コミュニティで人気',
        slug: 'community_popular',
        description: 'コミュニティで人気の動画',
        order: 3,
      },
    ]

    await prisma.section.createMany({
      data: defaultSections.map(section => ({
        ...section,
        userId: user.id,
      })),
    })

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}