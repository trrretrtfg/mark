import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { LIMITS } from '../constants/config';
import { requestUploadUrls, uploadToSigned, addMedia } from './api';

export async function pickImages(max = LIMITS.maxImages) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { denied: true, assets: [] };
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: max,
    orderedSelection: true,
    quality: 1,
  });
  if (res.canceled) return { denied: false, assets: [] };
  return { denied: false, assets: res.assets.slice(0, max) };
}

async function resized(uri, srcW, srcH, longSide, quality) {
  const w = srcW || 0;
  const h = srcH || 0;
  const actions = [];
  if (w && h && Math.max(w, h) > longSide) {
    actions.push(w >= h ? { resize: { width: longSide } } : { resize: { height: longSide } });
  }
  return ImageManipulator.manipulateAsync(uri, actions, {
    compress: quality,
    format: ImageManipulator.SaveFormat.JPEG,
  });
}

async function toBytes(uri) {
  const r = await fetch(uri);
  return r.arrayBuffer();
}

// يضغط كل صورة (نسخة كاملة + مصغّرة) ويرفعها ثم يسجّلها في الذكرى.
// onProgress(done, total)
export async function uploadMemoryImages(memoryId, assets, onProgress) {
  const urls = await requestUploadUrls(memoryId, assets.length);
  let done = 0;
  for (let i = 0; i < assets.length; i++) {
    const a = assets[i];
    const slot = urls.items[i];
    const full = await resized(a.uri, a.width, a.height, 1800, 0.85);
    const thumb = await resized(a.uri, a.width, a.height, 480, 0.7);
    const [fullBytes, thumbBytes] = await Promise.all([toBytes(full.uri), toBytes(thumb.uri)]);
    await uploadToSigned(slot.path, slot.token, fullBytes);
    await uploadToSigned(slot.thumb_path, slot.thumb_token, thumbBytes);
    await addMedia(
      memoryId,
      { path: slot.path, thumb_path: slot.thumb_path, width: full.width, height: full.height, bytes: fullBytes.byteLength },
      i,
    );
    done += 1;
    if (onProgress) onProgress(done, assets.length);
  }
}
