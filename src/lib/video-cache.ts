/**
 * IndexedDB 视频缓存工具
 * 使用原始视频 URL 作为 key，缓存视频 blob
 */

const DB_NAME = 'video-cache'
const DB_VERSION = 1
const STORE_NAME = 'videos'

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * 获取 IndexedDB 数据库实例
 */
function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // 创建对象存储，使用 url 作为 key
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' })
        // 添加时间索引，用于清理过期缓存
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })

  return dbPromise
}

/**
 * 从缓存获取视频 blob
 * @param url 原始视频 URL（不带签名）
 * @returns Blob 或 null
 */
export async function getCachedVideo(url: string): Promise<Blob | null> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(url)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result
        if (result?.blob) {
          resolve(result.blob)
        } else {
          resolve(null)
        }
      }
    })
  } catch (error) {
    console.error('读取视频缓存失败:', error)
    return null
  }
}

/**
 * 将视频 blob 存入缓存
 * @param url 原始视频 URL（不带签名）
 * @param blob 视频 blob
 */
export async function setCachedVideo(url: string, blob: Blob): Promise<void> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put({
        url,
        blob,
        timestamp: Date.now(),
      })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.error('写入视频缓存失败:', error)
  }
}

/**
 * 从缓存删除视频
 * @param url 原始视频 URL
 */
export async function removeCachedVideo(url: string): Promise<void> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(url)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.error('删除视频缓存失败:', error)
  }
}

/**
 * 清理过期缓存（超过指定天数的缓存）
 * @param days 过期天数，默认 7 天
 */
export async function cleanExpiredCache(days: number = 7): Promise<void> {
  try {
    const db = await getDB()
    const expireTime = Date.now() - days * 24 * 60 * 60 * 1000

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('timestamp')
      const range = IDBKeyRange.upperBound(expireTime)
      const request = index.openCursor(range)

      request.onerror = () => reject(request.error)
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
    })
  } catch (error) {
    console.error('清理过期缓存失败:', error)
  }
}

/**
 * 获取缓存统计信息
 */
export async function getCacheStats(): Promise<{ count: number; size: number }> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const results = request.result || []
        const count = results.length
        const size = results.reduce((total, item) => total + (item.blob?.size || 0), 0)
        resolve({ count, size })
      }
    })
  } catch (error) {
    console.error('获取缓存统计失败:', error)
    return { count: 0, size: 0 }
  }
}
