// 기존 uploads 파일 → Supabase Storage 마이그레이션 스크립트
// node migrate-uploads.js 로 실행

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

if (typeof globalThis.WebSocket === 'undefined') {
  try { globalThis.WebSocket = require('ws'); } catch(e) {}
}
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const UPLOADS_SRC = process.env.UPLOADS_SRC || 'C:\\willvision-backend\\uploads';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ .env에 SUPABASE_URL, SUPABASE_SERVICE_KEY 설정 필요');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  port:     parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'willvision',
  user:     process.env.PGUSER     || 'postgres',
  password: process.env.PGPASSWORD || '',
  ssl: (process.env.PGHOST || '').includes('supabase') ? { rejectUnauthorized: false } : false,
});

async function main() {
  // 1. 파일 목록
  const files = fs.readdirSync(UPLOADS_SRC).filter(f => !f.startsWith('.'));
  console.log(`📁 업로드 파일 ${files.length}개 발견\n`);

  // 2. Supabase Storage 업로드
  let ok = 0, skip = 0, fail = 0;
  for (const filename of files) {
    const filepath = path.join(UPLOADS_SRC, filename);
    const buffer = fs.readFileSync(filepath);
    const ext = path.extname(filename).toLowerCase();
    const mime = ext === '.pdf' ? 'application/pdf'
               : ext === '.xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
               : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
               : ext === '.png' ? 'image/png'
               : 'application/octet-stream';

    const { error } = await supabase.storage.from('uploads').upload(filename, buffer, {
      contentType: mime,
      upsert: true,
    });

    if (error && !error.message.includes('already exists')) {
      console.log(`  ❌ ${filename}: ${error.message}`);
      fail++;
    } else {
      console.log(`  ✅ ${filename}`);
      ok++;
    }
  }
  console.log(`\n업로드 완료: 성공 ${ok} / 실패 ${fail}\n`);

  // 3. DB URL 치환
  const newBase = `${SUPABASE_URL}/storage/v1/object/public/uploads/`;
  const client = await pool.connect();
  try {
    // compliance_submissions.fileUrl
    const r1 = await client.query(`
      UPDATE compliance_submissions
      SET "fileUrl" = REPLACE("fileUrl", '/uploads/', $1)
      WHERE "fileUrl" LIKE '/uploads/%'
    `, [newBase]);
    console.log(`📝 compliance_submissions 치환: ${r1.rowCount}건`);

    // posts.attachments (JSON 문자열 내 URL 치환)
    const r2 = await client.query(`
      UPDATE posts
      SET attachments = REPLACE(attachments::text, '/uploads/', $1)::jsonb
      WHERE attachments::text LIKE '%/uploads/%'
    `, [newBase]);
    console.log(`📝 posts.attachments 치환: ${r2.rowCount}건`);

  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n🎉 마이그레이션 완료!');
}

main().catch(err => { console.error('오류:', err.message); process.exit(1); });
