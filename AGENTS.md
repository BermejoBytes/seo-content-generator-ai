# AGENTS.md

## Core Purpose
Autonomous SEO content generation agent for the Drenpos blog. It executes a pipeline: Research $\to$ Analysis $\to$ Synthesis $\to$ Generation $\to$ Persistance $\to$ GitOps.

## Execution
The primary entry point is `agent/index.mjs`.

**Command Pattern:**
```bash
node agent/index.mjs --idea "IDEA" --keywords "kw1,kw2" --context "CONTEXT" --icp-type "TYPE" --icp-role "ROLE" --icp-maturity "bajo|medio|alto" --icp-pains "pain1,pain2"
```

**Required Arguments:**
- `--idea` / `-i`: (Required) The main topic.
- `--keywords` / `-k`: SEO keywords (comma-separated).
- `--context` / `-c`: Brief article context.
- `--icp-type`: Target business type (e.g., `pymes retail`).
- `--icp-role`: Target person/role.
- `--icp-maturity`: `bajo`, `medio`, or `alto`.
- `--icp-pains`: Target problems (comma-separated).

## Infrastructure & Environment
- **Ollama**: Must be running locally. If the model specified in `agent/config.mjs` is missing, run `ollama pull <model_name>`.
- **Key Environment Variables**:
  - `OLLAMA_URL`: URL for the local Ollama instance.
  - `OLLAMA_MODEL`: The specific model to use.
  - `GIT_AUTO_PUSH`: Set to `true` to allow the agent to push changes.
  - `PEXELS_API_KEY`: Required for automated image downloading.

## Pipeline Modules
- `research/`: Competitor/web research.
- `analyze-competition/`: Analyzes the gathered corpus.
- `analyze-own/`: Checks existing repository content.
- `synthesize/`: Generates the SEO strategy.
- `generate/`: Main content and Meta Ads generation.
- `generate-images/`: Pexels integration.
- `persist/`: Filesystem persistence (writes to `src/content/blog/`).
- `gitops/`: Automates `git add`, `commit`, and `push`.

## GitOps Note
If the agent fails to push, manually execute:
```bash
git add .
git commit -m "feat(blog): <slug>"
git push
```
