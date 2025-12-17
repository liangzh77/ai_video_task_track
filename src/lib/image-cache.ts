/**
 * IndexedDB 图片缓存工具
 * 使用原始图片 URL 作为 key，缓存图片 blob
 */

const DB_NAME = 'image-cache'
const DB_VERSION = 1
const STORE_NAME = 'images'

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
 * 从缓存获取图片 blob URL
 * @param url 原始图片 URL
 * @returns Blob URL 或 null
 */
export async function getCachedImageUrl(url: string): Promise<string | null> {
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
          // 创建 blob URL
          const blobUrl = URL.createObjectURL(result.blob)
          resolve(blobUrl)
        } else {
          resolve(null)
        }
      }
    })
  } catch (error) {
    console.error('读取图片缓存失败:', error)
    return null
  }
}

/**
 * 将图片 blob 存入缓存
 * @param url 原始图片 URL
 * @param blob 图片 blob
 */
export async function setCachedImage(url: string, blob: Blob): Promise<void> {
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
    console.error('写入图片缓存失败:', error)
  }
}

/**
 * 从缓存删除图片
 * @param url 原始图片 URL
 */
export async function removeCachedImage(url: string): Promise<void> {
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
    console.error('删除图片缓存失败:', error)
  }
}

/**
 * 清理过期缓存（超过指定天数的缓存）
 * @param days 过期天数，默认 7 天
 */
export async function cleanExpiredImageCache(days: number = 7): Promise<void> {
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
    console.error('清理过期图片缓存失败:', error)
  }
}

/**
 * 获取缓存统计信息
 */
export async function getImageCacheStats(): Promise<{ count: number; size: number }> {
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
    console.error('获取图片缓存统计失败:', error)
    return { count: 0, size: 0 }
  }
}
