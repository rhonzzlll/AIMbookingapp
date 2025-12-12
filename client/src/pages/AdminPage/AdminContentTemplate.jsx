import React from 'react';

const AdminContentTemplate = ({ children }) => {
  return (
    <div className="font-sans bg-gray-100 min-h-screen w-full">
      <div className="container mx-auto px-4 py-6 max-w-full">
        <div className="bg-white rounded-xl shadow-md p-6 w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800"></h1>
          </div>
          <div className="mb-6">
            {children}
          </div>
          <div className="text-center text-gray-400 text-sm mt-8">
            <p>© 2025 ASIAN INSTITUTE of MANAGEMENT </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminContentTemplate;