import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Build frontend with Vite
console.log('Building frontend...');
execSync('vite build', { stdio: 'inherit' });

// Build backend with esbuild
console.log('Building backend...');
execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });

// Copy views directory
console.log('Copying views...');
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const files = fs.readdirSync(src);
  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir('views', 'dist/views');

// Copy client files if they exist
if (fs.existsSync('client')) {
  console.log('Copying client files...');
  if (!fs.existsSync('dist/public')) {
    fs.mkdirSync('dist/public', { recursive: true });
  }
  copyDir('client', 'dist/public');
}

console.log('Build completed successfully!');
