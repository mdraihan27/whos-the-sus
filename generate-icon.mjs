import fs from 'fs';
import path from 'path';

const imgPath = path.resolve('public/assets/images/question.png');
const imgBuffer = fs.readFileSync(imgPath);
const base64Img = imgBuffer.toString('base64');
const dataUri = `data:image/png;base64,${base64Img}`;

const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#ffffff" />
  
  <g text-anchor="middle" font-family="'Nunito', 'Segoe UI', 'Arial Rounded MT Bold', sans-serif" font-weight="900">
    <!-- "Who's the" Shadow -->
    <text x="256" y="215" font-size="70" fill="#bae6fd">Who's the</text>
    <!-- "Who's the" Main -->
    <text x="256" y="210" font-size="70" fill="#0369a1">Who's the</text>
    
    <!-- "Sus" Shadow -->
    <text x="210" y="325" font-size="110" fill="#fecaca">Sus</text>
    <!-- "Sus" Main -->
    <text x="210" y="320" font-size="110" fill="#ef4444">Sus</text>
  </g>

  <!-- Question mark image replacing the text question mark -->
  <image href="${dataUri}" x="340" y="215" width="110" height="110" />
</svg>
`;

fs.writeFileSync(path.resolve('public/app-icon.svg'), svgContent.trim());
console.log('SVG icon generated at public/app-icon.svg');
