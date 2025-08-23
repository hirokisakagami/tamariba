import { createClient } from '@cloudflare/d1'
import type { D1Database } from '@cloudflare/workers-types'
import { toD1Like } from './d1-adapter'

export function getD1Database(): D1Database {
  const db = createClient({
    accountId: process.env.CF_ACCOUNT_ID!,
    databaseId: process.env.CF_D1_DATABASE_ID!,
    token: process.env.CF_API_TOKEN!,
  })
  return db
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
  const db = toD1Like(getD1Database() as any)
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
  const db = toD1Like(getD1Database() as any)
  const stmt = db.prepare('SELECT * FROM Video WHERE userId = ? ORDER BY createdAt DESC')
  const result = await stmt.bind(userId).all()
  return result.results
}

export async function deleteVideo(id: string, userId: string) {
  const db = toD1Like(getD1Database() as any)
  const stmt = db.prepare('DELETE FROM Video WHERE id = ? AND userId = ?')
  return await stmt.bind(id, userId).run()
}

export async function updateVideo(id: string, userId: string, data: Partial<{
  title: string
  description: string
  status: string
}>) {
  const db = toD1Like(getD1Database() as any)
  
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
  const db = toD1Like(getD1Database() as any)
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
  const db = toD1Like(getD1Database() as any)
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
  const db = toD1Like(getD1Database() as any)
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
  const db = toD1Like(getD1Database() as any)
  
  const statements = items.map(item => {
    const stmt = db.prepare(`
      UPDATE SectionItem 
      SET "order" = ?, isFeatured = ?, updatedAt = datetime('now')
      WHERE id = ? AND sectionId = ?
    `)
    return stmt.bind(item.order, item.isFeatured, item.id, sectionId)
  })
  
  await db.batch(statements)
}

export async function deleteSectionItem(itemId: string, sectionId: string) {
  const db = toD1Like(getD1Database() as any)
  const stmt = db.prepare('DELETE FROM SectionItem WHERE id = ? AND sectionId = ?')
  return await stmt.bind(itemId, sectionId).run()
}

// Utility function to generate IDs
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}