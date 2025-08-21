import React, { useState, useCallback } from 'react';
// Do NOT import Handle, Position here if BaseNode already provides them
import { LuGlobe, LuSave } from 'react-icons/lu'; // Using Lucide React for icons

import BaseNode from './BaseNode'; // ✨ Import your BaseNode component

interface HttpRequestNodeData {
  label?: string;
  url?: string;
  // This function is passed from App.tsx via NodeEditor.jsx
  onNodeDataChange?: (nodeId: string, newData: Partial<HttpRequestNodeData>) => void;
  // BaseNode typically expects these:
  onLabelChange?: (id: string, label: string) => void;
  onDelete?: (id: string) => void;
}

interface HttpRequestNodeProps {
  id: string;
  data: HttpRequestNodeData;
}

const HttpRequestNode: React.FC<HttpRequestNodeProps> = ({ id, data }) => {
  // Start in editing mode if no URL is set or if the label is generic
  const [isEditing, setIsEditing] = useState<boolean>(!data.url || data.label === 'Http Request Node');
  const [inputValue, setInputValue] = useState<string>(data.url || '');

  // Handle saving the URL
  const handleSave = useCallback(() => {
    if (data.onNodeDataChange) {
      // Update the node's data with the URL and a more specific label
      data.onNodeDataChange(id, { url: inputValue, label: `HTTP: ${inputValue || 'No URL'}` });
    }
    setIsEditing(false);
  }, [id, inputValue, data.onNodeDataChange]);

  // Handle changes in the input field
  const handleChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(evt.target.value);
  }, []);

  return (
    // ✨ Wrap the specific content of HttpRequestNode inside BaseNode
    // BaseNode will provide the handles, default styling, and initial label.
    // We pass the common `data` props that BaseNode expects.
    <BaseNode id={id} data={{ ...data, label: data.label || 'HTTP Request' }}>
      {/* Content specific to HTTP Request Node */}
      <div className="flex items-center space-x-2 mb-2">
        <LuGlobe size={20} className="text-gray-600" /> {/* Icon specific to HTTP request */}
        {/* The label itself is now handled by BaseNode based on data.label */}
      </div>

      {isEditing ? (
        <div className="flex flex-col w-full">
          <input
            type="text"
            value={inputValue}
            onChange={handleChange}
            placeholder="Enter URL"
            className="w-full p-2 mt-2 rounded-md border border-gray-300 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSave}
            className="flex items-center justify-center gap-1 mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200"
          >
            <LuSave size={16} /> Save
          </button>
        </div>
      ) : (
        // Allow double-click to re-edit the URL
        <div
          className="text-sm text-center break-all mt-2 cursor-pointer text-blue-600 hover:underline"
          onDoubleClick={() => setIsEditing(true)}
        >
          {data.url ? (
            <a href={data.url} target="_blank" rel="noopener noreferrer">
              {data.url}
            </a>
          ) : (
            "Double click to set URL"
          )}
        </div>
      )}
    </BaseNode>
  );
};

export default HttpRequestNode;
