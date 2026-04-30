import * as Crypto from 'expo-crypto'
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
  const hashInput = [asset.uri, asset.fileName, asset.fileSize, asset.width, asset.height, Date.now()].join(':')
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, hashInput)

  return createCapturedEvidence({
    label,
    type: 'photo',
    sourceUri: asset.uri,
    mimeType: asset.mimeType,
    sizeBytes: asset.fileSize,
    hash,
  })
}