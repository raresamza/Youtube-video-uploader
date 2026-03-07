import fs from 'fs/promises';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), 'storage');

export async function readJson<T>(filename: string, defaultValue: T): Promise<T> {
  try {
    const filePath = path.join(STORAGE_DIR, filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return defaultValue;
    }
    console.error(`Error reading ${filename}:`, error);
    return defaultValue;
  }
}

export async function writeJson<T>(filename: string, data: T): Promise<void> {
  try {
    const filePath = path.join(STORAGE_DIR, filename);
    // Ensure dir exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing to ${filename}:`, error);
  }
}

export async function getPreset(presetName: string): Promise<any> {
  const filePath = path.join(STORAGE_DIR, 'presets', `${presetName}.json`);
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

export async function listPresets(): Promise<string[]> {
  const presetsDir = path.join(STORAGE_DIR, 'presets');
  try {
    const files = await fs.readdir(presetsDir);
    return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
}
