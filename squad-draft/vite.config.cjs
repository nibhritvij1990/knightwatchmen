const { defineConfig } = require('vite');

module.exports = defineConfig({
  base: '/squad-draft/',
  server: {
    port: 5174,
    strictPort: true,
  },
  preview: {
    port: 4001,
    strictPort: true,
  },
}); 