import React, { useRef, useEffect, useState } from 'react';
import { Handle, Position } from '@xyflow/react';

interface BaseNodeProps {
  id: string;
  data: {
    label: string;
    isManualTrigger?: boolean;
    onLabelChange?: (id: string, label: string) => void;
    onDelete?: (id: string) => void;
  };
  selected?: boolean;
}

const BaseNode: React.FC<BaseNodeProps> = ({ id, data, selected }) => {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLabel(data.label || '');
  }, [data.label]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(e.target.value);
  };

  const handleInputBlur = () => {
    setEditing(false);
    if (label !== data.label && data.onLabelChange) {
      data.onLabelChange(id, label);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditing(false);
      if (label !== data.label && data.onLabelChange) {
        data.onLabelChange(id, label);
      }
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    data.onDelete?.(id);
  };

  return (
    <div
      style={{
        padding: 10,
        border: selected ? '3px solid #cc0066' : '2px solid #cc0066',
        borderRadius: 8,
        background: '#ffe6f0',
        cursor: 'default',
        position: 'relative',
        minWidth: 90,
        boxShadow: selected ? '0 2px 6px rgba(204,0,102,0.25)' : '0 2px 8px rgba(204,0,102,0.15)',
        display: 'flex',
        alignItems: 'center',
        userSelect: 'none',
      }}
    >
      {/* Delete icon */}
      {data.onDelete && (
        <button
          title="Delete"
          onClick={handleDelete}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            zIndex: 1,
            lineHeight: 0,
            color: '#cc0066',
          }}
          aria-label="Delete node"
        >
          <svg
            height="20"
            width="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M3 6h18v2H3V6zm3 3h12v11a2 2 0 01-2 2H8a2 2 0 01-2-2V9zm7-7h-2v2h2V2z" />
          </svg>
        </button>
      )}

      {/* Left handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: '#cc0066', width: 7, height: 7, borderRadius: '50%' }}
      />
      {/* Label/edit input */}
      <div style={{ flexGrow: 1, textAlign: 'center', padding: '0 16px', minWidth: 100 }}>
        {editing ? (
          <input
            ref={inputRef}
            value={label}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            style={{
              padding: 4,
              borderRadius: 5,
              border: '1px solid #ffbadc',
              fontSize: 15,
              width: '100%',
              textAlign: 'center',
              background: '#fff',
            }}
          />
        ) : (
          <span
            style={{
              color: '#730045',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              background: 'transparent',
              borderRadius: 3,
              userSelect: 'none',
            }}
            onClick={handleLabelClick}
          >
            {label}
          </span>
        )}
      </div>
      {/* Right handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: '#cc0066', width: 7, height: 7, borderRadius: '50%' }}
      />
    </div>
  );
};

export default BaseNode;
