# Repositories

Kedr uses one long-lived branch: `main`.

| Project | Canonical repository | Purpose |
| --- | --- | --- |
| Kedr source | `https://github.com/name-cho/kedr` | Source for Kedr Studio and Kedr Python |
| Kedr Python | `https://github.com/name-cho/kedr-python` | Python product docs and releases |
| Kedr mirror | `https://gitgud.io/name-cho/kedr` | Mirror of the Kedr source repository |
| Kedr Python mirror | `https://gitgud.io/name-cho/kedr-python` | Mirror of the Python product repository |

## Branch rules

- Merge product changes into `main` through a pull request.
- Delete the pull request branch after the merge.
- Do not recreate `kedr-publish`, `kedr-sync`, or a separate product branch.
- Keep tags and published releases during branch cleanup.
- Check that the source tree contains the changes from a branch before you delete it.

## Mirror rules

GitHub is the write target for development. GitGud follows GitHub.
A mirror sync must compare the final branch and tag lists, not only the latest commit title.
Do not delete a mirror branch that contains work absent from `main` and from the kept tags.
If a mirror has diverged, preserve its old refs in a backup before the sync.

## Release locations

- Kedr Studio releases: `https://github.com/name-cho/kedr/releases`
- Kedr Python releases: `https://github.com/name-cho/kedr-python/releases`
- GitGud releases must use the same tag names and point users to the same artifacts.
