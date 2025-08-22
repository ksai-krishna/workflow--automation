// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(__dirname, '../.env') });

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env.API_URL': JSON.stringify(process.env.API_URL || 'development'),
  },
  plugins: [react()],
}) 

// Load the .env file from the parent directory
