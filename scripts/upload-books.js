const fs = require('fs');
const path = require('path');

const API_KEY = 'AIzaSyAykYYGjerIf4tdTT3hUkJXv7gWMFtkjv0';
const UPLOAD_URL = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${API_KEY}`;
const KNOWLEDGE_DIR = path.join(__dirname, '..', 'knowledge');
const OUTPUT_FILE = path.join(KNOWLEDGE_DIR, 'file-refs.json');

// Map filename fragments to clean JSON keys
function toKey(filename) {
  const name = path.basename(filename, '.pdf').toLowerCase();
  if (name.includes('art of seduction') || name.includes('art_of_seduction')) return 'art_of_seduction';
  if (name.includes('48 laws') || name.includes('48_laws'))                   return '48_laws';
  if (name.includes('totem'))                                                  return 'totem_taboo';
  if (name.includes('dark psych') || name.includes('dark_psych'))             return 'dark_psychology';
  if (name.includes('laws of human') || name.includes('laws_of_human'))       return 'laws_of_human_nature';
  if (name.includes('evolution of desire') || name.includes('evolution_of_desire')) return 'The_Evolution_of_Desire';
  if (name.includes('what every body') || name.includes('what everybody') || name.includes('what-everybody') || name.includes('navarro')) return 'what_everybody_is_saying';
  // fallback: sanitize the filename
  return name.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

async function uploadFile(filePath) {
  const filename = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  const mimeType = 'application/pdf';
  const boundary = '----DarkoBoundary' + Date.now();

  const metadataJson = JSON.stringify({ file: { display_name: filename } });

  // Build multipart/related body
  const bodyParts = [
    `--${boundary}\r\n`,
    `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
    `${metadataJson}\r\n`,
    `--${boundary}\r\n`,
    `Content-Type: ${mimeType}\r\n\r\n`,
  ];

  const bodyPrefix = Buffer.from(bodyParts.join(''));
  const bodySuffix = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([bodyPrefix, fileBuffer, bodySuffix]);

  console.log(`\n[DARKO] Uploading: ${filename} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);

  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': body.length.toString(),
      'X-Goog-Upload-Protocol': 'multipart',
    },
    body,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HTTP ${response.status} for ${filename}: ${err}`);
  }

  const data = await response.json();
  const uri = data?.file?.uri;
  if (!uri) throw new Error(`No URI in response for ${filename}: ${JSON.stringify(data)}`);

  console.log(`[DARKO] Done: ${filename}`);
  console.log(`        URI: ${uri}`);
  return uri;
}

async function main() {
  const pdfs = fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));

  if (pdfs.length === 0) {
    console.log('[DARKO] No PDF files found in /knowledge. Aborting.');
    process.exit(1);
  }

  console.log(`[DARKO] Found ${pdfs.length} PDF(s) to upload.`);

  const refs = {};

  for (const pdf of pdfs) {
    const filePath = path.join(KNOWLEDGE_DIR, pdf);
    const key = toKey(pdf);
    try {
      const uri = await uploadFile(filePath);
      refs[key] = uri;
    } catch (err) {
      console.error(`[DARKO] FAILED: ${pdf} — ${err.message}`);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(refs, null, 2));
  console.log(`\n[DARKO] Saved file refs to knowledge/file-refs.json`);
  console.log(JSON.stringify(refs, null, 2));
}

main();
