import React, { useState } from 'react';
import { useEffect } from 'react';
import { Flashbar as Base, FlashbarProps as BaseProps } from '@cloudscape-design/components';

export interface FlashBarProps {
  type: BaseProps.Type;
  children: React.ReactNode;

  /**
   * @default true
   */
  dismissible?: boolean;

  timeout?: number;
}

/**
 * Standard flashbar message implementation
 */
export const FlashBar = (props: FlashBarProps) => {
  const { type, children, dismissible = true, timeout = 0 } = props;

  const [flashItems, setFlashItems] = useState<BaseProps.MessageDefinition[]>([]);

  useEffect(() => {
    if (!children) {
      setFlashItems([]);
      return;
    }
    setFlashItems([
      {
        type: type,
        content: children,
        dismissible: dismissible,
        onDismiss: () => setFlashItems([]),
      },
    ]);
    if (timeout > 0) {
      const timer = setTimeout(() => setFlashItems([]), timeout);
      return () => clearTimeout(timer);
    }
  }, [type, children, dismissible, timeout]);

  return <Base items={flashItems} />;
};

export default FlashBar;
