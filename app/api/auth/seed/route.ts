import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

// Admin credentials
const ADMIN_USERNAME = 'virgiangalang';
const ADMIN_PASSWORD = 'aBpCBx8s7XG8fOtG';

export async function POST(req: NextRequest) {
  try {
    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: ADMIN_USERNAME },
    });

    if (existingUser) {
      return NextResponse.json({ message: 'Admin user already exists' }, { status: 200 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        username: ADMIN_USERNAME,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      {
        message: 'Admin user created successfully',
        username: ADMIN_USERNAME,
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
