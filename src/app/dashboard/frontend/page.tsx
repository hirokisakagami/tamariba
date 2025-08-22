'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'

interface Video {
  id: string
  title: string
  description: string | null
  cloudflareVideoId: string
  thumbnailUrl: string | null
}

interface SectionItem {
  id: string
  order: number
  isFeatured: boolean
  video: Video
}

interface Section {
  id: string
  title: string
  slug: string
  description: string | null
  isActive: boolean
  order: number
  items: SectionItem[]
}

export default function FrontendPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSections()
  }, [])

  const fetchSections = async () => {
    try {
      const response = await fetch('/api/sections')
      const data = await response.json()
      setSections(data.filter((s: Section) => s.isActive && s.items.length > 0))
    } catch (error) {
      console.error('Error fetching sections:', error)
    } finally {
      setLoading(false)
    }
  }

  const getThumbnailUrl = (videoId: string) => {
    return `https://stream.cloudflare.com/${videoId}/thumbnails/thumbnail.jpg?time=0s`
  }

  const getVideoStreamUrl = (videoId: string) => {
    return `https://stream.cloudflare.com/${videoId}/manifest/video.m3u8`
  }

  const featuredSection = sections.find(s => s.slug === 'featured')
  const featuredItem = featuredSection?.items.find(item => item.isFeatured)

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">フロント表示を読み込み中...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">フロント表示プレビュー</h1>
            <p className="text-gray-600">実際のフロントエンドでの表示イメージ</p>
          </div>
          <div className="text-sm text-gray-500">
            ※ Netflix風デザイン、推奨サムネイル比率 140:190
          </div>
        </div>

        <div className="bg-black rounded-lg overflow-hidden shadow-xl">
          <div className="text-white p-6">
            {featuredItem ? (
              <div className="mb-8">
                <div className="flex flex-col lg:flex-row items-center space-y-6 lg:space-y-0 lg:space-x-8">
                  <div className="flex-shrink-0">
                    <img
                      src={getThumbnailUrl(featuredItem.video.cloudflareVideoId)}
                      alt={featuredItem.video.title}
                      className="w-80 h-[432px] object-cover rounded-lg shadow-2xl"
                      style={{ aspectRatio: '140/190' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/placeholder-video.png'
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-4">
                    <h2 className="text-4xl font-bold">{featuredItem.video.title}</h2>
                    {featuredItem.video.description && (
                      <p className="text-lg text-gray-300 max-w-2xl leading-relaxed">
                        {featuredItem.video.description}
                      </p>
                    )}
                    <div className="flex space-x-4">
                      <button className="bg-white text-black px-8 py-3 rounded font-semibold hover:bg-gray-200 transition-colors">
                        ▶ 再生
                      </button>
                      <button className="bg-gray-600 text-white px-8 py-3 rounded font-semibold hover:bg-gray-500 transition-colors">
                        ⓘ 詳細情報
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-8 text-center py-12">
                <p className="text-gray-400">フィーチャーされた動画がありません</p>
              </div>
            )}

            {sections.map((section) => (
              <div key={section.id} className="mb-8">
                <h3 className="text-2xl font-bold mb-4">{section.title}</h3>
                
                {section.items.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">このセクションには動画がありません</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="flex space-x-4 pb-4" style={{ width: 'max-content' }}>
                      {section.items
                        .filter(item => section.slug === 'featured' ? !item.isFeatured : true)
                        .map((item) => (
                          <div
                            key={item.id}
                            className="flex-shrink-0 group cursor-pointer transition-transform hover:scale-105"
                          >
                            <div className="relative">
                              <img
                                src={getThumbnailUrl(item.video.cloudflareVideoId)}
                                alt={item.video.title}
                                className="w-36 h-48 object-cover rounded-lg shadow-lg"
                                style={{ aspectRatio: '140/190' }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = '/placeholder-video.png'
                                }}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                            <h4 className="mt-2 text-sm font-medium truncate w-36">
                              {item.video.title}
                            </h4>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {sections.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">表示するセクションがありません</p>
                <p className="text-gray-500 mt-2">セクション管理で動画を追加してください</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">実装ガイド</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">サムネイル仕様</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 推奨アスペクト比: 140:190 (約3:4の縦長)</li>
                <li>• 推奨サイズ: 420px × 570px以上</li>
                <li>• フォーマット: JPG または PNG</li>
                <li>• ファイルサイズ: 500KB以下推奨</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">動画ストリーミング</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Cloudflare Stream使用</li>
                <li>• HLS形式 (.m3u8)</li>
                <li>• 自動品質調整対応</li>
                <li>• 全デバイス対応</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded">
            <h4 className="font-medium text-gray-900 mb-2">API エンドポイント例</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>動画一覧:</strong> GET /api/videos</div>
              <div><strong>セクション一覧:</strong> GET /api/sections</div>
              <div><strong>サムネイルURL:</strong> https://stream.cloudflare.com/{`{videoId}`}/thumbnails/thumbnail.jpg</div>
              <div><strong>ストリーミングURL:</strong> https://stream.cloudflare.com/{`{videoId}`}/manifest/video.m3u8</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}