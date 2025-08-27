import { init } from '@instantdb/admin'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'

export default async function (fastify, opts) {
  // Initialize InstantDB admin - you'll need to set these environment variables
  const db = init({
    appId: process.env.INSTANT_APP_ID,
    adminToken: process.env.INSTANT_ADMIN_TOKEN
  })

  // Initialize R2 client
  const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  })

  // POST /api/upload-url - Generate signed upload URL for R2
  fastify.post('/api/upload-url', async function (request, reply) {
    try {
      const { filename, contentType, fileSize } = request.body

      if (!filename || !contentType) {
        return reply.code(400).send({
          error: 'Missing required fields: filename and contentType'
        })
      }

      // Validate file size (max 10MB)
      if (fileSize && fileSize > 10 * 1024 * 1024) {
        return reply.code(400).send({
          error: 'File size too large. Maximum 10MB allowed.'
        })
      }

      // Validate content type (images only)
      if (!contentType.startsWith('image/')) {
        return reply.code(400).send({
          error: 'Only image files are allowed'
        })
      }

      // Generate unique filename with timestamp and hash
      const timestamp = Date.now()
      const randomHash = crypto.randomBytes(8).toString('hex')
      const extension = filename.split('.').pop()
      const uniqueFilename = `${timestamp}-${randomHash}.${extension}`

      // Create the upload command
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: uniqueFilename,
        ContentType: contentType,
        ContentLength: fileSize
      })

      // Generate signed URL (valid for 10 minutes)
      const uploadUrl = await getSignedUrl(r2Client, command, {
        expiresIn: 600
      })

      // Generate public URL for the uploaded file
      const publicUrl = `https://${process.env.R2_PUBLIC_DOMAIN}/${uniqueFilename}`

      return reply.send({
        uploadUrl,
        publicUrl,
        filename: uniqueFilename
      })

    } catch (error) {
      fastify.log.error('Error generating upload URL:', error)
      return reply.code(500).send({
        error: 'Failed to generate upload URL'
      })
    }
  })

  // DELETE /api/account - Delete user account
  fastify.delete('/api/account', {
    preHandler: fastify.authenticate
  }, async function (request, reply) {
    try {
      // Get authenticated user from the bearer token
      const authenticatedUser = request.user
      
      if (!authenticatedUser) {
        return reply.code(401).send({ 
          error: 'Authentication required' 
        })
      }

      // Delete the authenticated user's account
      const result = await db.auth.deleteUser({ id: authenticatedUser.id })

      if (result.error) {
        fastify.log.error('Failed to delete user account:', result.error)
        return reply.code(400).send({ 
          error: 'Failed to delete account',
          details: result.error 
        })
      }

      return reply.send({ 
        success: true, 
        message: 'Account deleted successfully',
        deletedUser: result.user
      })
    } catch (error) {
      fastify.log.error('Error deleting account:', error)
      return reply.code(500).send({ 
        error: 'Internal server error while deleting account' 
      })
    }
  })

  // GET /api/reports - Get all reports (admin only)
  fastify.get('/api/reports', {
    preHandler: fastify.authenticate
  }, async function (request, reply) {
    try {
      // Get authenticated user from the bearer token
      const authenticatedUser = request.user
      
      if (!authenticatedUser) {
        return reply.code(401).send({ 
          error: 'Authentication required' 
        })
      }

      // For now, we'll assume admin checking is done on frontend
      // In production, you'd want to add proper admin role checking here

      const reports = await db.query({
        reports: {
          reporter: {},
          message: {
            author: {},
            group: {}
          },
          reportedUser: {}
        }
      })

      return reply.send({
        success: true,
        reports: reports.reports || []
      })
    } catch (error) {
      fastify.log.error('Error fetching reports:', error)
      return reply.code(500).send({ 
        error: 'Internal server error while fetching reports' 
      })
    }
  })

  // PATCH /api/reports/:reportId - Update report status (admin only)
  fastify.patch('/api/reports/:reportId', {
    preHandler: fastify.authenticate
  }, async function (request, reply) {
    try {
      // Get authenticated user from the bearer token
      const authenticatedUser = request.user
      
      if (!authenticatedUser) {
        return reply.code(401).send({ 
          error: 'Authentication required' 
        })
      }

      const { reportId } = request.params
      const { status, adminNotes } = request.body

      if (!status || !['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
        return reply.code(400).send({
          error: 'Invalid status. Must be one of: pending, reviewed, resolved, dismissed'
        })
      }

      const updateData = {
        status,
        adminNotes: adminNotes || null
      }

      if (status === 'resolved' || status === 'dismissed') {
        updateData.resolvedAt = Date.now()
      }

      const result = await db.transact([
        db.tx.reports[reportId].update(updateData)
      ])

      return reply.send({
        success: true,
        message: 'Report updated successfully'
      })
    } catch (error) {
      fastify.log.error('Error updating report:', error)
      return reply.code(500).send({ 
        error: 'Internal server error while updating report' 
      })
    }
  })
}