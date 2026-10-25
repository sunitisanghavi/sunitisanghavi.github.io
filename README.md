# Suniti Sanghavi — academic website

Quarto website with hand-built visual components (SVG hero, research-area diagram, interactive
radius–albedo widget).

## Layout

```
_quarto.yml               site config, navbar, theme
index.qmd                 home: hero, key research areas, anatomy figure, news
research.qmd              four key research areas
publications.qmd          rendered from data/publications.yml via _templates/publications.ejs
software.qmd, cv.qmd
data/publications.yml     ← edit this to add/curate papers (themes: theory software earth planets)
papers/                   PDFs (linked with `pdf:` in publications.yml)
styles/                   theme.scss (palette, fonts) + site.css (custom components)
assets/                   favicon, JS widget
```

## Work locally

```sh
quarto preview      # live-reload in the browser
quarto render       # build into _site/
```

## Publish on GitHub Pages

Repo: `github.com/sunitisanghavi/sunitisanghavi.github.io`. Every push to `main` renders the
site and deploys it via `.github/workflows/publish.yml` (Settings → Pages → Source: GitHub Actions).
Live at https://sunitisanghavi.github.io.

Note: this folder lives on Google Drive; a `.git` directory inside Drive sync works but can
occasionally conflict. Cloning the repo to a local non-synced path is the safer long-term setup.
