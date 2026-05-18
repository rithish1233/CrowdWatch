const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BUCKET = 'crowd-watch-media';

/**
 * Upload a file buffer to Supabase Storage
 * @param {Buffer} buffer - file data
 * @param {string} filePath - storage path e.g. "placeId/uuid.jpg"
 * @param {string} mimeType - file MIME type
 * @returns {{ url: string, path: string }}
 */
const uploadToSupabase = async (buffer, filePath, mimeType) => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data: publicData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  return {
    url: publicData.publicUrl,
    path: filePath,
  };
};

/**
 * Delete a file from Supabase Storage
 */
const deleteFromSupabase = async (filePath) => {
  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (error) {
    console.error('Supabase delete error:', error.message);
  }
};

module.exports = { uploadToSupabase, deleteFromSupabase, supabase };
