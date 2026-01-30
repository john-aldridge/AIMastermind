import React, { useState } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { SubExtension } from '@/state/appStore';

interface DraggableWidgetProps {
  widget: SubExtension;
  onPositionChange: (position: { x: number; y: number }) => void;
  onClose: () => void;
  children: React.ReactNode;
}

export const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  widget,
  onPositionChange,
  onClose,
  children,
}) => {
  const [position, setPosition] = useState(widget.position || { x: 0, y: 0 });

  const handleDrag = (_e: DraggableEvent, data: DraggableData) => {
    const newPosition = { x: data.x, y: data.y };
    setPosition(newPosition);
    onPositionChange(newPosition);
  };

  return (
    <Draggable
      handle=".widget-header"
      position={position}
      onStop={handleDrag}
      bounds="parent"
    >
      <div className="widget-container" style={{ width: widget.size?.width || 400 }}>
        <div className="widget-header">
          <h3 className="font-semibold text-sm">{widget.name}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-xl leading-none"
              aria-label="Close widget"
            >
              ×
            </button>
          </div>
        </div>
        <div className="widget-content">{children}</div>
      </div>
    </Draggable>
  );
};
