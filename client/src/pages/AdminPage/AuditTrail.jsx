import React from 'react';
import AdminContentTemplate from './AdminContentTemplate';
const AuditTrail = () => (
  <AdminContentTemplate>
    <h1 className="text-2xl font-bold mb-4 text-center">Audit Trail</h1>
    {/* Your audit log table or content goes here */}
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 border-b">Date</th>
            <th className="px-4 py-2 border-b">User</th>
            <th className="px-4 py-2 border-b">Action</th>
            <th className="px-4 py-2 border-b">Details</th>
          </tr>
        </thead>
        <tbody>
          {/* Example static row, replace with dynamic data */}
          <tr>
            <td className="px-4 py-2 border-b">2025-06-19</td>
            <td className="px-4 py-2 border-b">Jane Doe</td>
            <td className="px-4 py-2 border-b">Login</td>
            <td className="px-4 py-2 border-b">Successful login</td>
          </tr>
        </tbody>
      </table>
    </div>
  </AdminContentTemplate>
);

export default AuditTrail;