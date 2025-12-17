/**
 * 将图片转换为 JPG 格式
 * @param file 原始图片文件
 * @param quality JPG 质量 (0-1)
 * @returns 转换后的 File 对象
 */
export async function convertToJpg(file: File, quality: number = 0.9): Promise<File> {
  // 如果已经是 JPEG，直接返回
  if (file.type === 'image/jpeg') {
    return file
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    img.onload = () => {
      // 设置 canvas 尺寸与图片一致
      canvas.width = img.width
      canvas.height = img.height

      // 填充白色背景（处理 PNG 透明背景）
      if (ctx) {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
      }

      // 转换为 JPEG blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // 生成新文件名（替换扩展名为 .jpg）
            const originalName = file.name.replace(/\.[^/.]+$/, '')
            const newFile = new File([blob], `${originalName}.jpg`, {
              type: 'image/jpeg',
            })
            resolve(newFile)
          } else {
            reject(new Error('转换图片失败'))
          }
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      reject(new Error('加载图片失败'))
    }

    // 从 File 创建 URL 并加载图片
    img.src = URL.createObjectURL(file)
  })
}
