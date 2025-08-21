import React, { useRef, useEffect, useState } from 'react';
import { Handle, Position } from '@xyflow/react';

interface TriggerNodeProps {
  id: string;
  data: {
    label: string;
    isManualTrigger?: boolean;
    onLabelChange?: (id: string, label: string) => void;
    onDelete?: (id: string) => void;
  };
  selected?: boolean;
}

const TriggerNode: React.FC<TriggerNodeProps> = ({ id, data, selected }) => {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label || '');
  const [animate, setAnimate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLabel(data.label || '');
  }, [data.label]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (data.isManualTrigger && animate) {
      timeout = setTimeout(() => setAnimate(false), 3000);
    }
    return () => clearTimeout(timeout);
  }, [animate, data.isManualTrigger]);

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
      onClick={() => {
        if (data.isManualTrigger) setAnimate(true);
      }}
      style={{
        padding: 10,
        border: selected ? '3px solid #0066cc' : '2px solid #0066cc',
        borderRadius: 8,
        background: data.isManualTrigger ? '#e6f2ff' : '#d0e3ff',
        cursor: data.isManualTrigger ? 'pointer' : 'default',
        position: 'relative',
        minWidth: 90,
        boxShadow: selected ? '0 2px 6px rgba(0,102,204,0.25)' : '0 2px 8px rgba(0,102,204,0.13)',
        display: 'flex',
        alignItems: 'center',
        userSelect: 'none',
      }}
      title={data.label}
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
            color: '#0066cc',
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
        style={{ background: '#0066cc', width: 7, height: 7, borderRadius: '50%' }}
      />

      {/* Label or input */}
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
              border: '1px solid #9ccaff',
              fontSize: 15,
              width: '100%',
              textAlign: 'center',
              background: '#fff',
            }}
          />
        ) : (
          <span
            style={{
              color: '#003366',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              background: 'transparent',
              borderRadius: 5,
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
        style={{ background: '#0066cc', width: 7, height: 7, borderRadius: '50%' }}
      />

      {/* Animated bar for manual trigger */}
      {/* {data.isManualTrigger && animate && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 20,
            right: 20,
            height: 3,
            borderRadius: 1,
            background:
              'repeating-linear-gradient(90deg, #1490ff, #1490ff 6px, #66b3ff 6px, #66b3ff 12px)',
            animation: 'moveBar 1s linear infinite',
          }}
        />
      )} */}

      <style>
        {`
          @keyframes moveBar {
            0% { background-position: 0 0; }
            100% { background-position: 20px 0; }
          }
        `}
      </style>
    </div>
  );
};

export default TriggerNode;
