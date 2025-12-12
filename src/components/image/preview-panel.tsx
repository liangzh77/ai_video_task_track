'use client'

import Image from 'next/image'

interface PreviewPanelProps {
  imageUrl: string | null
}

export function PreviewPanel({ imageUrl }: PreviewPanelProps) {
  return (
    <div className="sticky top-6 h-[calc(100vh-120px)] bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700">图片预览</h3>
      </div>
      <div className="p-4 h-[calc(100%-60px)] flex items-center justify-center">
        {imageUrl ? (
          <div className="relative w-full h-full">
            <Image
              src={imageUrl}
              alt="预览图片"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        ) : (
          <div className="text-gray-400 text-sm">
            点击图片查看预览
          </div>
        )}
      </div>
    </div>
  )
}
