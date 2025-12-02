import { AlertTriangle } from "lucide-react";
import { FallbackProps } from "react-error-boundary";

function ErrorComponent({ error, resetErrorBoundary }: FallbackProps) {
  const isProduction = import.meta.env.PROD;

  const handleGoHome = () => {
    window.location.href = "/";
    resetErrorBoundary();
  };

  if (isProduction) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-8">
            We apologize for the inconvenience. Please try again or return to
            the home page.
          </p>
          <div className="space-x-4">
            <button
              onClick={handleGoHome}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </button>
            <button
              onClick={resetErrorBoundary}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[200px] flex items-center justify-center p-8 bg-red-50 rounded-lg border border-red-100">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-700 mb-2">
          Something went wrong
        </h2>
        <p className="text-red-600">{error.message}</p>
        <pre className="text-justify w-full p-4 overflow-x-auto text-gray-700 mb-2">
          <code>{error.stack}</code>
        </pre>

        <button
          onClick={resetErrorBoundary}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export default ErrorComponent;
