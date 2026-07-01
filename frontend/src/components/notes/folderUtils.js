export function flattenFolders(folders, depth = 0) {
  return (folders || []).flatMap((folder) => [
    { id: folder.id, label: `${depth > 0 ? '— '.repeat(depth) : ''}${folder.name}` },
    ...flattenFolders(folder.children, depth + 1),
  ]);
}
