import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { X } from "lucide-react";

const PrivacyModal = ({ isOpen, onOpenChange, onConfirm }) => {
  const [isAgreed, setIsAgreed] = useState(false);

  const handleConfirm = () => {
    if (isAgreed) {
      onConfirm();
      setIsAgreed(false); // Reset state after confirmation
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setIsAgreed(false); // Reset state when modal is closed
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle className="text-center font-bold text-lg">PRIVACY NOTICE</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>

        <div className="mt-2">
          <div className="space-y-4 text-sm">
            <p>
              We value your privacy and we uphold your rights under the Data Privacy Act of 2012.
            </p>

            <p>
              By voluntarily submitting this form, you are hereby allowing AIM Conference Center Manila (ACCM) to collect, use, process, consolidate, share, store, and retain your personal data. The information collected from this form will be recorded in a database accessed only by authorized ACCM personnel. ACCM will use your personal data to process this form along with related activities.
            </p>

            <p>
              For any inquiries, feedback, and/or complaints regarding the processing of your personal data, please contact AIM's Data Protection Officer through the following:
            </p>

            <ul className="ml-6 space-y-1">
              <li>
                <span className="font-medium">Email:</span>{" "}
                <a
                  href="mailto:dpo@aim.edu"
                  className="text-blue-600 hover:underline"
                >
                  dpo@aim.edu
                </a>
              </li>
              <li>
                <span className="font-medium">Phone:</span> +632-892-4011 local 2882
              </li>
              <li>
                <span className="font-medium">Address:</span> Asian Institute of Management, Eugenio Lopez Foundation Building, 123 Paseo de Roxas, Makati City, Philippines 1229
              </li>
            </ul>

            <p>
              For more details, please read the{" "}
              <a
                href="https://accm.aim.edu/privacy-notice/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                ACCM Privacy Policy
              </a>
            </p>

            <div className="text-xs text-gray-500 mt-2">
              Version: 12 August 2019
            </div>
          </div>

        
          <div className="mt-6 flex items-start space-x-2">
            <Checkbox
              id="privacy-agreement"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
            />
            <label
              htmlFor="privacy-agreement"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I have read and agree to the privacy terms
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isAgreed}
            className={!isAgreed ? "opacity-50" : ""}
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrivacyModal;