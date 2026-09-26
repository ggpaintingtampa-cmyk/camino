// Render the same Lucide Compass used in the app, with Android mask-safe padding.
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Compass} from 'lucide-react';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require(process.env.CAMINOS_SHARP_MODULE || process.env.HERMES_SHARP_MODULE || 'sharp');
for(const size of [180,192,512]) {
  const glyph=renderToStaticMarkup(React.createElement(Compass,{size:Math.round(size*.6),color:'#d8b978',strokeWidth:1.7}));
  await sharp({create:{width:size,height:size,channels:4,background:'#0b0c0d'}})
    .composite([{input:Buffer.from(glyph),gravity:'centre'}]).png().toFile(new URL(`../public/caminos-${size}.png`,import.meta.url).pathname);
}
