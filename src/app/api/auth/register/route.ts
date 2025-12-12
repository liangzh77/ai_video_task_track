import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    // Validate username
    if (!username || username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: '用户名长度必须在 3-20 个字符之间' },
        { status: 400 }
      )
    }

    // Validate password
    if (!password || password.length < 6 || password.length > 50) {
      return NextResponse.json(
        { error: '密码长度必须在 6-50 个字符之间' },
        { status: 400 }
      )
    }

    // Check if username exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '用户名已存在' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: 'USER',
        canCRUD: false,
        canApprove: false,
      },
      select: {
        id: true,
        username: true,
        role: true,
        canCRUD: true,
        canApprove: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('注册失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
