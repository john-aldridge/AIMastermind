import React, { useEffect, useState } from 'react';
import { DraggableWidget } from './DraggableWidget';
import { SubExtension } from '@/state/appStore';
import { apiService } from '@/utils/api';

interface WidgetRendererProps {
  widget: SubExtension;
  onPositionChange: (position: { x: number; y: number }) => void;
  onClose: () => void;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widget,
  onPositionChange,
  onClose,
}) => {
  const [content, setContent] = useState<string>('Loading...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateContent = async () => {
      try {
        setLoading(true);
        const response = await apiService.generateContent(
          { prompt: widget.prompt },
          false
        );
        setContent(response.content);
      } catch (error) {
        setContent('Error generating content. Please try again.');
        console.error('Error generating widget content:', error);
      } finally {
        setLoading(false);
      }
    };

    generateContent();
  }, [widget.prompt]);

  return (
    <DraggableWidget
      widget={widget}
      onPositionChange={onPositionChange}
      onClose={onClose}
    >
      <div className="min-h-[100px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{content}</p>
          </div>
        )}
      </div>
    </DraggableWidget>
  );
};
