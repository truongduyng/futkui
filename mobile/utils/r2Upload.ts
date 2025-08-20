// R2 direct upload utility using signed URLs

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface UploadResponse {
  uploadUrl: string;
  publicUrl: string;
  filename: string;
}

export async function uploadToR2(uri: string, filename: string): Promise<string> {
  try {
    // Get file info
    const response = await fetch(uri);
    const blob = await response.blob();

    // Get signed upload URL from backend
    const uploadUrlResponse = await fetch(`${BACKEND_URL}/api/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        contentType: blob.type,
        fileSize: blob.size,
      }),
    });

    if (!uploadUrlResponse.ok) {
      const error = await uploadUrlResponse.json();
      throw new Error(error.error || 'Failed to get upload URL');
    }

    const uploadData: UploadResponse = await uploadUrlResponse.json();

    console.log('Upload URL received:', uploadData.uploadUrl);

    // Upload file directly to R2 using signed URL
    const uploadResponse = await fetch(uploadData.uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': blob.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to R2');
    }

    // Return the public URL
    return uploadData.publicUrl;
  } catch (error) {
    console.error('R2 upload error:', error);
    throw error;
  }
}
