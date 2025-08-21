import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';

const useStore = create((set, get) => ({
  nodes: [
    { 
      id: '1', 
      type: 'webhook', 
      position: { x: 50, y: 100 }, 
      data: { label: 'Webhook Trigger' } 
    }
  ],
  edges: [],
  
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  
  onConnect: (connection) => {
    set({
      edges: addEdge({ ...connection, animated: true, type: 'smoothstep' }, get().edges),
    });
  },

  addNode: (node) => {
    set({
        nodes: [...get().nodes, node]
    })
  }
}));

export default useStore;