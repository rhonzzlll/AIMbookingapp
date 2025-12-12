import React, { useState } from 'react';
import { Calendar, Download, Filter, X, FileSpreadsheet } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Move these OUTSIDE the exportToExcel function, to the top of your component
const departmentColors = {
  // Schools
  'ASITE': 'bg-purple-100 border-purple-400 text-purple-900',
  'WSGSB': 'bg-green-100 border-green-400 text-green-900',
  'SZGSDM': 'bg-yellow-100 border-yellow-400 text-yellow-900',
  'SEELL': 'bg-blue-100 border-blue-400 text-blue-900',
  'Other Units': 'bg-orange-100 border-orange-400 text-orange-900',
  'External': 'bg-pink-100 border-pink-400 text-pink-900',
  // Departments (all gray)
  'SRF': 'bg-gray-100 border-gray-400 text-gray-900',
  'MRG': 'bg-gray-100 border-gray-400 text-gray-900',
  'OD': 'bg-gray-100 border-gray-400 text-gray-900',
  'ICT': 'bg-gray-100 border-gray-400 text-gray-900',
  'HRS': 'bg-gray-100 border-gray-400 text-gray-900',
  'FSG': 'bg-gray-100 border-gray-400 text-gray-900',
  'OR': 'bg-gray-100 border-gray-400 text-gray-900',
  'ACC': 'bg-gray-100 border-gray-400 text-gray-900',
};

const departmentExcelColors = {
  'ASITE': { argb: 'E9D5FF' },      // purple-100
  'WSGSB': { argb: 'BBF7D0' },      // green-100
  'SZGSDM': { argb: 'FEF9C3' },     // yellow-100
  'SEELL': { argb: 'DBEAFE' },      // blue-100
  'Other Units': { argb: 'FFEDD5' },// orange-100
  'External': { argb: 'FBCFE8' },   // pink-100
  // Departments (all gray)
  'SRF': { argb: 'F3F4F6' },
  'MRG': { argb: 'F3F4F6' },
  'OD': { argb: 'F3F4F6' },
  'ICT': { argb: 'F3F4F6' },
  'HRS': { argb: 'F3F4F6' },
  'FSG': { argb: 'F3F4F6' },
  'OR': { argb: 'F3F4F6' },
  'ACC': { argb: 'F3F4F6' },
};

