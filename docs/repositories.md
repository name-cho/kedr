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
The `Mirror to GitGud` workflow syncs both repositories from GitHub to GitGud.
It runs on pushes to `main`, on `v*` tags, on a daily schedule, and on manual dispatch.
It requires the repository secret `GITGUD_TOKEN` with `api` and `write_repository` access.

A mirror sync must compare the final branch and tag lists, not only the latest commit title.
The workflow keeps only `main` on GitGud and removes other mirror branches.
Before it changes GitGud, it uploads a bundle and a ref list as a workflow artifact.
It keeps tags and published releases. Release pages on GitGud link to the original GitHub assets.

## Release locations

- Kedr Studio releases: `https://github.com/name-cho/kedr/releases`
- Kedr Python releases: `https://github.com/name-cho/kedr-python/releases`
- GitGud releases must use the same tag names and point users to the same artifacts.
