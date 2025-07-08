import React from 'react';

const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => {
  return (
    <div className="p-8 bg-red-100 text-red-800 rounded">
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <pre className="whitespace-pre-wrap">{error.message}</pre>
    </div>
  );
};

export default ErrorFallback; 