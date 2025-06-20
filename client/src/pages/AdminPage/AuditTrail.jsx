import React, { useEffect, useState } from 'react';
import { User, FileText, Clock } from 'lucide-react';

// Use Vite's import.meta.env for environment variables
const API_BASE_URL = import.meta.env.VITE_API_URI ;

const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString();
};

const getActionBadgeColor = (action) => {
  const colors = {
    'CREATE': 'bg-green-100 text-green-800',
    'UPDATE': 'bg-blue-100 text-blue-800',
    'DELETE': 'bg-red-100 text-red-800',
    'GET': 'bg-gray-100 text-gray-800',
  };
  const actionType = action.split(' ')[0];
  return colors[actionType] || 'bg-gray-100 text-gray-800';
};

const formatJsonValuePlain = (value) => {
  if (!value) return 'N/A';
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value?.toString() || '';
  }
};

const AuditTrail = () => {
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuditTrail = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/audit-trails/audit-trail`);
        const data = await res.json();
        setAuditData(Array.isArray(data) ? data : []);
      } catch (err) {
        setAuditData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAuditTrail();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Trail</h1>
          <p className="text-gray-600">Track all booking system activities and changes</p>
        </div>

        {/* Audit Trail Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Activity Log</h3>
              <div className="text-sm text-gray-500">
                {auditData.length} total records
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : auditData.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Object Affected
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Previous Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      New Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditData.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 align-top">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          {formatTimestamp(record.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {record.full_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {record.role} (ID: {record.user_id})
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(record.action)}`}>
                          {record.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.object_affected}
                      </td>
                      <td className="px-6 py-4 whitespace-pre-wrap text-xs font-mono text-gray-800">
                        {formatJsonValuePlain(record.old_value)}
                      </td>
                      <td className="px-6 py-4 whitespace-pre-wrap text-xs font-mono text-gray-800">
                        {formatJsonValuePlain(record.new_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditTrail;