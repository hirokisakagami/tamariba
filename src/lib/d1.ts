import { toD1Like, type D1Like } from './d1-adapter'

// Cloudflare D1 REST API client
class D1RestClient {
  private apiUrl: string
  private headers: Record<string, string>

  constructor() {
    const accountId = process.env.CF_ACCOUNT_ID!
    const databaseId = process.env.CF_D1_DATABASE_ID!
    const apiToken = process.env.CF_API_TOKEN!
    const email = process.env.CF_EMAIL

    if (!accountId || !databaseId || !apiToken) {
      throw new Error('Missing required Cloudflare environment variables')
    }

    this.apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`
    
    if (email) {
      // Global API Key
      this.headers = {
        'Content-Type': 'application/json',
        'X-Auth-Email': email,
        'X-Auth-Key': apiToken,
      }
    } else {
      // API Token
      this.headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      }
    }
  }

  async exec(sql: string, params: any[] = []) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          sql,
          params,
        }),
      })

      if (!response.ok) {
        throw new Error(`D1 API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(`D1 query failed: ${JSON.stringify(data.errors)}`)
      }

      return data.result[0]
    } catch (error) {
      console.error('D1 query error:', error)
      throw error
    }
  }
}

export function getD1Database(): D1Like {
  const rawClient = new D1RestClient()
  return toD1Like(rawClient)
}

// User management functions removed - no auth mode

// Video management functions
export async function createVideo(data: {
  title: string
  description?: string
  cloudflareVideoId: string
  thumbnailUrl?: string
  duration?: number
  userId: string
}) {
  const db = getD1Database()
  const videoId = generateId()
  
  const stmt = db.prepare(`
    INSERT INTO Video (id, title, description, cloudflareVideoId, thumbnailUrl, duration, status, createdAt, updatedAt, userId)
    VALUES (?, ?, ?, ?, ?, ?, 'PROCESSING', datetime('now'), datetime('now'), ?)
  `)
  
  await stmt.bind(
    videoId,
    data.title,
    data.description || null,
    data.cloudflareVideoId,
    data.thumbnailUrl || null,
    data.duration || null,
    data.userId
  ).run()
  
  return videoId
}

export async function getVideosByUserId(userId: string) {
  const db = getD1Database()
  const stmt = db.prepare('SELECT * FROM Video WHERE userId = ? ORDER BY createdAt DESC')
  const result = await stmt.bind(userId).all()
  return result.results
}

export async function deleteVideo(id: string, userId: string) {
  const db = getD1Database()
  const stmt = db.prepare('DELETE FROM Video WHERE id = ? AND userId = ?')
  return await stmt.bind(id, userId).run()
}

export async function updateVideo(id: string, userId: string, data: Partial<{
  title: string
  description: string
  status: string
}>) {
  const db = getD1Database()
  
  const updates = []
  const values = []
  
  if (data.title !== undefined) {
    updates.push('title = ?')
    values.push(data.title)
  }
  if (data.description !== undefined) {
    updates.push('description = ?')
    values.push(data.description)
  }
  if (data.status !== undefined) {
    updates.push('status = ?')
    values.push(data.status)
  }
  
  updates.push('updatedAt = datetime("now")')
  values.push(id, userId)
  
  const stmt = db.prepare(`UPDATE Video SET ${updates.join(', ')} WHERE id = ? AND userId = ?`)
  return await stmt.bind(...values).run()
}

// Section management functions
export async function getSectionsByUserId(userId: string) {
  const db = getD1Database()
  const sql = `
    SELECT s.*, 
           si.id as item_id, si.order as item_order, si.isFeatured as item_featured,
           v.id as video_id, v.title as video_title, v.cloudflareVideoId, v.thumbnailUrl
    FROM Section s
    LEFT JOIN SectionItem si ON s.id = si.sectionId
    LEFT JOIN Video v ON si.videoId = v.id
    WHERE s.userId = ?
    ORDER BY s.order ASC, si.order ASC
  `
  
  const stmt = db.prepare(sql)
  const result = await stmt.bind(userId).all()
  
  // Group results by section
  const sectionsMap = new Map()
  
  for (const row of result.results as any[]) {
    if (!sectionsMap.has(row.id)) {
      sectionsMap.set(row.id, {
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.description,
        isActive: row.isActive,
        order: row.order,
        items: []
      })
    }
    
    if (row.item_id) {
      sectionsMap.get(row.id).items.push({
        id: row.item_id,
        order: row.item_order,
        isFeatured: row.item_featured,
        video: {
          id: row.video_id,
          title: row.video_title,
          cloudflareVideoId: row.cloudflareVideoId,
          thumbnailUrl: row.thumbnailUrl
        }
      })
    }
  }
  
  return Array.from(sectionsMap.values())
}

export async function createSection(data: {
  title: string
  slug: string
  description?: string
  userId: string
}) {
  const db = getD1Database()
  const sectionId = generateId()
  
  // Get max order
  const maxOrderStmt = db.prepare('SELECT MAX("order") as maxOrder FROM Section WHERE userId = ?')
  const maxOrderResult = await maxOrderStmt.bind(data.userId).first() as any
  const order = (maxOrderResult?.maxOrder || 0) + 1
  
  const stmt = db.prepare(`
    INSERT INTO Section (id, title, slug, description, isActive, "order", createdAt, updatedAt, userId)
    VALUES (?, ?, ?, ?, true, ?, datetime('now'), datetime('now'), ?)
  `)
  
  await stmt.bind(sectionId, data.title, data.slug, data.description || null, order, data.userId).run()
  return sectionId
}

// Section Item management
export async function addVideoToSection(sectionId: string, videoId: string, isFeatured: boolean = false) {
  const db = getD1Database()
  const itemId = generateId()
  
  // Get max order for this section
  const maxOrderStmt = db.prepare('SELECT MAX("order") as maxOrder FROM SectionItem WHERE sectionId = ?')
  const maxOrderResult = await maxOrderStmt.bind(sectionId).first() as any
  const order = (maxOrderResult?.maxOrder || 0) + 1
  
  const stmt = db.prepare(`
    INSERT INTO SectionItem (id, "order", isFeatured, createdAt, updatedAt, sectionId, videoId)
    VALUES (?, ?, ?, datetime('now'), datetime('now'), ?, ?)
  `)
  
  await stmt.bind(itemId, order, isFeatured, sectionId, videoId).run()
  return itemId
}

export async function updateSectionItems(sectionId: string, items: Array<{
  id: string
  order: number
  isFeatured: boolean
}>) {
  const db = getD1Database()
  
  // Execute multiple queries sequentially (D1 REST API doesn't support batch)
  for (const item of items) {
    const stmt = db.prepare(`
      UPDATE SectionItem 
      SET "order" = ?, isFeatured = ?, updatedAt = datetime('now')
      WHERE id = ? AND sectionId = ?
    `)
    await stmt.bind(item.order, item.isFeatured, item.id, sectionId).run()
  }
}

export async function deleteSectionItem(itemId: string, sectionId: string) {
  const db = getD1Database()
  const stmt = db.prepare('DELETE FROM SectionItem WHERE id = ? AND sectionId = ?')
  return await stmt.bind(itemId, sectionId).run()
}

// Utility function to generate IDs
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}