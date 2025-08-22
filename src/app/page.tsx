'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-6xl">
            動画管理システム
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            動画投稿サイトの管理画面です。動画のアップロード、セクション管理、フロント表示の設定が簡単に行えます。
          </p>

          <div className="mt-10 flex justify-center gap-x-6">
            <Link
              href="/auth/signin"
              className="rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              ログイン
            </Link>
            <Link
              href="/auth/register"
              className="rounded-md bg-white px-6 py-3 text-base font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              新規登録
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                動画管理
              </h3>
              <p className="text-gray-600 text-sm">
                Cloudflare Streamと連携した動画のアップロード・管理機能
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                セクション管理
              </h3>
              <p className="text-gray-600 text-sm">
                「おすすめ」「トレンド」等のセクションをドラッグ&ドロップで管理
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                フロント表示
              </h3>
              <p className="text-gray-600 text-sm">
                大小サムネイルの表示設定と順番調整機能
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
