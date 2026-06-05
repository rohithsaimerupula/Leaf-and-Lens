const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoDir = __dirname;
const tempDir = path.join(repoDir, 'temp-deploy');
const sourceDir = path.join(repoDir, 'legacy-static');

function run(cmd, cwd = repoDir) {
  console.log(`Running: ${cmd} in ${cwd}`);
  return execSync(cmd, { cwd, stdio: 'inherit' });
}

try {
  // Clean tempDir if exists
  if (fs.existsSync(tempDir)) {
    console.log('Cleaning existing temp-deploy folder...');
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  // Clone gh-pages branch
  run('git clone https://github.com/rohithsaimerupula/Leaf-and-Lens.git -b gh-pages temp-deploy');

  // Clean all files in temp-deploy except .git
  console.log('Cleaning old deployment files...');
  const files = fs.readdirSync(tempDir);
  for (const file of files) {
    if (file === '.git') continue;
    fs.rmSync(path.join(tempDir, file), { recursive: true, force: true });
  }

  // Copy legacy-static files
  console.log('Copying updated legacy-static website files...');
  function copyRecursive(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
      }
      fs.readdirSync(src).forEach((child) => {
        copyRecursive(path.join(src, child), path.join(dest, child));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  }
  copyRecursive(sourceDir, tempDir);

  // Commit and Push
  run('git add -A', tempDir);
  try {
    run('git commit -m "Deploy latest static website code"', tempDir);
  } catch (e) {
    console.log('No changes to commit.');
  }
  run('git push origin gh-pages --force', tempDir);

  console.log('Deployment successful!');
} catch (error) {
  console.error('Deployment failed:', error);
} finally {
  // Clean up
  if (fs.existsSync(tempDir)) {
    console.log('Cleaning up temp-deploy folder...');
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
