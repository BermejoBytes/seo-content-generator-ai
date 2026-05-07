# 🤖 Drenpos SEO Content Engine

An autonomous, pipeline-based agent designed to research, synthesize, and generate high-quality, SEO-optimized blog posts and Meta Ads content. It automates the entire workflow from competitor research to Git deployment.

## 🚀 The Pipeline

The agent executes a deterministic 7-stage pipeline:

1.  **Research** 🔍: Scrapes the web (DuckDuckGo or SerpAPI) to find current competitor articles.
2.  **Competition Analysis** 📊: Parses competitors to identify what's ranking and what's missing.
3.  **Own Content Analysis** 📂: Checks your existing repository to avoid duplication.
4.  **Strategy Synthesis** 🧠: Combines research + your info + ICP (Ideal Customer Profile) to create a content blueprint.
5.  **Generation** ✍️: Writes the full article (Markdown) and accompanies it with high-converting Meta Ads copy.
6.  **Visual Assets** 🖼️: (Optional) Downloads relevant high-quality images from Pexels.
7.  **Persistence & GitOps** 🚀: Saves the files to `src/content/blog/` and automatically commits/pushes to Git.

---

## 🛠 Installation & Setup

### Prerequisites
- **Node.js** (v18+)
- **Ollama** (For local execution) or an **OpenAI-compatible API provider** (Groq, OpenAI, etc.).
- **Git** (For the GitOps module).

### 1. Clone & Install
```bash
git clone <your-repo-scale>
cd "Agent-Post Generator"
npm install
```

### 2. Environment Configuration
Create a `.env` file in the `agent/` directory. This is the heart of the agent's behavior.

```bash
# --- LLM CONFIGURATION ---
# Default: Local Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:14b

# PRO TIP: Use any OpenAI-compatible API (Groq, OpenAI, etc.) 
# by simply pointing the URL to their endpoint:
# OLLAMA_URL=https://api.groq.com/openai/v1
# OLLAMA_MODEL=llama3-70b-8192

# --- SEARCH CONFIGURATION ---
# 'duckduckgo' (default) or 'serp'
SEARCH_ENGINE=duckduckgo
SERP_API_KEY=your_serpapi_key_here

# --- ASSETS & CONTENT ---
PEXELS_API_KEY=your_pexels_api_key_here
AUTHOR_NAME="Your Name"
AUTHOR_DESIGNATION="SEO Expert"

# --- GITOPS ---
GIT_AUTO_PUSH=true
GIT_BRANCH=main

# --- DEBUGGING ---
DEBUG=true
```

---

## 💻 Usage

Run the agent using `node agent/index.mjs` with the required flags.

### 🚩 CLI Flags reference

| Flag | Short | Required | Description |
| :--- | :--- | :---: | :--- |
| `--idea` | `-i` | **Yes** | The main topic or title of the article. |
| `--keywords` | `-k` | No | Comma-separated list of SEO keywords (e.g., `stock,erp,pyme`). |
| `--context` | `-c` | No | Brief context/background for the article. |
| `--icp-type` | | No | Target business type (e.g., `pymes retail`). |
| `--icp-role` | | No | Target persona (e.g., `gerente de operaciones`). |
| `--icp-maturity`| | No | Target digital maturity: `bajo`, `medio`, or `alto`. |
| `--icp-pains` | | No | Target pain points, comma-separated (e.g., `stock,errors`). |

### 📝 Full Example Command
```bash
node agent/index.mjs \
  --idea "How to digitalize retail inventory" \
  --keywords "inventory management,retail erprob,stock control" \
  --context "For small retail businesses using Excel" \
  --icp-type "pymes retail" \
  --icp-role "store manager" \
  --icp-maturity "bajo" \
  --icp-pains "manual errors,stockouts,latency"
```

---

## ⚙️ Advanced Configuration & Customization

### 🌌 Using other LLMs (Groq, OpenAI, etc.)
The agent is built on an **OpenAI-compatible abstraction**. You are **not** limited to Ollama. 
To use **Groq**, for example, simply change your `.env`:
```bash
OLLAMA_URL=https://api.groq.com/openai/v1
OLLAMA_MODEL=llama3-70b-8192
```
The agent will now send all prompts to Groq's high-speed inference engine.

### 🎨 Customizing the Content "Vibe"
The writing style is governed by a `styleFile` located in `agent/config.mjs`. 
To change the tone (e.g., from "Professional" to "Aggressive Sales"):
1.  Create a new Markdown file with your instructions.
2.  Update the `styleFile` path in `agent/config.mjs`.

### 🧩 Modular Adaptation
If you want to change how the agent researches or generates:
- **Custom Research**: Modify `agent/modules/research.mjs` to use a different scraper or API.
- **Custom Logic**: The `agent/index.mjs` is a sequence of async function calls. You can inject a new module (e.g., `agent/modules/translate.mjs`) between any two existing steps.

---

## ⚠️ Troubleshooting

- **Ollama Not Found**: Ensure `ollama serve` is running and `OLLAMA_URL` is correct.
- **Git Push Failed**: If `GIT_AUTO_PUSH` is enabled and fails, check your SSH/HTTPS credentials. You can manually run:
  `git add . && git commit -m "feat(blog): <slug>" && git push`
- **Missing Images**: If images aren't downloading, ensure your `PEXELS_API_KEY` is valid in `.env`. No error will be thrown; the agent will simply skip that step.
```