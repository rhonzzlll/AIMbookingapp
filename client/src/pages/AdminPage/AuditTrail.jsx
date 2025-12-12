import React, { useEffect, useState } from 'react';
import { User, FileText, Clock } from 'lucide-react';
import TopBar from '../../components/AdminComponents/TopBar';
import ExcelAuditTrailExporter from '../../components/AdminComponents/adminExport';

const API_BASE_URL = import.meta.env.VITE_API_URI;

const formatTimestamp = (timestamp) => new Date(timestamp).toLocaleString();

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
    // If parsed is an object and has a "status" key with value "declined"
    if (parsed && typeof parsed === 'object' && parsed.status === 'declined') {
      return 'status: "declined"';
    }
    // If parsed is an object and has a "status" key, show just that key-value
    if (parsed && typeof parsed === 'object' && parsed.status) {
      return `status: "${parsed.status}"`;
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    // Fallback: check if the string contains "status":"declined"
    if (typeof value === 'string') {
      const match = value.match(/"status"\s*:\s*"([^"]+)"/);
      if (match) {
        return `status: "${match[1]}"`;
      }
    }
    return value?.toString() || '';
  }
};                                              

const PAGE_SIZE = 10;

const AuditTrail = () => {
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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

  // Search filter
  const filteredData = auditData.filter(record => {
    const search = searchTerm.toLowerCase();
    return (
      record.full_name?.toLowerCase().includes(search) ||
      record.action?.toLowerCase().includes(search) ||
      record.object_affected?.toLowerCase().includes(search)
    );
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Handle page change
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Reset to first page on search or    change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, auditData.length]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 257, width: 'calc(100% - 257px)', zIndex: 500, overflowY: 'auto', height: '100vh' }}>
      <TopBar onSearch={setSearchTerm} />
      <div className="p-4 bg-gray-100 w-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Audit Trail</h1>
           </div>
        </div>

        {/* Audit Trail Table */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 w-full overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">Activity Log</h3>
              <div className="text-sm text-gray-500">
                {filteredData.length} total records
              </div>
            </div>
            <ExcelAuditTrailExporter auditData={filteredData} />
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredData.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-4 py-2 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-2 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-2 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">Object Affected</th>
                    <th className="px-4 py-2 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Value</th>
                    <th className="px-4 py-2 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">New Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition align-top">
                      <td className="px-4 py-2 border-b text-sm text-gray-900 whitespace-nowrap">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          {formatTimestamp(record.timestamp)}
                        </div>
                      </td>
                      <td className="px-4 py-2 border-b whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{record.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-b whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(record.action)}`}>
                          {record.action}
                        </span>
                      </td>
                      <td className="px-4 py-2 border-b text-sm text-gray-900 whitespace-nowrap">
                        {record.object_affected}
                      </td>
                      <td className="px-4 py-2 border-b whitespace-pre-wrap text-xs font-mono text-gray-800">
                        {formatJsonValuePlain(record.old_value)}
                      </td>
                      <td className="px-4 py-2 border-b whitespace-pre-wrap text-xs font-mono text-gray-800">
                        {formatJsonValuePlain(record.new_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="border-t px-6 py-4 flex flex-col md:flex-row justify-center items-center gap-2 bg-white">
            <div className="mb-2 md:mb-0 text-sm text-gray-500">
              Page {currentPage} of {totalPages > 0 ? totalPages : 1}
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 rounded border bg-gray-100 hover:bg-gray-200"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                Prev
              </button>
              {[...Array(totalPages > 0 ? totalPages : 1)].map((_, idx) => (
                <button
                  key={idx + 1}
                  className={`px-3 py-1 rounded border ${currentPage === idx + 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                  onClick={() => handlePageChange(idx + 1)}
                  disabled={currentPage === idx + 1}
                >
                  {idx + 1}
                </button>
              ))}
              <button
                className="px-3 py-1 rounded border bg-gray-100 hover:bg-gray-200"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditTrail;