import * as Crypto from 'expo-crypto'
import { File } from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import { createCapturedEvidence, EvidenceItem } from '@/features/cases/model'

type CaptureResult = {
  evidence?: EvidenceItem
  error?: string
}

export async function capturePhotoEvidence(label: string): Promise<CaptureResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync()
  if (!permission.granted) {
    return { error: 'נדרשת הרשאת מצלמה כדי לתעד ראיה חדשה' }
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
    exif: false,
  })

  if (result.canceled || !result.assets[0]) return {}
  return { evidence: await evidenceFromAsset(label, result.assets[0]) }
}

export async function pickPhotoEvidence(label: string): Promise<CaptureResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) {
    return { error: 'נדרשת הרשאת גלריה כדי לצרף ראיה קיימת' }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
    exif: false,
  })

  if (result.canceled || !result.assets[0]) return {}
  return { evidence: await evidenceFromAsset(label, result.assets[0]) }
}

async function evidenceFromAsset(label: string, asset: ImagePicker.ImagePickerAsset): Promise<EvidenceItem> {
  const bytes = await new File(asset.uri).bytes()
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes)
  const hash = toHex(digest)

  return createCapturedEvidence({
    label,
    type: 'photo',
    sourceUri: asset.uri,
    mimeType: asset.mimeType,
    sizeBytes: asset.fileSize,
    hash,
  })
}

function toHex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('')
}