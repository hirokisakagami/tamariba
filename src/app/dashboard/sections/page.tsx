'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { SortableItem } from '@/components/SortableItem'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

interface Video {
  id: string
  title: string
  cloudflareVideoId: string
  thumbnailUrl: string | null
  status: string
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

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [showAddVideoModal, setShowAddVideoModal] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchSections()
    fetchVideos()
  }, [])

  const fetchSections = async () => {
    try {
      const response = await fetch('/api/sections')
      const data = await response.json()
      setSections(data)
    } catch (error) {
      console.error('Error fetching sections:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/videos')
      const data = await response.json()
      setVideos(data.filter((v: Video) => v.status === 'READY'))
    } catch (error) {
      console.error('Error fetching videos:', error)
    }
  }

  const handleDragEnd = async (event: DragEndEvent, sectionId: string) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const section = sections.find(s => s.id === sectionId)
    if (!section) return

    const oldIndex = section.items.findIndex(item => item.id === active.id)
    const newIndex = section.items.findIndex(item => item.id === over.id)

    const newItems = arrayMove(section.items, oldIndex, newIndex)

    setSections(prev => prev.map(s => 
      s.id === sectionId 
        ? { ...s, items: newItems }
        : s
    ))

    try {
      const updatedItems = newItems.map((item, index) => ({
        id: item.id,
        order: index,
        isFeatured: item.isFeatured
      }))

      await fetch(`/api/sections/${sectionId}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedItems })
      })
    } catch (error) {
      console.error('Error updating section items:', error)
      fetchSections()
    }
  }

  const handleAddVideoToSection = async (sectionId: string, videoId: string, isFeatured = false) => {
    try {
      const response = await fetch(`/api/sections/${sectionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, isFeatured })
      })

      if (response.ok) {
        fetchSections()
        setShowAddVideoModal(false)
      } else {
        const error = await response.json()
        alert(error.error || '追加に失敗しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  const toggleFeatured = async (sectionId: string, itemId: string, currentFeatured: boolean) => {
    try {
      const section = sections.find(s => s.id === sectionId)
      if (!section) return

      const updatedItems = section.items.map(item => ({
        id: item.id,
        order: item.order,
        isFeatured: item.id === itemId ? !currentFeatured : item.isFeatured
      }))

      await fetch(`/api/sections/${sectionId}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedItems })
      })

      fetchSections()
    } catch (error) {
      console.error('Error updating featured status:', error)
    }
  }

  const removeVideoFromSection = async (sectionId: string, itemId: string) => {
    if (!confirm('この動画をセクションから削除しますか？')) return

    try {
      await fetch(`/api/sections/${sectionId}/items/${itemId}`, {
        method: 'DELETE'
      })
      fetchSections()
    } catch (error) {
      console.error('Error removing video from section:', error)
    }
  }

  const getThumbnailUrl = (videoId: string) => {
    return `https://stream.cloudflare.com/${videoId}/thumbnails/thumbnail.jpg?time=0s`
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">セクションを読み込み中...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">セクション管理</h1>
            <p className="text-gray-600">フロント表示用のセクション管理とドラッグ&ドロップによる順番調整</p>
          </div>
        </div>

        <div className="grid gap-6">
          {sections.map((section) => (
            <div key={section.id} className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      section.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {section.isActive ? 'アクティブ' : '非アクティブ'}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedSection(section.id)
                        setShowAddVideoModal(true)
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      動画を追加
                    </button>
                  </div>
                </div>
              </div>

              {section.items.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-gray-500">動画がありません</p>
                  <button
                    onClick={() => {
                      setSelectedSection(section.id)
                      setShowAddVideoModal(true)
                    }}
                    className="mt-2 text-blue-600 hover:text-blue-500 text-sm"
                  >
                    動画を追加する
                  </button>
                </div>
              ) : (
                <div className="p-6">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, section.id)}
                  >
                    <SortableContext
                      items={section.items.map(item => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="grid gap-4">
                        {section.items.map((item) => (
                          <SortableItem key={item.id} id={item.id}>
                            <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-move">
                              <div className="flex-shrink-0">
                                <img
                                  src={getThumbnailUrl(item.video.cloudflareVideoId)}
                                  alt={item.video.title}
                                  className={`object-cover rounded ${
                                    item.isFeatured ? 'w-32 h-20' : 'w-20 h-14'
                                  }`}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = '/placeholder-video.png'
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  {item.video.title}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  順番: {item.order + 1}
                                </p>
                                {item.isFeatured && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                                    大きなサムネイル
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => toggleFeatured(section.id, item.id, item.isFeatured)}
                                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    item.isFeatured
                                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  {item.isFeatured ? '通常表示' : '大きく表示'}
                                </button>
                                <button
                                  onClick={() => removeVideoFromSection(section.id, item.id)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  削除
                                </button>
                              </div>
                              <div className="text-gray-400">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M7 2a1 1 0 000 2h6a1 1 0 100-2H7zM4 5a2 2 0 012-2h8a2 2 0 012 2v6.414A2 2 0 0017.414 13L16 14.414V17a1 1 0 01-1 1H5a1 1 0 01-1-1v-2.586L2.586 13A2 2 0 012 11.414V5z"/>
                                </svg>
                              </div>
                            </div>
                          </SortableItem>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>
          ))}
        </div>

        {showAddVideoModal && selectedSection && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">動画を追加</h3>
                  <button
                    onClick={() => setShowAddVideoModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {videos.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      利用可能な動画がありません
                    </p>
                  ) : (
                    videos.map((video) => (
                      <div key={video.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded">
                        <img
                          src={getThumbnailUrl(video.cloudflareVideoId)}
                          alt={video.title}
                          className="w-16 h-12 object-cover rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = '/placeholder-video.png'
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {video.title}
                          </h4>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAddVideoToSection(selectedSection, video.id, false)}
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                          >
                            通常
                          </button>
                          <button
                            onClick={() => handleAddVideoToSection(selectedSection, video.id, true)}
                            className="bg-yellow-600 text-white px-2 py-1 rounded text-xs hover:bg-yellow-700"
                          >
                            大きく
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}