export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">페이지를 찾을 수 없습니다</h2>
        <p className="text-gray-600 mb-6">
          요청하신 페이지가 존재하지 않습니다.
        </p>
        <a
          href="/"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
        >
          홈으로 돌아가기
        </a>
      </div>
    </div>
  );
}