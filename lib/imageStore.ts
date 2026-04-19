import * as FileSystem from 'expo-file-system/legacy';

/**
 * Returns true if the URI is a local file URI (starts with 'file://').
 * Returns false for http://, https://, or any other scheme.
 */
export function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://');
}

/**
 * Copies an image from a temporary URI to the app's permanent local documents directory.
 * Returns the permanent local file URI.
 * Throws if the copy fails — caller is responsible for handling the error.
 *
 * Storage path: ${FileSystem.documentDirectory}plants/<uuid>.<ext>
 */
export async function saveImage(sourceUri: string): Promise<string> {
  // Generate a UUID filename with fallback for environments without crypto.randomUUID
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);

  // Infer extension from source URI
  const ext = sourceUri.endsWith('.png') ? '.png' : '.jpg';

  const dir = FileSystem.documentDirectory ?? 'file:///data/user/0/com.myplants/files/';
  const destinationUri = `${dir}plants/${uuid}${ext}`;

  await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });

  return destinationUri;
}

/**
 * Deletes a local image file.
 * If the URI is not a local file URI, logs a warning and returns without deleting.
 * Catches and logs any errors from deleteAsync — does NOT throw.
 */
export async function deleteImage(localUri: string): Promise<void> {
  if (!isLocalUri(localUri)) {
    console.warn('ImageStore: skipping delete for non-local URI:', localUri);
    return;
  }

  try {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  } catch (e) {
    console.warn('ImageStore: failed to delete image:', e);
  }
}
