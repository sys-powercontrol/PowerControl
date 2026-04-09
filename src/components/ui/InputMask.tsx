import React from "react";
import { IMaskInput } from "react-imask";

interface InputMaskProps {
  mask: string | any[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  name?: string;
  required?: boolean;
  defaultValue?: string;
  id?: string;
}

export const InputMask: React.FC<InputMaskProps> = ({
  mask,
  value,
  onChange,
  placeholder,
  className,
  name,
  required,
  defaultValue,
  id,
}) => {
  return (
    <IMaskInput
      id={id}
      mask={mask}
      value={value}
      unmask={true}
      onAccept={(unmaskedValue) => {
        if (onChange) {
          onChange(unmaskedValue);
        }
      }}
      name={name}
      required={required}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className={`w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all ${className}`}
    />
  );
};
