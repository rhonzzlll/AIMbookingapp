import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { useNavigate } from 'react-router-dom';

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
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m0 0a9 9 0 11-6.364-2.636A9 9 0 0112 21a9 9 0 010-18z"
              />
            </svg>
          </div>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Booking Submitted Successfully
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Your booking has been submitted successfully and is awaiting admin approval. You will be notified once it is approved.
          </p>
        </div>
        <div className="mt-6 flex justify-center space-x-3">
          <Button
            onClick={handleRedirect}
            className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go to Home
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;