import * as React from "react";

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function Switch({ checked, onCheckedChange, ...props }: SwitchProps) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        {...props}
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer dark:bg-gray-700 peer-checked:bg-blue-600 transition-all"></div>
      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
        {checked ? "On" : "Off"}
      </span>
    </label>
  );
}
