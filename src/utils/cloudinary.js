const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'sirin-dad/products', resource_type: 'image', transformation: [{ width: 1200, crop: 'limit' }] },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

async function deleteByUrl(url) {
  try {
    // Extract public_id from a Cloudinary URL of the form .../sirin-dad/products/xxxx.jpg
    const match = url.match(/sirin-dad\/products\/[^./]+/);
    if (!match) return;
    await cloudinary.uploader.destroy(match[0]);
  } catch (err) {
    console.error('[cloudinary] Şəkil silinərkən xəta:', err.message);
  }
}

module.exports = { uploadBuffer, deleteByUrl };
