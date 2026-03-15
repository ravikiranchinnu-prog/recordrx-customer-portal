import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const file = path.join(process.cwd(), 'src', 'data', 'emailDrafts.json');
    if (!fs.existsSync(file)) return NextResponse.json([]);
    const raw = fs.readFileSync(file, 'utf8');
    const drafts = JSON.parse(raw || '[]');
    return NextResponse.json(
      drafts.map((d) => ({
        id: d.id,
        subject: d.subject,
        issueType: d.issueType,
        customerQuestions: d.customerQuestions || '',
        html: d.html || ''
      }))
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
