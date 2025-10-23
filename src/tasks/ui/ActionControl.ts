export type ActionControlPosition = 'central' | 'secondary-left' | 'secondary-right';

export interface ButtonControl {
  type: 'button';
  id: string;
  label: string;
  position: ActionControlPosition;
  destructive?: boolean; // For error/warning styling
  disabled?: boolean;
}

export interface ImageButtonControl {
  type: 'image-button';
  id: string;
  imageUrl: string;
  alt: string;
  position: ActionControlPosition;
}

export interface TextInputControl {
  type: 'text-input';
  id: string;
  value: string;
  placeholder?: string;
  position: ActionControlPosition;
}

export interface TextareaControl {
  type: 'textarea';
  id: string;
  value: string;
  placeholder?: string;
  position: ActionControlPosition;
  disabled?: boolean;
}

export interface IconButtonControl {
  type: 'icon-button';
  id: string;
  icon: string;
  label?: string;
  position: ActionControlPosition;
}

export type ActionControl =
  | ButtonControl
  | ImageButtonControl
  | TextInputControl
  | TextareaControl
  | IconButtonControl;
