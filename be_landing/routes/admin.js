import { id } from '@instantdb/core'
import db from '../libs/admin_db.js'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import r2Client from '../libs/r2.js'

export default async function (fastify, opts) {

  // Admin login page
  fastify.get('/admin', async function (request, reply) {
    return reply.view('admin/login', {
      title: 'Admin Login - FutKui',
      appId: process.env.INSTANT_APP_ID,
      lang: 'en'
    })
  })

  // Admin logout
  fastify.post('/admin/logout', async function (request, reply) {
    reply.clearCookie('admin_token', { path: '/' })
    return reply.redirect('/admin')
  })

  // Upload avatar image
  fastify.post('/admin/upload-avatar', {
    onRequest: [fastify.authenticate, fastify.requireAdmin]
  }, async function (request, reply) {
    try {
      // Check content-type
      const contentType = request.headers['content-type'];
      if (!contentType || !contentType.includes('multipart/form-data')) {
        return reply.status(400).send({
          error: 'Invalid content type. Expected multipart/form-data',
          received: contentType
        });
      }

      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'No file provided' });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Invalid file type. Only images allowed.' });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomHash = Math.random().toString(36).substring(2, 8);
      const extension = data.filename.split('.').pop();
      const uniqueFilename = `avatars/${timestamp}-${randomHash}.${extension}`;

      // Convert stream to buffer
      const buffer = await data.toBuffer();

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: uniqueFilename,
        Body: buffer,
        ContentType: data.mimetype
      });

      await r2Client.send(command);

      // Generate public URL
      const publicUrl = `https://${process.env.R2_PUBLIC_DOMAIN}/${uniqueFilename}`;

      return reply.send({ url: publicUrl });
    } catch (error) {
      fastify.log.error('Error uploading avatar:', error);
      return reply.status(500).send({
        error: 'Failed to upload avatar',
        message: error.message
      });
    }
  })

  // Admin dashboard - profile list
  fastify.get('/admin/dashboard', {
    onRequest: [fastify.authenticate, fastify.requireAdmin]
  }, async function (request, reply) {
    try {
      const { search, page = 1, limit = 50 } = request.query
      const offset = (page - 1) * limit

      // Query profiles
      const query = {
        profiles: {
          user: {},
          memberships: {
            group: {}
          }
        }
      }

      const result = await db.query(query)
      let profiles = result.profiles || []

      // Filter by search term
      if (search) {
        const searchLower = search.toLowerCase()
        profiles = profiles.filter(p =>
          p.handle?.toLowerCase().includes(searchLower) ||
          p.displayName?.toLowerCase().includes(searchLower) ||
          p.user?.email?.toLowerCase().includes(searchLower)
        )
      }

      const total = profiles.length
      const totalPages = Math.ceil(total / limit)
      profiles = profiles.slice(offset, offset + parseInt(limit))

      return reply.view('admin/dashboard', {
        title: 'Admin Dashboard - FutKui',
        profiles,
        total,
        page: parseInt(page),
        totalPages,
        limit: parseInt(limit),
        search: search || '',
        user: request.user,
        profile: request.profile,
        lang: 'en'
      })
    } catch (error) {
      fastify.log.error('Error loading dashboard:', error)
      return reply.status(500).send('Error loading dashboard')
    }
  })

  // Create profile form
  fastify.get('/admin/profiles/new', {
    onRequest: [fastify.authenticate, fastify.requireAdmin]
  }, async function (request, reply) {
    return reply.view('admin/profile-form', {
      title: 'Create Profile - FutKui Admin',
      profile: null,
      isEdit: false,
      user: request.user,
      adminProfile: request.profile,
      lang: 'en'
    })
  })

  // Handle profile creation
  fastify.post('/admin/profiles/create', {
    onRequest: [fastify.authenticate, fastify.requireAdmin]
  }, async function (request, reply) {
    try {
      const {
        handle,
        displayName,
        description,
        type,
        avatarUrl,
        level,
        location,
        userEmail,
        photos,
        sports
      } = request.body

      // Validate required fields
      if (!handle) {
        return reply.status(400).send('Handle is required')
      }

      // Check if handle already exists
      const existingQuery = {
        profiles: {
          $: {
            where: { handle }
          }
        }
      }
      const existingResult = await db.query(existingQuery)
      if (existingResult.profiles?.length > 0) {
        return reply.status(400).send('Handle already exists')
      }

      const profileId = id()

      // Parse photos JSON
      let photosArray = []
      try {
        photosArray = photos ? JSON.parse(photos) : []
      } catch (e) {
        photosArray = []
      }

      // Parse sports JSON
      let sportsArray = []
      try {
        sportsArray = sports ? JSON.parse(sports) : []
      } catch (e) {
        sportsArray = []
      }

      const transactions = [
        db.tx.profiles[profileId].update({
          handle,
          displayName: displayName || null,
          description: description || null,
          type: type || 'user',
          avatarUrl: avatarUrl || null,
          level: level || null,
          location: location || null,
          photos: photosArray.length > 0 ? photosArray : null,
          sports: sportsArray.length > 0 ? sportsArray : null,
          createdAt: Date.now()
        })
      ]

      // Link to user if email provided
      if (userEmail) {
        const userQuery = {
          $users: {
            $: {
              where: { email: userEmail }
            }
          }
        }
        const userResult = await db.query(userQuery)
        const user = userResult.$users?.[0]

        if (user) {
          transactions.push(
            db.tx.profiles[profileId].link({ user: user.id })
          )
        }
      }

      await db.transact(transactions)

      return reply.redirect('/admin/dashboard')
    } catch (error) {
      fastify.log.error('Error creating profile:', error)
      return reply.status(500).send('Error creating profile')
    }
  })

  // Edit profile form
  fastify.get('/admin/profiles/:id', {
    onRequest: [fastify.authenticate, fastify.requireAdmin]
  }, async function (request, reply) {
    try {
      const { id } = request.params

      const query = {
        profiles: {
          $: {
            where: { id }
          },
          user: {},
          memberships: {
            group: {}
          }
        }
      }

      const result = await db.query(query)
      const profile = result.profiles?.[0]

      if (!profile) {
        return reply.status(404).send('Profile not found')
      }

      return reply.view('admin/profile-form', {
        title: 'Edit Profile - FutKui Admin',
        profile,
        isEdit: true,
        user: request.user,
        adminProfile: request.profile,
        lang: 'en'
      })
    } catch (error) {
      fastify.log.error('Error loading profile:', error)
      return reply.status(500).send('Error loading profile')
    }
  })

  // Handle profile update
  fastify.post('/admin/profiles/:id/update', {
    onRequest: [fastify.authenticate, fastify.requireAdmin]
  }, async function (request, reply) {
    try {
      const { id } = request.params
      const {
        handle,
        displayName,
        description,
        type,
        avatarUrl,
        level,
        location,
        photos,
        sports
      } = request.body

      // Validate required fields
      if (!handle) {
        return reply.status(400).send('Handle is required')
      }

      // Check if handle is taken by another profile
      const existingQuery = {
        profiles: {
          $: {
            where: { handle }
          }
        }
      }
      const existingResult = await db.query(existingQuery)
      const existingProfile = existingResult.profiles?.find(p => p.id !== id)
      if (existingProfile) {
        return reply.status(400).send('Handle already exists')
      }

      // Parse photos JSON
      let photosArray = []
      try {
        photosArray = photos ? JSON.parse(photos) : []
      } catch (e) {
        photosArray = []
      }

      // Parse sports JSON
      let sportsArray = []
      try {
        sportsArray = sports ? JSON.parse(sports) : []
      } catch (e) {
        sportsArray = []
      }

      await db.transact([
        db.tx.profiles[id].update({
          handle,
          displayName: displayName || null,
          description: description || null,
          type: type || 'user',
          avatarUrl: avatarUrl || null,
          level: level || null,
          location: location || null,
          photos: photosArray.length > 0 ? photosArray : null,
          sports: sportsArray.length > 0 ? sportsArray : null
        })
      ])

      return reply.redirect('/admin/dashboard')
    } catch (error) {
      fastify.log.error('Error updating profile:', error)
      return reply.status(500).send('Error updating profile')
    }
  })

  // Handle profile deletion
  fastify.post('/admin/profiles/:id/delete', {
    onRequest: [fastify.authenticate, fastify.requireAdmin]
  }, async function (request, reply) {
    try {
      const { id } = request.params

      await db.transact([
        db.tx.profiles[id].delete()
      ])

      return reply.redirect('/admin/dashboard')
    } catch (error) {
      fastify.log.error('Error deleting profile:', error)
      return reply.status(500).send('Error deleting profile')
    }
  })
}
