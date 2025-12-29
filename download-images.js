// download-images.js
// Downloads book cover images from Airtable and saves them locally

const fs = require('fs');
const path = require('path');

const BASE_ID = 'app12LraPjbTp4fHG';
const TABLE_NAME = 'Books read';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

// Create images directory if it doesn't exist
const IMAGES_DIR = path.join(__dirname, 'images');
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR);
  console.log('✓ Created images/ directory');
}

// Require a token
if (!AIRTABLE_TOKEN) {
  console.error('❌ Missing AIRTABLE_TOKEN. Set it locally or in GitHub Actions secrets.');
  process.exit(1);
}

// Generate a safe filename from book title
function sanitizeFilename(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
    .substring(0, 100);             // Limit length
}

// Download an image from URL
async function downloadImage(url, filepath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(filepath, Buffer.from(buffer));
}

// Fetch all records from Airtable (handles pagination)
async function fetchAllRecords() {
  let allRecords = [];
  let offset = null;
  
  do {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}${
      offset ? `?offset=${offset}` : ''
    }`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch records (status ${response.status})`);
    }
    
    const data = await response.json();
    allRecords = allRecords.concat(data.records || []);
    offset = data.offset;
  } while (offset);
  
  return allRecords;
}

// Main function
async function downloadAllImages() {
  console.log('Starting image download...\n');
  
  try {
    const records = await fetchAllRecords();
    console.log(`Found ${records.length} total records in Airtable\n`);
    
    let downloaded = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const record of records) {
      const fields = record.fields || {};
      const titleAuthor = fields['Title author'];
      const coverImage = fields['Cover image'];
      
      if (!titleAuthor) {
        console.log('⚠️  Skipping record with no title');
        skipped++;
        continue;
      }
      
      if (!coverImage || !coverImage[0]?.url) {
        console.log(`⚠️  No image for: ${titleAuthor}`);
        skipped++;
        continue;
      }
      
      const imageUrl = coverImage[0].url;
      const extension = path.extname(coverImage[0].filename || '.jpg');
      const filename = sanitizeFilename(titleAuthor) + extension;
      const filepath = path.join(IMAGES_DIR, filename);
      
      // Skip if already exists
      if (fs.existsSync(filepath)) {
        console.log(`✓ Already exists: ${filename}`);
        skipped++;
        continue;
      }
      
      // Download the image
      try {
        await downloadImage(imageUrl, filepath);
        console.log(`✓ Downloaded: ${filename}`);
        downloaded++;
      } catch (err) {
        console.error(`✗ Failed to download ${titleAuthor}: ${err.message}`);
        errors++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Downloaded: ${downloaded}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log(`\n✓ Image download complete!`);
    
    if (downloaded > 0) {
      console.log('\nNext steps:');
      console.log('1. Run: node build.js');
      console.log('2. Commit: git add images/ *.html');
      console.log('3. Push: git push');
    }
    
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

downloadAllImages();
