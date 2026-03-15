import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

const loadDraft = (draftId) => {
  const file = path.join(process.cwd(), 'src', 'data', 'emailDrafts.json');
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  const drafts = JSON.parse(raw || '[]');
  return drafts.find((d) => d.id === draftId) || null;
};

const tpl = (str = '', data = {}) =>
  str.replace(/\{\{\s*(.*?)\s*\}\}/g, (_, key) => (data[key] != null ? String(data[key]) : ''));

const createTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const secure = process.env.EMAIL_SECURE === 'true';
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  if (!user || !pass) throw new Error('Email credentials are not configured');
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
};

export async function POST(req) {
  try {
    const body = await req.json();
    const { draftId, to, templateData = {} } = body || {};
    if (!draftId || !to) {
      return NextResponse.json({ error: 'draftId and recipient email are required' }, { status: 400 });
    }

    const draft = loadDraft(draftId);
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME || 'Radix Billing'} <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(',') : to,
      subject: tpl(draft.subject, templateData),
      html: tpl(draft.html || '', templateData)
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
