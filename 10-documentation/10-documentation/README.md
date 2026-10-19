# Batch 10 - Documentation and submission paperwork

**Who commits this batch:** [PARTNER NAME]

**Files in this batch:** 9

## What this batch contains

- `README.md`
- `docs/BUILD-CONTRACT.md`
- `docs/SETUP.md`
- `docs/DEPLOYMENT.md`
- `docs/VIDEO-SCRIPT.md`
- `docs/GENAI-DECLARATION.md`
- `docs/PEER-EVALUATION-NOTES.md`
- `docs/SUBMISSION-CHECKLIST.md`
- `docs/Peer Evaluation form - COMPLETED.docx`

## How to upload it

Work in your clone of the repository. From the repository root, in PowerShell:

```powershell
# 1. copy this batch's files into your working copy
& "10-documentation\copy-files.ps1"

# 2. check what changed
git status

# 3. commit
git add -A
git commit -m "docs: add the setup, deployment, video, declaration and submission documents" -m "README mapping every marking criterion to the files that satisfy it, with the API reference.  Setup guide, cPanel deployment checklist, the timed demo video script, both permitted GenAI declaration statements, peer evaluation guidance and the submission checklist."

# 4. push
git push
```

## Commit message to use

```text
docs: add the setup, deployment, video, declaration and submission documents
README mapping every marking criterion to the files that satisfy it, with the
API reference.

Setup guide, cPanel deployment checklist, the timed demo video script, both
permitted GenAI declaration statements, peer evaluation guidance and the
submission checklist.
```

> Do not start the next batch until this one is pushed. The batches are ordered
> so that the project builds in the same sequence it was written.
