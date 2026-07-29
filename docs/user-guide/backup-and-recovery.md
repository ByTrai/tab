# Backup and recovery (local alpha)

Tabby stores workspace data in the browser. Clearing site data or removing the extension can delete it. Export regularly.

## Web workspace (`/app`)

1. Open **Settings** in the workspace app.
2. Choose **Export backup** to download a schema-v2 JSON file.
3. To restore, choose **Import backup**, review the dry-run summary (creates/updates/removes), and confirm.
4. Import replaces workspaces/groups/items and clears soft trash.

On first load after the entity-store upgrade, Tabby may auto-download a pre-migration backup of your legacy flat document.

## Chromium extension

1. Open a new tab (Tabby new-tab page).
2. Use **Export backup** in the organize sidebar.
3. Use **Import backup** and confirm the dry-run summary before applying.

Capture history still lives in a separate journal database. Organization data (workspaces, groups, links, notes, tasks, trash) uses the shared entity store.

## Soft trash

Deleted items stay recoverable for **30 days**, then purge on the next load. Export does not include trash.

## Permissions

The extension requests only the `tabs` permission. No content scripts, host permissions, or analytics.

## If storage looks corrupted

1. Export if the UI still opens.
2. Clear the Tabby origin / extension storage only after you have a backup.
3. Re-import the JSON backup.
4. Report private security issues via [SECURITY.md](../SECURITY.md).
