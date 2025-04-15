import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { X } from "lucide-react";

export default function PrivacyModal() {
  // For demo purposes - you would pass these via props in your actual implementation
  const [isOpen, setIsOpen] = useState(true);
  const [isAgreed, setIsAgreed] = useState(false);
  
  const onOpenChange = (open) => {
    setIsOpen(open);
  };
  
  const onConfirm = () => {
    if (isAgreed) {
      alert("Booking confirmed!");
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle>Data Privacy Confirmation</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>
        
        <div className="mt-2">
          <p className="text-sm text-muted-foreground">
            Before proceeding with your booking, please review and agree to our data privacy terms.
          </p>
          
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Your personal information will be securely stored and processed</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>We will only use your data for booking and related communication</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Your data will not be shared with third parties without consent</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>You can request data deletion at any time</span>
            </li>
          </ul>
          
          <div className="mt-6 flex items-start space-x-2">
            <Checkbox
              id="privacy-agreement"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
            />
            
            <label
              htmlFor="privacy-agreement"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              onClick={() => setIsAgreed(!isAgreed)}
            >
              I agree to the data privacy terms
            </label>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!isAgreed}
            className={!isAgreed ? "opacity-50" : ""}
          >
            Confirm Booking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}