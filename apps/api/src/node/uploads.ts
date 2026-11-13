import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { UploadStore } from '../types'
import type { UploadConfig } from './config'

export function createUploadStore(config?: UploadConfig): UploadStore {
  if (!config) return {
    async put() { throw new Error('Uploads are not configured') },
    async get() { throw new Error('Uploads are not configured') },
  }
  const client = new S3Client({
    endpoint: config.endpoint, region: 'auto', forcePathStyle: config.pathStyle,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
  })
  return {
    async put(key, body, options) {
      await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: new Uint8Array(body), ContentType: options.httpMetadata.contentType }))
    },
    async get(key) {
      try {
        const object = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }))
        if (!object.Body) throw new Error('Storage returned an empty response')
        return {
          body: object.Body.transformToWebStream() as ReadableStream,
          httpEtag: object.ETag ?? '',
          writeHttpMetadata(headers) { if (object.ContentType) headers.set('content-type', object.ContentType) },
        }
      } catch (error) {
        if ((error as { name?: string }).name === 'NoSuchKey') return null
        throw error
      }
    },
  }
}
