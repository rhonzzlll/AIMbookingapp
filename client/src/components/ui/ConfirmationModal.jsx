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
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-white via-green-50/30 to-emerald-50/50 backdrop-blur-sm rounded-2xl shadow-2xl border-0 p-8 transform transition-all duration-300 ease-out">
        <DialogHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 mb-6 shadow-lg animate-pulse">
            <div className="h-18 w-18 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <CheckCircleIcon className="h-12 w-12 text-white drop-shadow-sm" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
            Booking Submitted Successfully
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6 text-center space-y-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-200/50 to-transparent h-px"></div>
            <p className="text-base text-gray-700 font-medium relative bg-white px-4">
              You will be notified once it is approved.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center space-x-4">
          <Button
            onClick={handleRedirect}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300/50 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 font-semibold"
          >
            🏠 Home
          </Button>
          <Button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300/50 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 font-semibold"
            variant="outline"
          >
            📅 Continue Booking
          </Button>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-3 h-3 bg-emerald-400 rounded-full opacity-60 animate-ping"></div>
        <div className="absolute bottom-6 left-6 w-2 h-2 bg-blue-400 rounded-full opacity-40 animate-bounce" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-8 left-8 w-1 h-1 bg-green-500 rounded-full opacity-50 animate-pulse" style={{animationDelay: '2s'}}></div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;