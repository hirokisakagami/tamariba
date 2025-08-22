// Cloudflare D1 client compatible with prepare/bind/first API

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(colName?: string): Promise<T | null>
  run(): Promise<D1Result>
  all<T = unknown>(): Promise<D1Result<T>>
  raw<T = unknown>(): Promise<T[]>
}

interface D1Result<T = unknown> {
  results: T[]
  success: boolean
  meta: {
    duration: number
    size_after: number
    rows_read: number
    rows_written: number
  }
}

class D1HttpClient {
  private apiUrl: string
  private headers: Record<string, string>

  constructor() {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID
    const apiToken = process.env.CLOUDFLARE_API_TOKEN
    const email = process.env.CLOUDFLARE_EMAIL

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

  prepare(sql: string): D1PreparedStatement {
    return new D1HttpPreparedStatement(sql, this.apiUrl, this.headers)
  }

  async exec(sql: string) {
    return this.prepare(sql).run()
  }

  async batch(statements: D1PreparedStatement[]) {
    // Execute sequentially for HTTP API
    const results = []
    for (const stmt of statements) {
      results.push(await stmt.run())
    }
    return results
  }
}

class D1HttpPreparedStatement implements D1PreparedStatement {
  private sql: string
  private params: unknown[] = []
  private apiUrl: string
  private headers: Record<string, string>

  constructor(sql: string, apiUrl: string, headers: Record<string, string>) {
    this.sql = sql
    this.apiUrl = apiUrl
    this.headers = headers
  }

  bind(...values: unknown[]): D1PreparedStatement {
    this.params = values
    return this
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    const result = await this.execute()
    return result.results[0] || null
  }

  async run(): Promise<D1Result> {
    return this.execute()
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    return this.execute<T>()
  }

  async raw<T = unknown>(): Promise<T[]> {
    const result = await this.execute<T>()
    return result.results
  }

  private async execute<T = unknown>(): Promise<D1Result<T>> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          sql: this.sql,
          params: this.params,
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

// Get D1 database instance
export function getD1Database() {
  // In Cloudflare Workers/Pages environment
  if (typeof (globalThis as any).DB !== 'undefined') {
    return (globalThis as any).DB
  }
  
  // For Vercel/Node.js environment
  return new D1HttpClient()
}

// User management functions
export async function createUser(email: string, password: string, name: string, role: string = 'USER') {
  const db = getD1Database()
  const userId = generateId()
  
  const stmt = db.prepare(`
    INSERT INTO User (id, email, password, name, role, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `)
  
  await stmt.bind(userId, email, password, name, role).run()
  return userId
}

export async function getUserByEmail(email: string) {
  const db = getD1Database()
  const stmt = db.prepare('SELECT * FROM User WHERE email = ?')
  return await stmt.bind(email).first()
}

export async function getUserById(id: string) {
  const db = getD1Database()
  const stmt = db.prepare('SELECT * FROM User WHERE id = ?')
  return await stmt.bind(id).first()
}

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
  
  const result = await db.query(sql, [userId])
  
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
  const maxOrderResult = await db.query('SELECT MAX("order") as maxOrder FROM Section WHERE userId = ?', [data.userId])
  const order = (maxOrderResult.results[0]?.maxOrder || 0) + 1
  
  const sql = `
    INSERT INTO Section (id, title, slug, description, isActive, "order", createdAt, updatedAt, userId)
    VALUES (?, ?, ?, ?, true, ?, datetime('now'), datetime('now'), ?)
  `
  
  await db.query(sql, [sectionId, data.title, data.slug, data.description || null, order, data.userId])
  return sectionId
}

// Section Item management
export async function addVideoToSection(sectionId: string, videoId: string, isFeatured: boolean = false) {
  const db = getD1Database()
  const itemId = generateId()
  
  // Get max order for this section
  const maxOrderResult = await db.query('SELECT MAX("order") as maxOrder FROM SectionItem WHERE sectionId = ?', [sectionId])
  const order = (maxOrderResult.results[0]?.maxOrder || 0) + 1
  
  const sql = `
    INSERT INTO SectionItem (id, "order", isFeatured, createdAt, updatedAt, sectionId, videoId)
    VALUES (?, ?, ?, datetime('now'), datetime('now'), ?, ?)
  `
  
  await db.query(sql, [itemId, order, isFeatured, sectionId, videoId])
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
    const sql = `
      UPDATE SectionItem 
      SET "order" = ?, isFeatured = ?, updatedAt = datetime('now')
      WHERE id = ? AND sectionId = ?
    `
    await db.query(sql, [item.order, item.isFeatured, item.id, sectionId])
  }
}

export async function deleteSectionItem(itemId: string, sectionId: string) {
  const db = getD1Database()
  return await db.query('DELETE FROM SectionItem WHERE id = ? AND sectionId = ?', [itemId, sectionId])
}

// Utility function to generate IDs
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}