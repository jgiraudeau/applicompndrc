import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "NOT_SET",
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || "NOT_SET",
        HAS_NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
        NODE_ENV: process.env.NODE_ENV
    });
}
