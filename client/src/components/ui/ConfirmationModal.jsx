import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { useNavigate } from 'react-router-dom'; // Updated import

const ConfirmationModal = ({ isOpen, onOpenChange }) => {
  const navigate = useNavigate(); // Updated to useNavigate

  const handleRedirect = () => {
    onOpenChange(false);
    navigate('/home'); // Updated navigation
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Booking Submitted</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <p className="text-sm text-muted-foreground">
            Your booking has been submitted successfully and is awaiting admin approval.
          </p>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <Button onClick={handleRedirect}>
            Go to Home
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;