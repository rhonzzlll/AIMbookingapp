import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const ConfirmationModal = ({ isOpen, onOpenChange }) => {
  const navigate = useNavigate();

  const handleRedirect = () => {
    onOpenChange(false);
    navigate('/home');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white rounded-lg shadow-lg p-6">
        <DialogHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircleIcon className="h-16 w-16 text-green-600" /> {/* Heroicons Checkmark */}
          </div>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Booking Submitted Successfully
          </DialogTitle>
        </DialogHeader>
       <div className="mt-4 text-center">
  <p className="text-sm text-gray-600">
    Your booking has been submitted.
  </p>
  <p className="text-sm text-gray-600">
    You will be notified once it is approved.
  </p>
</div>
        <div className="mt-6 flex justify-center space-x-3">
          <Button
            onClick={handleRedirect}
            className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Home
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;