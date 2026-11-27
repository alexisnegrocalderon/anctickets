/**
 * Limpieza "mejor esfuerzo" de las imágenes de una productora borrada. Convención
 * de ruta del bucket event-images: {organizer_id}/{event_id}/{archivo}.
 * NUNCA lanza: un fallo aquí no deshace el borrado, solo se informa.
 */

interface StorageEntry {
  name: string;
  id?: string | null;
}
interface StorageBucket {
  list(path: string, opts: { limit: number; offset: number }): Promise<{ data: StorageEntry[] | null; error: { message: string } | null }>;
  remove(paths: string[]): Promise<{ error: { message: string } | null }>;
}
export interface StorageLike {
  from(bucket: string): StorageBucket;
}

const PAGE = 100;
const MAX_FILES = 5000;
const MAX_DEPTH = 4;

export interface CleanupResult {
  removed: number;
  failed: boolean;
}

export async function removeStoragePrefix(storage: StorageLike, bucket: string, organizerId: string): Promise<CleanupResult> {
  let removed = 0;
  let failed = false;
  try {
    const b = storage.from(bucket);
    const files: string[] = [];
    const walk = async (dir: string, depth: number): Promise<void> => {
      if (depth > MAX_DEPTH || files.length >= MAX_FILES) return;
      for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await b.list(dir, { limit: PAGE, offset });
        if (error) {
          failed = true;
          return;
        }
        const entries = data ?? [];
        for (const e of entries) {
          const full = `${dir}/${e.name}`;
          // En Storage una "carpeta" viene sin id; un archivo trae id.
          if (e.id) files.push(full);
          else await walk(full, depth + 1);
        }
        if (entries.length < PAGE) return;
      }
    };
    await walk(organizerId, 0);
    for (let i = 0; i < files.length; i += PAGE) {
      const chunk = files.slice(i, i + PAGE);
      const { error } = await b.remove(chunk);
      if (error) failed = true;
      else removed += chunk.length;
    }
  } catch {
    failed = true;
  }
  return { removed, failed };
}
