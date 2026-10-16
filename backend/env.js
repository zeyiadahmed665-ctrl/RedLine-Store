import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// يحمّل backend/.env من مكان الملف نفسه، فيشتغل سواء شغّلت من فولدر backend أو من الفولدر الرئيسي
dotenv.config({
  path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'),
});
