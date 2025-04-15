import React from "react";

export function Checkbox({ id, label, checked, onChange = () => {}, disabled }) { // Default to a no-op function
  return (
    <div className="flex items-center">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          console.log("Checkbox clicked:", e.target.checked); // Debugging log
          onChange(e);
        }}
        disabled={disabled}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      {label && (
        <label
          htmlFor={id}
          className={`ml-2 text-sm ${disabled ? "text-gray-400" : "text-gray-700"}`}
        >
          {label}
        </label>
      )}
    </div>
  );
}