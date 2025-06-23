import React, { useState } from 'react';
import { FileSpreadsheet, X } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Format timestamp for display
const formatTimestamp = (timestamp) => new Date(timestamp).toLocaleString();

// Format JSON value for Excel (same as your table)
const formatJsonValuePlain = (value) => {
  if (!value) return 'N/A';
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (parsed && typeof parsed === 'object' && parsed.status === 'declined') {
      return 'status: "declined"';
    }
    if (parsed && typeof parsed === 'object' && parsed.status) {
      return `status: "${parsed.status}"`;
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    if (typeof value === 'string') {
      const match = value.match(/"status"\s*:\s*"([^"]+)"/);
      if (match) {
        return `status: "${match[1]}"`;
      }
    }
    return value?.toString() || '';
  }
};

const ExcelAuditTrailExporter = ({ auditData }) => {
  const [showModal, setShowModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Excel export logic
  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      // Filter data by date range
      const filteredData = auditData.filter(record => {
        const ts = new Date(record.timestamp);
        const afterStart = startDate ? ts >= new Date(startDate) : true;
        const beforeEnd = endDate ? ts <= new Date(endDate + 'T23:59:59') : true;
        return afterStart && beforeEnd;
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Audit Trail');

      worksheet.columns = [
        { header: 'Timestamp', key: 'timestamp', width: 22 },
        { header: 'User', key: 'full_name', width: 20 },
        { header: 'Action', key: 'action', width: 18 },
        { header: 'Object Affected', key: 'object_affected', width: 22 },
        { header: 'Previous Value', key: 'old_value', width: 30 },
        { header: 'New Value', key: 'new_value', width: 30 },
      ];

      worksheet.getRow(1).font = { bold: true };

      filteredData.forEach(record => {
        worksheet.addRow({
          timestamp: formatTimestamp(record.timestamp),
          full_name: record.full_name,
          action: record.action,
          object_affected: record.object_affected,
          old_value: formatJsonValuePlain(record.old_value),
          new_value: formatJsonValuePlain(record.new_value),
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `audit-trail-${new Date().toISOString().split('T')[0]}.xlsx`);
      setShowModal(false);
    } catch (error) {
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative mb-4">
      <button
        onClick={() => setShowModal(true)}
        disabled={isExporting}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-2"
      >
        <FileSpreadsheet size={16} />
        Export Audit Trail to Excel
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px] relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-2 right-2 bg-gray-200 hover:bg-gray-300 p-1 rounded-full transition"
              title="Close"
            >
              <X size={18} className="text-gray-600" />
            </button>
            <h2 className="text-lg font-bold mb-4">Export Audit Trail</h2>
            <div className="mb-4 flex flex-col gap-3">
              <label className="flex flex-col text-sm font-medium">
                Start Date
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="mt-1 border rounded px-2 py-1"
                />
              </label>
              <label className="flex flex-col text-sm font-medium">
                End Date
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="mt-1 border rounded px-2 py-1"
                />
              </label>
            </div>
            <button
              onClick={exportToExcel}
              disabled={isExporting}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              <FileSpreadsheet size={16} />
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelAuditTrailExporter;
