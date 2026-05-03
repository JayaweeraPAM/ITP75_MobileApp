import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { store } from '../data/store-mongo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const uploadRouter = Router();

// Configure storage for Multer
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}_${uuidv4().substring(0, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Helper to save base64 data to disk and MongoDB
async function saveBase64File(dataUri, originalFilename) {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/s);
  let mimeType = 'image/jpeg';
  let base64Content = dataUri;

  if (match) {
    mimeType = match[1];
    base64Content = match[2];
  }

  const rawExt = mimeType.split('/')[1]?.split(';')[0] || 'jpg';
  const ext = rawExt === 'quicktime' ? 'mov'
            : rawExt === 'x-msvideo' ? 'avi'
            : rawExt;

  const filename = `${Date.now()}_${uuidv4().substring(0, 8)}.${ext}`;

  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'));

  // Ephemeral fallback persistence: Save to MongoDB too
  await store.uploadedFiles.insertOne({
    id: filename,
    filename,
    originalFilename: originalFilename || filename,
    mimeType,
    base64Content,
    uploadedAt: new Date().toISOString()
  });

  return `/uploads/${filename}`;
}

// POST /api/upload (handles both base64 JSON payload AND Multer multipart file upload)
uploadRouter.post('/', upload.single('file'), async (req, res) => {
  try {
    // If a file was uploaded via Multer
    if (req.file) {
      const filename = req.file.filename;
      const base64Content = fs.readFileSync(req.file.path).toString('base64');

      // Ephemeral fallback persistence: Save to MongoDB too
      await store.uploadedFiles.insertOne({
        id: filename,
        filename,
        originalFilename: req.file.originalname || filename,
        mimeType: req.file.mimetype || 'image/jpeg',
        base64Content,
        uploadedAt: new Date().toISOString()
      });

      return res.status(201).json({ success: true, url: `/uploads/${filename}`, fileUrl: `/uploads/${filename}` });
    }

    // Otherwise, check if it's base64 in the body
    const { photo, image, file, fileBase64, originalFilename } = req.body || {};
    const dataToProcess = photo || image || file || fileBase64;

    if (!dataToProcess || typeof dataToProcess !== 'string') {
      return res.status(400).json({ error: 'No valid image data or base64 string provided' });
    }

    const fileUrl = await saveBase64File(dataToProcess, originalFilename);
    res.status(201).json({ success: true, url: fileUrl, fileUrl });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// POST /api/upload-image (handles both base64 JSON payload AND Multer multipart file upload)
uploadRouter.post('/image', upload.single('file'), async (req, res) => {
  try {
    // If a file was uploaded via Multer
    if (req.file) {
      const filename = req.file.filename;
      const base64Content = fs.readFileSync(req.file.path).toString('base64');

      // Ephemeral fallback persistence: Save to MongoDB too
      await store.uploadedFiles.insertOne({
        id: filename,
        filename,
        originalFilename: req.file.originalname || filename,
        mimeType: req.file.mimetype || 'image/jpeg',
        base64Content,
        uploadedAt: new Date().toISOString()
      });

      return res.status(201).json({ success: true, url: `/uploads/${filename}`, fileUrl: `/uploads/${filename}` });
    }

    // Otherwise, check if it's base64 in the body
    const { photo, image, file, fileBase64, originalFilename } = req.body || {};
    const dataToProcess = photo || image || file || fileBase64;

    if (!dataToProcess || typeof dataToProcess !== 'string') {
      return res.status(400).json({ error: 'No valid image data or base64 string provided' });
    }

    const fileUrl = await saveBase64File(dataToProcess, originalFilename);
    res.status(201).json({ success: true, url: fileUrl, fileUrl });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});
