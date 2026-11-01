import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));

// backend/screenshots  (src/config -> ../../screenshots)
export const SCREENSHOT_ROOT = path.resolve(here, '../../screenshots');