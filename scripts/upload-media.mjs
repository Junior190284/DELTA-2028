import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'delta-media';

const filesToUpload = [
  { localPath: 'public/assets/intro/inferno.mp4', remotePath: 'intro/inferno.mp4', mime: 'video/mp4' },
  { localPath: 'public/videos/tunnel.mp4', remotePath: 'videos/tunnel.mp4', mime: 'video/mp4' },
  { localPath: 'public/videos/bg_gold.mp4', remotePath: 'videos/bg_gold.mp4', mime: 'video/mp4' },
  { localPath: 'public/videos/bg_inferno.mp4', remotePath: 'videos/bg_inferno.mp4', mime: 'video/mp4' },
  { localPath: 'public/videos/bg_legend.mp4', remotePath: 'videos/bg_legend.mp4', mime: 'video/mp4' },
  { localPath: 'public/videos/bg_matchday.mp4', remotePath: 'videos/bg_matchday.mp4', mime: 'video/mp4' },
];

async function main() {
  console.log(`Connecting to Supabase: ${supabaseUrl}`);

  // Check / create bucket
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Error listing buckets:', listError);
  } else {
    console.log('Existing buckets:', buckets.map(b => b.name));
  }

  const existing = buckets?.find(b => b.name === BUCKET_NAME);
  if (!existing) {
    console.log(`Creating bucket ${BUCKET_NAME}...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['video/mp4', 'video/webm', 'image/png', 'image/jpeg', 'image/webp', 'audio/mpeg']
    });
    if (createError) {
      console.error('Error creating bucket:', createError);
    } else {
      console.log(`Bucket ${BUCKET_NAME} created successfully.`);
    }
  } else {
    console.log(`Bucket ${BUCKET_NAME} exists. Ensuring public access...`);
    if (!existing.public) {
      await supabase.storage.updateBucket(BUCKET_NAME, { public: true });
    }
  }

  for (const item of filesToUpload) {
    const fullLocalPath = path.resolve(item.localPath);
    if (!fs.existsSync(fullLocalPath)) {
      console.warn(`Local file not found: ${item.localPath}`);
      continue;
    }

    const fileStat = fs.statSync(fullLocalPath);
    console.log(`Uploading ${item.localPath} (${(fileStat.size / (1024 * 1024)).toFixed(2)} MB) to ${BUCKET_NAME}/${item.remotePath}...`);

    const fileBuffer = fs.readFileSync(fullLocalPath);
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(item.remotePath, fileBuffer, {
        contentType: item.mime,
        upsert: true,
        cacheControl: '31536000'
      });

    if (error) {
      console.error(`Failed to upload ${item.remotePath}:`, error);
    } else {
      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(item.remotePath);
      console.log(`Uploaded successfully! Public URL: ${urlData.publicUrl}`);

      // Verify HTTP access
      try {
        const res = await fetch(urlData.publicUrl, { method: 'HEAD' });
        console.log(`HTTP Check: ${res.status} ${res.statusText} (${res.headers.get('content-type')}, ${res.headers.get('content-length')} bytes)`);
      } catch (err) {
        console.error(`HTTP check failed for ${urlData.publicUrl}:`, err.message);
      }
    }
  }

  console.log('\nAll media uploads finished!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