const ExcelEventBulletinExporter = ({ bookings }) => {
  const [selectedStatuses, setSelectedStatuses] = useState(['confirmed']);
  const [showOptions, setShowOptions] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Format dates consistently
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    // Check if the time string already includes "AM" or "PM"
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString; // Return as is if already formatted
    }

    // Accepts "HH:MM:SS" or "HH:MM"
    const [h, m] = timeString.split(':');
    let hour = parseInt(h, 10);
    const minute = m;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  };

  // Filter bookings based on selected statuses and date range
  const filteredBookings = bookings.filter(booking => {
    // Filter by status
    const statusMatch = selectedStatuses.includes(booking.status);
    
    // If no date range is selected, just filter by status
    if (!startDate && !endDate) return statusMatch;
    
    const bookingDate = new Date(booking.date);
    const filterStartDate = startDate ? new Date(startDate) : null;
    const filterEndDate = endDate ? new Date(endDate) : null;
    
    // Filter by date range if provided
    if (filterStartDate && filterEndDate) {
      return statusMatch && bookingDate >= filterStartDate && bookingDate <= filterEndDate;
    } else if (filterStartDate) {
      return statusMatch && bookingDate >= filterStartDate;
    } else if (filterEndDate) {
      return statusMatch && bookingDate <= filterEndDate;
    }
    
    return statusMatch;
  });

  // Generate current date for filename and header
  const currentDate = new Date().toISOString().split('T')[0];
  const formattedCurrentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  // Create descriptive filename with date range if selected
  let dateRangeText = '';
  if (startDate && endDate) {
    const start = new Date(startDate).toISOString().split('T')[0];
    const end = new Date(endDate).toISOString().split('T')[0];
    dateRangeText = `-${start}-to-${end}`;
  } else if (startDate) {
    dateRangeText = `-from-${new Date(startDate).toISOString().split('T')[0]}`;
  } else if (endDate) {
    dateRangeText = `-until-${new Date(endDate).toISOString().split('T')[0]}`;
  }
  
  const filename = `daily-event-bulletin${dateRangeText}-${currentDate}.xlsx`;

  // Function to export data to Excel with formatting
  const exportToExcel = async () => {
    setIsExporting(true);

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Daily Event Bulletin');

      // Set columns FIRST
      worksheet.columns = [
        { header: 'Person-In-Charge', key: 'person', width: 25 },
        { header: 'School/Department', key: 'department', width: 25 },
        { header: 'Function Room', key: 'room', width: 25 },
        { header: 'Event Name', key: 'eventName', width: 30 },
        { header: 'Booker', key: 'booker', width: 25 },
        { header: 'Charged To', key: 'chargedTo', width: 20 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Start Time', key: 'startTime', width: 15 }, // NEW
        { header: 'End Time', key: 'endTime', width: 15 },     // NEW
        { header: 'Number of Pax', key: 'pax', width: 20 },
        { header: 'Breakout Room', key: 'breakoutRoom', width: 25 },
        { header: 'Breakout Room Start Time', key: 'breakoutRoomStartTime', width: 25 },
        { header: 'Breakout Room End Time', key: 'breakoutRoomEndTime', width: 25 },
        { header: 'Special Instructions', key: 'specialInstructions', width: 30 },
        { header: 'Remarks', key: 'remarks', width: 25 },
        { header: 'Actions', key: 'actions', width: 20 },
      ];

      // Insert title and date rows ABOVE the header
      worksheet.spliceRows(1, 0, ['Daily Event Bulletin']);
      worksheet.mergeCells('A1:O1');
      const titleRow = worksheet.getRow(1);
      titleRow.font = { bold: true, size: 16 };
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
      titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F0F0' } };

      worksheet.spliceRows(2, 0, [formattedCurrentDate]);
      worksheet.mergeCells('A2:O2');
      const dateRow = worksheet.getRow(2);
      dateRow.font = { italic: true, size: 12 };
      dateRow.alignment = { horizontal: 'center', vertical: 'middle' };
      dateRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F7F7F7' } };

      // Style header row (now at row 3)
      const headerRow = worksheet.getRow(3);
      headerRow.font = { bold: true, size: 11 };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F5F5F5' } };
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Add data rows as before, starting from row 4
      filteredBookings.forEach((booking) => {
        const breakoutRoomCell = booking.isBreakRoom
          ? `Yes${booking.numberOfPaxBreakRoom ? ` (${booking.numberOfPaxBreakRoom} pax)` : ''}`
          : 'N/A';

        const row = worksheet.addRow([
          booking.changedBy || booking.bookedBy || 'N/A',
          booking.department || 'N/A',
          booking.roomName || 'N/A',
          booking.title || 'N/A',
          `${booking.firstName || 'N/A'} ${booking.lastName || ''}`.trim(),
          booking.costCenterCharging || 'N/A',
          formatDate(booking.date) || 'N/A',
          formatTime(booking.startTime) || 'N/A', // NEW
          formatTime(booking.endTime) || 'N/A',   // NEW
          booking.bookingCapacity > 0 ? booking.bookingCapacity : 'N/A',
          breakoutRoomCell, // <-- FIXED
          booking.isBreakRoom ? formatTime(booking.startTimeBreakRoom) : 'N/A',
          booking.isBreakRoom ? formatTime(booking.endTimeBreakRoom) : 'N/A',
          booking.notes || 'N/A',
          booking.remarks || 'N/A',
          booking.status || 'N/A',
        ]);
        const departmentColor = departmentExcelColors[booking.department] || { argb: 'FFFFFF' };
        row.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: departmentColor,
        };
      });

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, filename);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle checkbox changes
  const handleCheckboxChange = (status) => {
    setSelectedStatuses(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  // Handle date input changes
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    if (name === 'startDate') {
      setStartDate(value);
    } else if (name === 'endDate') {
      setEndDate(value);
    }
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  const exitPreview = () => {
    setShowPreview(false);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setShowOptions(!showOptions)}
        className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition flex items-center gap-2"
      >
        <Download size={16} />
        Export Daily Event Bulletin
      </button>

      {showOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white border border-gray-200 rounded shadow-lg p-4 w-full max-w-md max-h-[90vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800">Export Options</h3>
              <button 
                onClick={() => setShowOptions(false)}
                className="text-gray-500 hover:text-gray-700 absolute top-4 right-4"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-3">
              <div className="font-medium text-gray-700 mb-2 flex items-center">
                <Filter size={16} className="mr-1" />
                Select Status to Export:
              </div>
            
              <div className="flex flex-col gap-2 mb-4 pl-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={selectedStatuses.includes('confirmed')} 
                    onChange={() => handleCheckboxChange('confirmed')}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm">Confirmed</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={selectedStatuses.includes('pending')} 
                    onChange={() => handleCheckboxChange('pending')}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm">Pending</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={selectedStatuses.includes('declined')} 
                    onChange={() => handleCheckboxChange('declined')}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm">Declined</span>
                </label>

                {/* Add Cancelled status */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={selectedStatuses.includes('cancelled')} 
                    onChange={() => handleCheckboxChange('cancelled')}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm">Cancelled</span>
                </label> 
              </div>
            </div>

            <div className="mb-3">
              <div className="font-medium text-gray-700 mb-2 flex items-center">
                <Calendar size={16} className="mr-1" />
                Filter by Date Range:
              </div>
              
              <div className="flex flex-col gap-3 mb-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={startDate}
                    onChange={handleDateChange}
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={endDate}
                    min={startDate}
                    onChange={handleDateChange}
                    className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={togglePreview}
                className="px-4 py-2 text-sm text-center block w-full rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
              
              <button
                onClick={exportToExcel}
                disabled={selectedStatuses.length === 0 || isExporting}
                className={`px-4 py-2 text-sm text-center block w-full rounded flex items-center justify-center gap-2 ${
                  selectedStatuses.length === 0 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-teal-600 text-white hover:bg-teal-700'} transition`}
              >
                <FileSpreadsheet size={16} />
                {isExporting 
                  ? 'Exporting...' 
                  : selectedStatuses.length === 0 
                    ? 'Select at least one status'
                    : `Export ${filteredBookings.length} Events to Excel`}
              </button>
              
              <div className="mt-1 text-xs text-center text-gray-500">
                {filteredBookings.length} events match your filters
              </div>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="mt-4 border border-gray-200 rounded shadow-md overflow-x-auto">
          <div className="bg-gray-100 p-3 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-center uppercase flex-1">Daily Event Bulletin</h2>
              <button 
                onClick={exitPreview}
                className="bg-gray-200 hover:bg-gray-300 p-1 rounded-full transition"
                title="Close preview"
              >
                <X size={16} className="text-gray-600" />
              </button>
            </div>
            <p className="text-right text-sm">{formattedCurrentDate}</p>
          </div>
          
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 bg-gray-50 text-gray-700 uppercase text-xs font-semibold text-left border-r border-gray-200 w-1/6">Person-In-Charge</th>
                <th className="px-4 py-2 bg-gray-50 text-gray-700 uppercase text-xs font-semibold text-center border-r border-gray-200 w-1/6">Department</th>
                <th className="px-4 py-2 bg-gray-50 text-gray-700 uppercase text-xs font-semibold text-center border-r border-gray-200 w-1/6">Function Room</th>
                <th className="px-4 py-2 bg-gray-50 text-gray-700 uppercase text-xs font-semibold text-center border-r border-gray-200 w-1/6">Event Name</th>
                <th className="px-4 py-2 bg-gray-50 text-gray-700 uppercase text-xs font-semibold text-center border-r border-gray-200 w-1/6">Booker</th>
                <th className="px-4 py-2 bg-gray-50 text-gray-700 uppercase text-xs font-semibold text-center border-r border-gray-200 w-1/6">Charged To</th>
                <th className="px-4 py-2 bg-gray-50 text-gray-700 uppercase text-xs font-semibold text-center border-r border-gray-200 w-1/6">Date</th>
                <th className="px-4 py-2 bg-gray-50 text-gray-700 uppercase text-xs font-semibold text-center border-r border-gray-200 w-1/12">Start Time</th> {/* NEW */}
                <th className="px-4 py-2 bg-gray-50 text-gray-700 uppercase text-xs font-semibold text-center border-r border-gray-200 w-1/12">End Time</th>   {/* NEW */}
                <th className="px-4 py-2 bg-gray-50 text-gray-700 uppercase text-xs font-semibold text-center border-r border-gray-200 w-1/12">PAX</th>
                <th className="px-4 py-2 bg-gray-50 text-gray-700 uppercase text-xs font-semibold text-center border-r border-gray-200 w-1/6">Breakout Room</th>
                <th className="px-4 py-2 bg-gray-50 text-gray-700 uppercase text-xs font-semibold text-center border-r border-gray-200 w-1/6">Breakout Room Start Time</th>
                <th className="px-4 py-2 bg-gray-50 text-gray-700 uppercase text-xs font-semibold text-center border-r border-gray-200 w-1/6">Breakout Room End Time</th>
                <th className="px-4 py-2 bg-gray-50 text-gray-700 uppercase text-xs font-semibold text-center border-r border-gray-200 w-1/6">Special Instructions</th>
                <th className="px-4 py-2 bg-gray-50 text-gray-700 uppercase text-xs font-semibold text-center w-1/6">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking, index) => {
                  // Use department color if available, else fallback to alternating
                  const fallbackColors = [
                    'bg-teal-100',
                    'bg-blue-100',
                    'bg-gray-100',
                    'bg-amber-100'
                  ];
                  const personColor = departmentColors[booking.department] || fallbackColors[index % 4];

                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className={`${personColor} px-4 py-2 border-r border-gray-200 text-sm font-medium`}>
                        {booking.changedBy || booking.bookedBy || '-'}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200 text-sm text-center">
                        {booking.department}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200 text-sm text-center">
                        {booking.roomName}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200 text-sm text-center">
                        {booking.title}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200 text-sm text-center">
                        {`${booking.firstName || 'N/A'} ${booking.lastName || ''}`.trim()}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200 text-sm text-center">
                        {booking.costCenterCharging}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200 text-sm text-center">
                        {formatDate(booking.date)}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200 text-sm text-center">
                        {formatTime(booking.startTime)}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200 text-sm text-center">
                        {formatTime(booking.endTime)}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200 text-sm text-center">
                        {booking.bookingCapacity > 0 ? booking.bookingCapacity : '-'}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200 text-sm text-center">
                        {booking.breakoutRoom}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200 text-sm text-center">
                        {booking.isBreakRoom ? formatTime(booking.startTimeBreakRoom) : '-'}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200 text-sm text-center">
                        {booking.isBreakRoom ? formatTime(booking.endTimeBreakRoom) : '-'}
                      </td>
                      <td className="px-4 py-2 border-r border-gray-200 text-sm text-center">
                        {booking.notes}
                      </td>
                      <td className="px-4 py-2 text-sm text-center">
                        {booking.remarks}
                      </td>
                      <td className="px-4 py-2 text-sm text-center">
                        {booking.status}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="15" className="px-4 py-4 text-center text-gray-500">
                    No events match your current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="bg-gray-50 p-3 border-t border-gray-200 flex justify-end">
            <button
              onClick={exitPreview}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelEventBulletinExporter;