import Link from "next/link";

/**
 * Global 404 Not Found page.
 * Shown when a route doesn't match any page.
 */
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <h1 className="text-6xl font-bold text-gray-200 mb-2">404</h1>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Page not found
        </h2>
        <p className="text-gray-500 mb-6 text-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}