import { randomUUID } from 'node:crypto'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../config/env.js'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number]

function isConfigured() {
  return (
    !!env.R2_ACCOUNT_ID &&
    !!env.R2_ACCESS_KEY_ID &&
    !!env.R2_SECRET_ACCESS_KEY &&
    !!env.R2_BUCKET &&
    !!env.R2_PUBLIC_BASE_URL
  )
}

export function isAvatarStorageConfigured() {
  return isConfigured()
}

function ensureConfigured() {
  if (!isConfigured()) {
    throw new Error('Avatar storage is not configured')
  }
}

function createClient() {
  ensureConfigured()

  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

function extFromContentType(contentType: AllowedImageType) {
  if (contentType === 'image/jpeg') return 'jpg'
  if (contentType === 'image/png') return 'png'
  return 'webp'
}

export function isAllowedAvatarType(contentType: string): contentType is AllowedImageType {
  return ALLOWED_IMAGE_TYPES.includes(contentType as AllowedImageType)
}

export async function createChildAvatarUploadUrl(params: {
  campId: string
  squadId: string
  contentType: AllowedImageType
}) {
  const client = createClient()
  const extension = extFromContentType(params.contentType)
  const objectKey = `children/${params.campId}/${params.squadId}/${randomUUID()}.${extension}`

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.R2_BUCKET!,
      Key: objectKey,
      ContentType: params.contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
    { expiresIn: 300 },
  )

  const publicBase = env.R2_PUBLIC_BASE_URL!.replace(/\/+$/, '')

  return {
    uploadUrl,
    photoUrl: `${publicBase}/${objectKey}`,
    objectKey,
    expiresInSeconds: 300,
    allowedContentTypes: ALLOWED_IMAGE_TYPES,
  }
}

export async function createSquadAvatarUploadUrl(params: {
  campId: string
  contentType: AllowedImageType
}) {
  const client = createClient()
  const extension = extFromContentType(params.contentType)
  const objectKey = `squads/${params.campId}/${randomUUID()}.${extension}`

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.R2_BUCKET!,
      Key: objectKey,
      ContentType: params.contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
    { expiresIn: 300 },
  )

  const publicBase = env.R2_PUBLIC_BASE_URL!.replace(/\/+$/, '')

  return {
    uploadUrl,
    photoUrl: `${publicBase}/${objectKey}`,
    objectKey,
    expiresInSeconds: 300,
    allowedContentTypes: ALLOWED_IMAGE_TYPES,
  }
}

export async function createRewardAvatarUploadUrl(params: {
  campId: string
  contentType: AllowedImageType
}) {
  const client = createClient()
  const extension = extFromContentType(params.contentType)
  const objectKey = `rewards/${params.campId}/${randomUUID()}.${extension}`

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.R2_BUCKET!,
      Key: objectKey,
      ContentType: params.contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
    { expiresIn: 300 },
  )

  const publicBase = env.R2_PUBLIC_BASE_URL!.replace(/\/+$/, '')

  return {
    uploadUrl,
    photoUrl: `${publicBase}/${objectKey}`,
    objectKey,
    expiresInSeconds: 300,
    allowedContentTypes: ALLOWED_IMAGE_TYPES,
  }
}

export async function createRewardItemAvatarUploadUrl(params: {
  campId: string
  contentType: AllowedImageType
}) {
  const client = createClient()
  const extension = extFromContentType(params.contentType)
  const objectKey = `reward-items/${params.campId}/${randomUUID()}.${extension}`

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.R2_BUCKET!,
      Key: objectKey,
      ContentType: params.contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
    { expiresIn: 300 },
  )

  const publicBase = env.R2_PUBLIC_BASE_URL!.replace(/\/+$/, '')

  return {
    uploadUrl,
    photoUrl: `${publicBase}/${objectKey}`,
    objectKey,
    expiresInSeconds: 300,
    allowedContentTypes: ALLOWED_IMAGE_TYPES,
  }
}

export async function createUserAvatarUploadUrl(params: {
  campId: string
  contentType: AllowedImageType
}) {
  const client = createClient()
  const extension = extFromContentType(params.contentType)
  const objectKey = `users/${params.campId}/${randomUUID()}.${extension}`

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.R2_BUCKET!,
      Key: objectKey,
      ContentType: params.contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
    { expiresIn: 300 },
  )

  const publicBase = env.R2_PUBLIC_BASE_URL!.replace(/\/+$/, '')

  return {
    uploadUrl,
    photoUrl: `${publicBase}/${objectKey}`,
    objectKey,
    expiresInSeconds: 300,
    allowedContentTypes: ALLOWED_IMAGE_TYPES,
  }
}