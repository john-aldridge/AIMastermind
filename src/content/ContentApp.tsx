import React, { useEffect, useState } from 'react';
import { WidgetRenderer } from '@/widgets/WidgetRenderer';
import { SubExtension } from '@/state/appStore';
import { Message, MessageType, MessageResponse } from '@/utils/messaging';

export const ContentApp: React.FC = () => {
  const [activeWidgets, setActiveWidgets] = useState<SubExtension[]>([]);

  useEffect(() => {
    // Listen for messages from popup/background
    const messageListener = (
      message: Message,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void
    ) => {
      switch (message.type) {
        case MessageType.CREATE_WIDGET:
          if (message.payload) {
            setActiveWidgets(prev => [...prev, message.payload as SubExtension]);
            sendResponse({ success: true });
          }
          break;

        case MessageType.REMOVE_WIDGET:
          if (message.payload?.id) {
            setActiveWidgets(prev => prev.filter(w => w.id !== message.payload.id));
            sendResponse({ success: true });
          }
          break;

        case MessageType.GET_ACTIVE_WIDGETS:
          sendResponse({ success: true, data: activeWidgets });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [activeWidgets]);

  const handlePositionChange = (widgetId: string, position: { x: number; y: number }) => {
    setActiveWidgets(prev =>
      prev.map(w => (w.id === widgetId ? { ...w, position } : w))
    );
  };

  const handleClose = (widgetId: string) => {
    setActiveWidgets(prev => prev.filter(w => w.id !== widgetId));
  };

  return (
    <div style={{ pointerEvents: 'none', width: '100%', height: '100%' }}>
      {activeWidgets.map(widget => (
        <div key={widget.id} style={{ pointerEvents: 'auto' }}>
          <WidgetRenderer
            widget={widget}
            onPositionChange={(pos) => handlePositionChange(widget.id, pos)}
            onClose={() => handleClose(widget.id)}
          />
        </div>
      ))}
    </div>
  );
};
