import { Handle, Position } from 'reactflow';

function WebhookTriggerNode({ data }) {
  return (
    <div className="border border-gray-300 rounded-md bg-white p-3 shadow-lg w-52">
      <div className="font-bold text-gray-800">🪝 Webhook Trigger</div>
      <p className="text-xs text-gray-500 mt-1">Starts workflow on an incoming HTTP request.</p>
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 !bg-teal-500" 
      />
    </div>
  );
}

export default WebhookTriggerNode;