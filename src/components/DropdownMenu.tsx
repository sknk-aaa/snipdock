import { useRef, useEffect } from 'react';

export interface MenuItem {
  label: string;
  danger?: boolean;
  onClick: () => void;
}

interface Props {
  items: (MenuItem | 'sep')[];
  onClose: () => void;
}

export default function DropdownMenu({ items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="dropdown-menu" ref={ref}>
      {items.map((item, i) =>
        item === 'sep' ? (
          <div className="menu-sep" key={i} />
        ) : (
          <div
            key={i}
            className={`menu-item${item.danger ? ' danger' : ''}`}
            onMouseDown={e => {
              e.preventDefault();
              item.onClick();
              onClose();
            }}
          >
            {item.label}
          </div>
        ),
      )}
    </div>
  );
}
